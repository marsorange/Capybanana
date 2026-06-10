import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { DEFAULT_CAPY } from "@/game/defaults";
import type {
  BattleRecord,
  CapyState,
  Companion,
  CompanionState,
  DayOutcome,
  Gesture,
  PackedBag,
  PackedItem,
  Postcard,
  Trip,
} from "@/game/types";
import { coerceRarity } from "@/game/gacha";
import { cloud } from "@/lib/cloudClient";
import { supabaseSignOut } from "@/lib/supabaseClient";
import type { AgentEvent, CloudSave } from "@/server/types";

// A prepared "今日包裹" goes stale after ~a day. The web checks this itself on
// home entry (the server never auto-expires); a NEXT_PUBLIC_ override keeps it
// testable in dev (e.g. NEXT_PUBLIC_CAPY_BAG_TTL_MIN=1 → stale after a minute).
const BAG_TTL_OVERRIDE_MIN = Number(process.env.NEXT_PUBLIC_CAPY_BAG_TTL_MIN);
export const BAG_TTL_MS =
  Number.isFinite(BAG_TTL_OVERRIDE_MIN) && BAG_TTL_OVERRIDE_MIN > 0
    ? BAG_TTL_OVERRIDE_MIN * 60_000
    : 24 * 60 * 60_000;

// Scrub any legacy/unknown rarity off postcards (persisted localStorage saves
// bypass the server's coerceRarity, so a stale SSR/undefined would crash the
// album). Returns the same array reference when nothing needed fixing.
function sanitizePostcards(postcards: Postcard[]): Postcard[] {
  let changed = false;
  const next = postcards.map((pc) => {
    const rarity = coerceRarity(pc.rarity);
    if (rarity === pc.rarity) return pc;
    changed = true;
    return { ...pc, rarity };
  });
  return changed ? next : postcards;
}

export type Screen =
  | "login"
  | "connect"
  | "profile"
  | "about"
  | "home"
  | "pack"
  | "traveling"
  | "album"
  | "postcard"
  | "result";

// When bound to an account, the web client is just another holder of the bind
// token, talking to the same /api/agent/* endpoints an external agent uses.
export interface CloudAuth {
  userId: string;
  email: string | null;
  bindToken: string;
  rev: number;
}

interface GameState {
  hasHydrated: boolean;
  companion: Companion | null;
  capyState: CapyState;
  companionState: CompanionState;
  packedBag: PackedBag | null;
  activeTrip: Trip | null;
  postcards: Postcard[];
  souvenirs: string[];
  battleRecords: BattleRecord[];
  // 养成: 陪伴天数 (the only visible meter) + the collected 图鉴 card ids.
  companionDays: number;
  cardDex: string[];
  lastResult: DayOutcome | null;
  // Mirrored from the cloud save so the web can DERIVE "when did the Agent last
  // come by" (no extra column): the activity log + the last main-action day.
  events: AgentEvent[];
  lastActionDay: string | null;
  screen: Screen;
  // Whether the owner has passed the one-time "connect an Agent" step. New
  // accounts land on the connect screen once; returning owners go straight home.
  hasOnboarded: boolean;
  selectedPostcardId: string | null;
  pendingPostcardId: string | null;
  // Transient (not persisted) one-line cozy hint shown over home, e.g. when the
  // packed bag went stale. Cleared on dismiss / re-pack.
  notice: string | null;

  // cloud / account
  cloud: CloudAuth | null;
  connectUrl: string | null;
  cloudBusy: boolean;
  cloudError: string | null;

  setHasHydrated: (v: boolean) => void;
  goTo: (screen: Screen) => void;
  prepareBag: (
    items: PackedItem[],
    message: string,
    gesture?: Gesture,
  ) => void;
  openPostcard: (id: string) => void;
  collectPostcard: () => void;
  reset: () => void;
  completeOnboarding: () => void;
  clearNotice: () => void;

  // cloud actions
  loginWithSupabaseToken: (accessToken: string) => Promise<void>;
  loginWithDevIdentity: (identity?: string) => Promise<void>;
  // Owner's "重新生成连接 / 换 Agent": mint a fresh bind link (old Agent drops).
  regenerateConnectLink: () => Promise<void>;
  logout: () => void;
  expireStaleBag: () => void;
  cloudPull: () => Promise<void>;
  adoptSave: (save: CloudSave) => void;
}

function emptyLocalState() {
  return {
    companion: null,
    capyState: DEFAULT_CAPY,
    companionState: "idle_home" as CompanionState,
    packedBag: null,
    activeTrip: null,
    postcards: [],
    souvenirs: [],
    battleRecords: [],
    companionDays: 0,
    cardDex: [],
    lastResult: null,
    events: [] as AgentEvent[],
    lastActionDay: null as string | null,
    selectedPostcardId: null,
    pendingPostcardId: null,
    notice: null,
  };
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      hasHydrated: false,
      ...emptyLocalState(),
      screen: "login",
      hasOnboarded: false,

      cloud: null,
      connectUrl: null,
      cloudBusy: false,
      cloudError: null,

      setHasHydrated: (v) => set({ hasHydrated: v }),

      goTo: (screen) => set({ screen }),

      prepareBag: (items, message, gesture) => {
        const s = get();
        if (!s.cloud) {
          set({ screen: "login", cloudError: "先找到我，再给我准备包裹吧。" });
          return;
        }

        set({ cloudBusy: true, cloudError: null, notice: null, screen: "home" });
        cloud
          .pack(s.cloud.bindToken, items, message, gesture)
          .then(({ save }) => {
            get().adoptSave(save);
            set({ cloudBusy: false });
          })
          .catch((e: Error & { status?: number }) => {
            if (e.status === 401) return get().logout();
            set({ cloudBusy: false, cloudError: e.message });
          });
      },

      openPostcard: (id) => set({ selectedPostcardId: id, screen: "postcard" }),

      collectPostcard: () => {
        const s = get();
        if (!s.cloud) return;
        cloud
          .collect(s.cloud.bindToken)
          .then(({ save }) => get().adoptSave(save))
          .catch((e: Error & { status?: number }) => {
            if (e.status === 401) get().logout();
          });
        set({
          pendingPostcardId: null,
          selectedPostcardId: null,
          screen: "home",
        });
      },

      reset: () =>
        set({
          ...emptyLocalState(),
          screen: "login",
          hasOnboarded: false,
          cloud: null,
          connectUrl: null,
          cloudError: null,
        }),

      // The owner finished the one-time connect step; enter the island and never
      // force the connect screen again (it stays reachable from home).
      completeOnboarding: () => set({ hasOnboarded: true, screen: "home" }),

      clearNotice: () => set({ notice: null }),

      // ---- cloud ----

      // Bridge a verified Supabase session (Google login) into our bind-token
      // account. Invoked by the GameRoot auth bridge once Supabase reports a
      // session; Supabase Auth owns the identity proof.
      loginWithSupabaseToken: async (accessToken) => {
        const cur = get();
        if (cur.cloud || cur.cloudBusy) return;
        set({ cloudBusy: true, cloudError: null });
        try {
          const res = await cloud.loginSupabase(accessToken);
          set({
            cloud: {
              userId: res.user.id,
              email: res.user.email,
              bindToken: res.bindToken,
              rev: res.save.rev,
            },
            // A returning login (Agent already bound) returns connectUrl: null —
            // keep whatever we persisted so the connect screen can still show it.
            connectUrl: res.connectUrl ?? get().connectUrl,
            cloudBusy: false,
          });
          get().adoptSave(res.save);
          // No pet is auto-created. The connect screen is the gate: an owner
          // whose Agent already registered a pet goes straight home — a
          // persisted companion is itself proof the bind happened (possibly on
          // another device/browser), so don't gate on the device-local
          // hasOnboarded flag. Mark onboarded so GameRoot won't re-trap them.
          // Everyone else waits on "connect" until the Agent binds & names the
          // pet; it then arrives via cloudPull and connect flips to its one-time
          // "ready" celebration.
          const alreadyBound = !!res.save.companion;
          set({
            hasOnboarded: get().hasOnboarded || alreadyBound,
            screen: alreadyBound ? "home" : "connect",
          });
        } catch (e) {
          set({ cloudBusy: false, cloudError: (e as Error).message });
        }
      },

      // Local dev bridge (no Supabase). Still cloud-backed: it writes to the
      // same SQL tables as Google login, using a stable local identity string.
      loginWithDevIdentity: async (identity) => {
        const cur = get();
        if (cur.cloud || cur.cloudBusy) return;
        set({ cloudBusy: true, cloudError: null });
        try {
          const res = await cloud.loginDev(identity);
          set({
            cloud: {
              userId: res.user.id,
              email: res.user.email,
              bindToken: res.bindToken,
              rev: res.save.rev,
            },
            // A returning login (Agent already bound) returns connectUrl: null —
            // keep whatever we persisted so the connect screen can still show it.
            connectUrl: res.connectUrl ?? get().connectUrl,
            cloudBusy: false,
          });
          get().adoptSave(res.save);
          // A persisted companion is proof the Agent already bound — go straight
          // home regardless of the device-local hasOnboarded flag (see the
          // Supabase login above).
          const alreadyBound = !!res.save.companion;
          set({
            hasOnboarded: get().hasOnboarded || alreadyBound,
            screen: alreadyBound ? "home" : "connect",
          });
        } catch (e) {
          set({ cloudBusy: false, cloudError: (e as Error).message });
        }
      },

      // Mint a fresh Agent bind link, revoking the old one. The previously
      // connected Agent's next call gets a terminal 401 and stops; the owner
      // hands the new connectUrl to whichever Agent should take over.
      regenerateConnectLink: async () => {
        const s = get();
        if (!s.cloud || s.cloudBusy) return;
        set({ cloudBusy: true, cloudError: null });
        try {
          const { connectUrl } = await cloud.regenerateAgentLink(
            s.cloud.bindToken,
          );
          set({ connectUrl, cloudBusy: false });
        } catch (e) {
          const err = e as Error & { status?: number };
          if (err.status === 401) return get().logout();
          set({ cloudBusy: false, cloudError: err.message });
        }
      },

      logout: () => {
        void supabaseSignOut();
        set({
          ...emptyLocalState(),
          cloud: null,
          connectUrl: null,
          cloudBusy: false,
          cloudError: null,
          hasOnboarded: false,
          screen: "login",
        });
      },

      // Checked on home entry: if the prepared bag has sat past its TTL, surface
      // a cozy front-end prompt and ask the server to clear it. Self-guarding —
      // a no-op when there's no bag or it's still fresh, so it's safe to call on
      // every home mount / poll.
      expireStaleBag: () => {
        const s = get();
        if (!s.cloud || !s.packedBag) return;
        if (Date.now() - s.packedBag.packedAt < BAG_TTL_MS) return;
        set({
          notice: "门口的包裹放了一天，有点凉了，我先收起来啦。要不要再给我备一个？",
        });
        cloud
          .unpack(s.cloud.bindToken)
          .then(({ save }) => get().adoptSave(save))
          .catch((e: Error & { status?: number }) => {
            if (e.status === 401) get().logout();
          });
      },

      cloudPull: async () => {
        const s = get();
        if (!s.cloud) return;
        try {
          const { save } = await cloud.state(s.cloud.bindToken);
          if (save.rev === s.cloud.rev) return;
          const prevResult = s.lastResult;
          get().adoptSave(save);
          set((cur) => {
            const patch: Partial<GameState> = {};
            let screen = cur.screen;
            // A fresh postcard no longer yanks the screen away — HomeScreen
            // surfaces a persistent "门口有封信" note (derived from
            // pendingPostcardId) and the owner opens it themselves, so the
            // 拆信 ceremony is a choice, not an interruption. Cardless results
            // (stay / battle / a quiet return) still flow to the result screen.
            if (
              save.lastResult &&
              save.lastResult !== prevResult &&
              !save.pendingPostcardId &&
              (screen === "home" || screen === "traveling")
            ) {
              screen = "result";
            }
            patch.screen = screen;
            return patch;
          });
        } catch (e) {
          if ((e as { status?: number }).status === 401) get().logout();
        }
      },

      adoptSave: (save) =>
        set((s) => ({
          companion: save.companion,
          capyState: save.capyState,
          companionState: save.companionState,
          packedBag: save.packedBag,
          activeTrip: save.activeTrip,
          postcards: sanitizePostcards(save.postcards),
          souvenirs: save.souvenirs,
          battleRecords: save.battleRecords,
          companionDays: save.companionDays,
          cardDex: save.cardDex,
          lastResult: save.lastResult,
          events: save.events,
          lastActionDay: save.lastActionDay,
          pendingPostcardId: save.pendingPostcardId,
          cloud: s.cloud ? { ...s.cloud, rev: save.rev } : s.cloud,
        })),
    }),
    {
      name: "capybanana-save-v1",
      skipHydration: true,
      storage: createJSONStorage(() =>
        typeof window !== "undefined"
          ? window.localStorage
          : {
              getItem: () => null,
              setItem: () => {},
              removeItem: () => {},
            },
      ),
      partialize: (s) => ({
        companion: s.companion,
        capyState: s.capyState,
        companionState: s.companionState,
        packedBag: s.packedBag,
        activeTrip: s.activeTrip,
        postcards: s.postcards,
        souvenirs: s.souvenirs,
        battleRecords: s.battleRecords,
        companionDays: s.companionDays,
        cardDex: s.cardDex,
        lastResult: s.lastResult,
        events: s.events,
        lastActionDay: s.lastActionDay,
        screen: s.screen,
        hasOnboarded: s.hasOnboarded,
        selectedPostcardId: s.selectedPostcardId,
        pendingPostcardId: s.pendingPostcardId,
        cloud: s.cloud,
        connectUrl: s.connectUrl,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) state.postcards = sanitizePostcards(state.postcards);
        state?.setHasHydrated(true);
      },
    },
  ),
);

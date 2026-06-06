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
import { cloud } from "@/lib/cloudClient";
import { supabaseSignOut } from "@/lib/supabaseClient";
import type { CloudSave } from "@/server/types";

// A prepared "今日包裹" goes stale after ~a day. The web checks this itself on
// home entry (the server never auto-expires); a NEXT_PUBLIC_ override keeps it
// testable in dev (e.g. NEXT_PUBLIC_CAPY_BAG_TTL_MIN=1 → stale after a minute).
const BAG_TTL_OVERRIDE_MIN = Number(process.env.NEXT_PUBLIC_CAPY_BAG_TTL_MIN);
export const BAG_TTL_MS =
  Number.isFinite(BAG_TTL_OVERRIDE_MIN) && BAG_TTL_OVERRIDE_MIN > 0
    ? BAG_TTL_OVERRIDE_MIN * 60_000
    : 24 * 60 * 60_000;

export type Screen =
  | "login"
  | "connect"
  | "profile"
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
  misunderstandings: string[];
  battleRecords: BattleRecord[];
  // 养成: 陪伴天数 (the only visible meter) + the collected 图鉴 card ids.
  companionDays: number;
  cardDex: string[];
  lastResult: DayOutcome | null;
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
  logout: () => void;
  restyle: () => void;
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
    misunderstandings: [],
    battleRecords: [],
    companionDays: 0,
    cardDex: [],
    lastResult: null,
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
          set({ screen: "login", cloudError: "请先登录后再准备包裹。" });
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
            connectUrl: res.connectUrl,
            cloudBusy: false,
          });
          get().adoptSave(res.save);
          // No pet is auto-created. The connect screen is the gate: a returning
          // owner whose Agent already registered a pet goes straight home;
          // everyone else waits on "connect" until the Agent binds & names it.
          set({
            screen:
              res.save.companion && get().hasOnboarded ? "home" : "connect",
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
            connectUrl: res.connectUrl,
            cloudBusy: false,
          });
          get().adoptSave(res.save);
          set({
            screen:
              res.save.companion && get().hasOnboarded ? "home" : "connect",
          });
        } catch (e) {
          set({ cloudBusy: false, cloudError: (e as Error).message });
        }
      },

      restyle: () => {
        const s = get();
        if (!s.cloud || s.cloudBusy) return;
        set({ cloudBusy: true, cloudError: null });
        cloud
          .restyle(s.cloud.bindToken, { random: true })
          .then(({ save }) => {
            get().adoptSave(save);
            set({ cloudBusy: false });
          })
          .catch((e: Error & { status?: number }) => {
            if (e.status === 401) return get().logout();
            set({ cloudBusy: false, cloudError: e.message });
          });
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
        const name = s.companion?.name ?? "它";
        set({
          notice: `包裹放了一天，里面的东西已经不新鲜啦——${name} 悄悄收走了，要不要重新打包？`,
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
          const { save } = await cloud.pet(s.cloud.bindToken);
          if (save.rev === s.cloud.rev) return;
          const prevPending = s.pendingPostcardId;
          const prevResult = s.lastResult;
          get().adoptSave(save);
          set((cur) => {
            const patch: Partial<GameState> = {};
            let screen = cur.screen;
            const arrivedPostcard =
              !!save.pendingPostcardId && save.pendingPostcardId !== prevPending;
            if (
              save.companionState === "traveling" &&
              (screen === "home" || screen === "pack")
            )
              screen = "traveling";
            if (arrivedPostcard && (screen === "home" || screen === "traveling")) {
              patch.selectedPostcardId = save.pendingPostcardId;
              screen = "postcard";
            } else if (
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
          postcards: save.postcards,
          souvenirs: save.souvenirs,
          misunderstandings: save.misunderstandings,
          battleRecords: save.battleRecords,
          companionDays: save.companionDays,
          cardDex: save.cardDex,
          lastResult: save.lastResult,
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
        misunderstandings: s.misunderstandings,
        battleRecords: s.battleRecords,
        companionDays: s.companionDays,
        cardDex: s.cardDex,
        lastResult: s.lastResult,
        screen: s.screen,
        hasOnboarded: s.hasOnboarded,
        selectedPostcardId: s.selectedPostcardId,
        pendingPostcardId: s.pendingPostcardId,
        cloud: s.cloud,
        connectUrl: s.connectUrl,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);

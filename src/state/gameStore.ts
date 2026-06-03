import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { DEFAULT_CAPY } from "@/game/defaults";
import { randomCuteCompanion } from "@/game/randomCompanion";
import type {
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

type LoginDestination = "profile" | "connect";

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
  lastResult: DayOutcome | null;
  screen: Screen;
  loginDestination: LoginDestination;
  selectedPostcardId: string | null;
  pendingPostcardId: string | null;

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

  // cloud actions
  loginWithSupabaseToken: (
    accessToken: string,
    destination?: LoginDestination,
  ) => Promise<void>;
  loginWithDevIdentity: (
    identity?: string,
    destination?: LoginDestination,
  ) => Promise<void>;
  logout: () => void;
  ensureCloudPet: () => Promise<void>;
  restyle: () => void;
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
    lastResult: null,
    selectedPostcardId: null,
    pendingPostcardId: null,
  };
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      hasHydrated: false,
      ...emptyLocalState(),
      screen: "login",
      loginDestination: "profile",

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

        set({ cloudBusy: true, cloudError: null, screen: "home" });
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
          loginDestination: "profile",
          cloud: null,
          connectUrl: null,
          cloudError: null,
        }),

      // ---- cloud ----

      // Bridge a verified Supabase session (Google login) into our bind-token
      // account. Invoked by the GameRoot auth bridge once Supabase reports a
      // session; Supabase Auth owns the identity proof.
      loginWithSupabaseToken: async (accessToken, destination = "profile") => {
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
          if (res.save.companion) {
            set({ screen: destination });
            return;
          }
          await get().ensureCloudPet();
          if (destination === "connect" && get().companion) {
            set({ screen: "connect" });
          }
        } catch (e) {
          set({ cloudBusy: false, cloudError: (e as Error).message });
        }
      },

      // Local dev bridge (no Supabase). Still cloud-backed: it writes to the
      // same SQL tables as Google login, using a stable local identity string.
      loginWithDevIdentity: async (identity, destination = "profile") => {
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
          if (res.save.companion) {
            set({ screen: destination });
            return;
          }
          await get().ensureCloudPet();
          if (destination === "connect" && get().companion) {
            set({ screen: "connect" });
          }
        } catch (e) {
          set({ cloudBusy: false, cloudError: (e as Error).message });
        }
      },

      ensureCloudPet: async () => {
        const s = get();
        if (!s.cloud || s.companion || s.cloudBusy) return;
        set({ cloudBusy: true, cloudError: null });
        try {
          const { save } = await cloud.create(
            s.cloud.bindToken,
            randomCuteCompanion(),
          );
          get().adoptSave(save);
          set({ cloudBusy: false, screen: "profile" });
        } catch (e) {
          const err = e as Error & { status?: number };
          if (err.status === 401) return get().logout();
          if (err.status === 409) {
            try {
              const { save } = await cloud.pet(s.cloud.bindToken);
              get().adoptSave(save);
              set({ cloudBusy: false, screen: "profile" });
              return;
            } catch {
              /* fall through to surfacing the error below */
            }
          }
          set({ cloudBusy: false, cloudError: err.message });
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
          loginDestination: "profile",
          screen: "login",
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
        lastResult: s.lastResult,
        screen: s.screen,
        loginDestination: s.loginDestination,
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

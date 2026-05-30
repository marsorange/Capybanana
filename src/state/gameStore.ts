import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { advanceLifecycle, scheduleDeparture } from "@/game/clock";
import { planTrip } from "@/game/planTrip";
import type {
  Accessory,
  Companion,
  CompanionState,
  CompanionType,
  PackedBag,
  PackedItem,
  Personality,
  Postcard,
  Trip,
} from "@/game/types";
import { pick, uid } from "@/game/util";

export type Screen =
  | "create"
  | "home"
  | "pack"
  | "traveling"
  | "album"
  | "postcard";

const STAY_NOTICES = [
  "它今天好像还想在家待着…",
  "它在门口蹭了蹭，又把背包放下了。",
  "它打了个哈欠，决定再赖一会儿。",
];

export interface CreateCompanionInput {
  name: string;
  type: CompanionType;
  primaryColor: string;
  personality: Personality;
  accessory: Accessory;
}

interface GameState {
  hasHydrated: boolean;
  companion: Companion | null;
  companionState: CompanionState;
  packedBag: PackedBag | null;
  activeTrip: Trip | null;
  postcards: Postcard[];
  screen: Screen;
  selectedPostcardId: string | null;
  pendingPostcardId: string | null;
  notice: string | null;

  setHasHydrated: (v: boolean) => void;
  createCompanion: (input: CreateCompanionInput) => void;
  goTo: (screen: Screen) => void;
  clearNotice: () => void;
  prepareBag: (items: PackedItem[], message: string) => void;
  openPostcard: (id: string) => void;
  collectPostcard: () => void;
  tick: (now?: number) => void;
  devFastForward: () => void;
  devRunTrip: () => void;
  reset: () => void;
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      hasHydrated: false,
      companion: null,
      companionState: "idle_home",
      packedBag: null,
      activeTrip: null,
      postcards: [],
      screen: "create",
      selectedPostcardId: null,
      pendingPostcardId: null,
      notice: null,

      setHasHydrated: (v) => set({ hasHydrated: v }),

      createCompanion: (input) => {
        const companion: Companion = {
          id: uid("cmp"),
          name: input.name.trim() || "旅行伙伴",
          type: input.type,
          primaryColor: input.primaryColor,
          personality: input.personality,
          accessory: input.accessory,
          createdAt: new Date().toISOString(),
        };
        set({
          companion,
          companionState: "idle_home",
          packedBag: null,
          activeTrip: null,
          screen: "home",
          notice: null,
        });
      },

      goTo: (screen) => set({ screen, notice: null }),

      clearNotice: () => set({ notice: null }),

      prepareBag: (items, message) => {
        const now = Date.now();
        const decision = scheduleDeparture(now);
        const packedBag: PackedBag = {
          items,
          message,
          packedAt: now,
          departAt: decision.departAt,
          willGo: decision.willGo,
        };
        set({
          packedBag,
          companionState: "ready",
          screen: "home",
          notice: null,
        });
      },

      openPostcard: (id) =>
        set({ selectedPostcardId: id, screen: "postcard" }),

      collectPostcard: () => {
        set({
          pendingPostcardId: null,
          selectedPostcardId: null,
          screen: "home",
          notice: null,
        });
      },

      tick: (now = Date.now()) => {
        const s = get();
        if (!s.companion) return;
        const out = advanceLifecycle(
          {
            companion: s.companion,
            companionState: s.companionState,
            packedBag: s.packedBag,
            activeTrip: s.activeTrip,
            postcards: s.postcards,
          },
          now,
        );

        const unchanged =
          out.companionState === s.companionState &&
          out.packedBag === s.packedBag &&
          out.activeTrip === s.activeTrip &&
          out.postcards === s.postcards &&
          !out.departed &&
          !out.stayedHome &&
          !out.arrivedPostcardId;
        if (unchanged) return;

        const patch: Partial<GameState> = {
          companionState: out.companionState,
          packedBag: out.packedBag,
          activeTrip: out.activeTrip,
          postcards: out.postcards,
        };

        if (out.arrivedPostcardId) {
          patch.pendingPostcardId = out.arrivedPostcardId;
          patch.notice = null;
          // Surface the arrival unless the player is already browsing cards.
          if (s.screen === "home" || s.screen === "traveling") {
            patch.selectedPostcardId = out.arrivedPostcardId;
            patch.screen = "postcard";
          }
        } else if (out.departed) {
          patch.notice = null;
          if (s.screen === "home" || s.screen === "pack") {
            patch.screen = "traveling";
          }
        } else if (out.stayedHome) {
          patch.notice = pick(STAY_NOTICES);
        }

        set(patch);
      },

      devFastForward: () => {
        const s = get();
        const now = Date.now();
        if (s.companionState === "ready" && s.packedBag) {
          set({
            packedBag: { ...s.packedBag, departAt: now, willGo: true },
          });
        } else if (s.companionState === "traveling" && s.activeTrip) {
          set({ activeTrip: { ...s.activeTrip, returnsAt: now } });
        }
        get().tick(now);
      },

      // Instant out-and-back: leaves now and returns now, producing a postcard.
      devRunTrip: () => {
        const s = get();
        if (!s.companion) return;
        const now = Date.now();
        if (s.companionState === "traveling" && s.activeTrip) {
          set({ activeTrip: { ...s.activeTrip, returnsAt: now } });
          get().tick(now);
          return;
        }
        const items = s.packedBag?.items ?? [];
        const message = s.packedBag?.message ?? "";
        const plan = planTrip(items, message);
        const trip: Trip = {
          id: uid("trip"),
          companionId: s.companion.id,
          items,
          message,
          status: "traveling",
          destination: plan.destination,
          startedAt: now - 1,
          durationMs: 1,
          returnsAt: now,
        };
        set({ activeTrip: trip, companionState: "traveling", packedBag: null });
        get().tick(now);
      },

      reset: () =>
        set({
          companion: null,
          companionState: "idle_home",
          packedBag: null,
          activeTrip: null,
          postcards: [],
          screen: "create",
          selectedPostcardId: null,
          pendingPostcardId: null,
          notice: null,
        }),
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
        companionState: s.companionState,
        packedBag: s.packedBag,
        activeTrip: s.activeTrip,
        postcards: s.postcards,
        screen: s.screen,
        selectedPostcardId: s.selectedPostcardId,
        pendingPostcardId: s.pendingPostcardId,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);

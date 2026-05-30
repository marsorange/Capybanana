import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { advanceLifecycle, scheduleDeparture } from "@/game/clock";
import { planTrip } from "@/game/planTrip";
import type {
  Accessory,
  CapyState,
  Companion,
  CompanionState,
  CompanionType,
  DayOutcome,
  Gesture,
  PackedBag,
  PackedItem,
  Personality,
  Postcard,
  Trip,
} from "@/game/types";
import { pick, uid } from "@/game/util";
import { randomCompanion } from "@/game/randomCompanion";
import { cloud } from "@/lib/cloudClient";
import type { CloudSave } from "@/server/types";

export type Screen =
  | "login"
  | "create"
  | "connect"
  | "profile"
  | "home"
  | "pack"
  | "traveling"
  | "album"
  | "postcard"
  | "result";

export interface CreateCompanionInput {
  name: string;
  type: CompanionType;
  primaryColor: string;
  personality: Personality;
  accessory: Accessory;
}

// When bound to an account, the web client is just another holder of the bind
// token, talking to the same /api/agent/* endpoints an external agent uses.
export interface CloudAuth {
  userId: string;
  phone: string;
  bindToken: string;
  rev: number;
}

const DEFAULT_CAPY: CapyState = {
  mood: 62,
  energy: 70,
  curiosity: 50,
  bravery: 42,
  injury: 0,
  bond: 30,
  traits: [],
  memories: [],
};

const SECRET_THRESHOLD = 3;
const SECRET_REVEALS = [
  "原来它一直在攒东西，给你堆了一个小小的「礼物角」。",
  "那串脚印是它新交的小伙伴留下的，今天它把对方带回来了一会儿。",
  "它偷偷学会了一个小本事，神气地表演给你看。",
];

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

function applyEffects(capy: CapyState, eff: DayOutcome["effects"]): CapyState {
  return {
    ...capy,
    mood: clamp(capy.mood + (eff.mood ?? 0)),
    energy: clamp(capy.energy + (eff.energy ?? 0)),
    curiosity: clamp(capy.curiosity + (eff.curiosity ?? 0)),
    bravery: clamp(capy.bravery + (eff.bravery ?? 0)),
    injury: clamp(capy.injury + (eff.injury ?? 0)),
    bond: clamp(capy.bond + (eff.bond ?? 0)),
  };
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
  secretProgress: number;
  lastResult: DayOutcome | null;
  screen: Screen;
  selectedPostcardId: string | null;
  pendingPostcardId: string | null;

  // cloud / account
  cloud: CloudAuth | null;
  connectUrl: string | null;
  cloudBusy: boolean;
  cloudError: string | null;

  setHasHydrated: (v: boolean) => void;
  createCompanion: (input: CreateCompanionInput) => void;
  goTo: (screen: Screen) => void;
  prepareBag: (
    items: PackedItem[],
    message: string,
    gesture?: Gesture,
  ) => void;
  openPostcard: (id: string) => void;
  collectPostcard: () => void;
  tick: (now?: number) => void;
  devFastForward: () => void;
  devRunTrip: () => void;
  reset: () => void;

  // cloud actions
  login: (phone: string) => Promise<void>;
  logout: () => void;
  ensureCloudPet: () => Promise<void>;
  cloudPull: () => Promise<void>;
  adoptSave: (save: CloudSave) => void;
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      hasHydrated: false,
      companion: null,
      capyState: DEFAULT_CAPY,
      companionState: "idle_home",
      packedBag: null,
      activeTrip: null,
      postcards: [],
      souvenirs: [],
      misunderstandings: [],
      secretProgress: 0,
      lastResult: null,
      screen: "login",
      selectedPostcardId: null,
      pendingPostcardId: null,

      cloud: null,
      connectUrl: null,
      cloudBusy: false,
      cloudError: null,

      setHasHydrated: (v) => set({ hasHydrated: v }),

      createCompanion: (input) => {
        const s = get();
        if (s.cloud) {
          // Cloud: create the pet on the server, then show the connect card.
          set({ cloudBusy: true, cloudError: null });
          cloud
            .create(s.cloud.bindToken, input)
            .then(({ save }) => {
              get().adoptSave(save);
              set({ cloudBusy: false, screen: "connect" });
            })
            .catch((e: Error & { status?: number }) => {
              if (e.status === 401) return get().logout();
              set({ cloudBusy: false, cloudError: e.message });
            });
          return;
        }

        const companion: Companion = {
          id: uid("cmp"),
          name: input.name.trim() || "卡皮巴拉",
          type: input.type,
          primaryColor: input.primaryColor,
          personality: input.personality,
          accessory: input.accessory,
          createdAt: new Date().toISOString(),
        };
        set({
          companion,
          capyState: DEFAULT_CAPY,
          companionState: "idle_home",
          packedBag: null,
          activeTrip: null,
          lastResult: null,
          screen: "home",
        });
      },

      goTo: (screen) => set({ screen }),

      prepareBag: (items, message, gesture) => {
        const s = get();
        if (s.cloud) {
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
          return;
        }

        const now = Date.now();
        const decision = scheduleDeparture(now);
        set({
          packedBag: {
            items,
            message,
            gesture,
            packedAt: now,
            departAt: decision.departAt,
            willGo: decision.willGo,
          },
          companionState: "ready",
          screen: "home",
        });
      },

      openPostcard: (id) => set({ selectedPostcardId: id, screen: "postcard" }),

      collectPostcard: () => {
        const s = get();
        if (s.cloud) {
          cloud
            .collect(s.cloud.bindToken)
            .then(({ save }) => get().adoptSave(save))
            .catch(() => {});
        }
        set({
          pendingPostcardId: null,
          selectedPostcardId: null,
          screen: "home",
        });
      },

      tick: (now = Date.now()) => {
        const s = get();
        // Cloud pets resolve server-side; GameRoot polls cloudPull instead.
        if (s.cloud) return;
        if (!s.companion) return;
        const out = advanceLifecycle(
          {
            companion: s.companion,
            capy: s.capyState,
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
          !out.started &&
          !out.outcome;
        if (unchanged) return;

        const patch: Partial<GameState> = {
          companionState: out.companionState,
          packedBag: out.packedBag,
          activeTrip: out.activeTrip,
          postcards: out.postcards,
        };

        if (out.outcome) {
          let o = out.outcome;
          // Secret events build over several days, then pay off.
          if (o.kind === "secret") {
            const next = s.secretProgress + 1;
            if (next >= SECRET_THRESHOLD) {
              const reveal = pick(SECRET_REVEALS);
              o = {
                ...o,
                title: "秘密揭晓了！",
                story: `攒了好几天的小古怪，今天终于有了答案——${reveal}`,
                memory: `【揭晓】${reveal}`,
                trait: "藏着小秘密",
                effects: { ...o.effects, mood: 10, bond: 8, curiosity: 4 },
              };
              patch.secretProgress = 0;
            } else {
              o = {
                ...o,
                story: `${o.story}（这已经是第 ${next} 个奇怪的迹象了…）`,
              };
              patch.secretProgress = next;
            }
          }
          let capyNext = applyEffects(s.capyState, o.effects);
          if (o.memory)
            capyNext = {
              ...capyNext,
              memories: [o.memory, ...capyNext.memories].slice(0, 30),
            };
          if (o.trait && !capyNext.traits.includes(o.trait))
            capyNext = { ...capyNext, traits: [...capyNext.traits, o.trait] };
          if (out.activeTrip?.gesture === "pat")
            capyNext = {
              ...capyNext,
              bond: clamp(capyNext.bond + 3),
              mood: clamp(capyNext.mood + 2),
            };
          patch.capyState = capyNext;
          patch.lastResult = o;
          if (o.souvenir) patch.souvenirs = [o.souvenir, ...s.souvenirs];
          if (o.misunderstanding)
            patch.misunderstandings = [o.misunderstanding, ...s.misunderstandings];

          if (o.postcard) {
            patch.pendingPostcardId = o.postcard.id;
            if (s.screen === "home" || s.screen === "traveling") {
              patch.selectedPostcardId = o.postcard.id;
              patch.screen = "postcard";
            }
          } else if (s.screen === "home" || s.screen === "traveling") {
            patch.screen = "result";
          }
        } else if (out.started) {
          if (s.screen === "home" || s.screen === "pack") {
            patch.screen = "traveling";
          }
        }

        set(patch);
      },

      devFastForward: () => {
        const s = get();
        if (s.cloud) return;
        const now = Date.now();
        if (s.companionState === "ready" && s.packedBag) {
          set({ packedBag: { ...s.packedBag, departAt: now, willGo: true } });
        } else if (s.companionState === "traveling" && s.activeTrip) {
          set({ activeTrip: { ...s.activeTrip, returnsAt: now } });
        }
        get().tick(now);
      },

      // Instant: start a day and resolve it right away (guest/dev only).
      devRunTrip: () => {
        const s = get();
        if (s.cloud) return;
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
          gesture: s.packedBag?.gesture,
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
          capyState: DEFAULT_CAPY,
          companionState: "idle_home",
          packedBag: null,
          activeTrip: null,
          postcards: [],
          souvenirs: [],
          misunderstandings: [],
          lastResult: null,
          screen: "login",
          selectedPostcardId: null,
          pendingPostcardId: null,
          cloud: null,
          connectUrl: null,
          cloudError: null,
        }),

      // ---- cloud ----

      login: async (phone) => {
        set({ cloudBusy: true, cloudError: null });
        try {
          const res = await cloud.login(phone);
          set({
            cloud: {
              userId: res.user.id,
              phone: res.user.phone,
              bindToken: res.bindToken,
              rev: res.save.rev,
            },
            connectUrl: res.connectUrl,
            cloudBusy: false,
          });
          get().adoptSave(res.save);
          if (res.save.companion) {
            // Meet-your-pet card first, then the owner taps into the house.
            set({ screen: "profile" });
            return;
          }
          // Legacy/edge case: account exists without a pet. Adopt one now so
          // the owner can play instead of being stuck on the connect screen.
          await get().ensureCloudPet();
        } catch (e) {
          set({ cloudBusy: false, cloudError: (e as Error).message });
        }
      },

      // Make sure a bound account has a pet to play with. New accounts get one
      // on login, but this also rescues accounts left petless (e.g. created
      // before auto-adoption). Attaching an AI agent stays optional.
      ensureCloudPet: async () => {
        const s = get();
        if (!s.cloud || s.companion || s.cloudBusy) return;
        set({ cloudBusy: true, cloudError: null });
        try {
          const { save } = await cloud.create(
            s.cloud.bindToken,
            randomCompanion(),
          );
          get().adoptSave(save);
          set({ cloudBusy: false, screen: "profile" });
        } catch (e) {
          const err = e as Error & { status?: number };
          if (err.status === 401) return get().logout();
          // Pet already exists (race) → pull whatever the server has.
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

      logout: () =>
        set({
          companion: null,
          capyState: DEFAULT_CAPY,
          companionState: "idle_home",
          packedBag: null,
          activeTrip: null,
          postcards: [],
          souvenirs: [],
          misunderstandings: [],
          lastResult: null,
          selectedPostcardId: null,
          pendingPostcardId: null,
          cloud: null,
          connectUrl: null,
          cloudError: null,
          screen: "login",
        }),

      cloudPull: async () => {
        const s = get();
        if (!s.cloud) return;
        try {
          const { save } = await cloud.pet(s.cloud.bindToken);
          if (save.rev === s.cloud.rev) return; // nothing new
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
          // A dead/stale token (e.g. server restarted) → drop to login so the
          // user can re-bind, rather than silently failing forever.
          if ((e as { status?: number }).status === 401) get().logout();
          /* else offline / transient — keep showing the last known state */
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
        secretProgress: s.secretProgress,
        lastResult: s.lastResult,
        screen: s.screen,
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

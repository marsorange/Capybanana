// Core domain types for Capybanana.

// Protagonist species. The product ships a SINGLE fixed character (the
// capybara); this union stays wider only so legacy saves and agent-supplied
// `type` strings still type-check — characters.ts collapses them all back to the
// capybara via normalizeSpecies. See src/game/characters.ts.
export type CompanionType =
  | "capybara"
  | "rabbit"
  | "duck"
  | "raccoon"
  | "shiba"
  | "sheep";

export type Personality = "gentle" | "curious" | "lazy" | "brave" | "dreamy";

export type Accessory =
  | "none"
  | "scarf"
  | "hat"
  | "glasses"
  | "flower"
  | "bell";

export interface Companion {
  id: string;
  name: string;
  type: CompanionType;
  primaryColor: string; // hex
  personality: Personality;
  accessory: Accessory;
  createdAt: string;
}

export type LuggageItem = "food" | "camera" | "charm" | "gift" | "umbrella";

// Story-seed tags. The package is read as a bundle of tags that bias what the
// capybara does with its day (it is NOT an "optimal equipment" choice).
export type ItemTag =
  | "warm"
  | "food"
  | "soft"
  | "shiny"
  | "protective"
  | "weird"
  | "work"
  | "rain"
  | "sleep"
  | "toy";

// A thing in the suitcase: either a preset item, a real object the player
// photographed (the core "拍照实物带走" mechanic), or a free-text thing an
// external AI agent describes over the API. Future iOS object-cutout would
// refine `photo` into a background-removed sticker.
export interface PackedItem {
  id: string;
  kind: "preset" | "photo" | "text";
  preset?: LuggageItem; // when kind === "preset"
  photo?: string; // dataURL thumbnail, when kind === "photo"
  label: string;
  hint?: string; // extracted element, e.g. "海一样的蓝"
  keyword?: string; // bias keyword for pickDestination, e.g. "海"
  color?: string; // dominant color hex
  tags?: ItemTag[]; // story-seed tags (from preset map or photo VLM/heuristic)
}

// The capybara's simple evolving state. Five core stats (see
// docs/core-gameplay.md §8): mood, energy, courage, curiosity, injury — plus the
// lightweight growth tags (traits) and a short memory log.
export interface CapyState {
  mood: number; // 0..100
  energy: number;
  courage: number;
  curiosity: number;
  injury: number;
  traits: string[];
  memories: string[];
}

export type OutcomeKind =
  | "home"
  | "yard"
  | "travel"
  | "rest"
  | "battle";

export interface DayOutcome {
  id: string;
  kind: OutcomeKind;
  title: string;
  story: string; // what it did with your package
  reason: string; // references your message / items
  effects: Partial<
    Pick<CapyState, "mood" | "energy" | "courage" | "curiosity" | "injury">
  >;
  souvenir?: string; // a brought-back trinket name
  misunderstanding?: string; // a "误解词典" entry
  memory?: string; // appended to CapyState.memories (secrets build suspense)
  trait?: string; // a personality trait it picked up
  postcard?: Postcard; // only for travel outcomes
  resolvedAt: string;
}

// Eight destinations, split into a NEAR pool and a FAR pool. The agent only
// chooses near/far (the distance); the server picks the actual destination at
// random within that pool, biased by what the owner packed. See destinations.ts.
export type DestinationTheme =
  | "seaside"
  | "forest"
  | "flowerfield"
  | "town"
  | "snow"
  | "mountain"
  | "starfield"
  | "desert";

// How far the agent sent the pet today. Near = a short hop; far = a long haul.
// The server maps this to a destination pool + a trip duration.
export type TripDistance = "near" | "far";

// Postcard gacha rarity, ascending. Each (destination × rarity) pair is one
// fixed collectible "card"; 8 destinations × 3 rarities = 24-card 图鉴. The
// rarity is rolled server-side at trip resolution (see src/game/gacha.ts) and is
// NOT influenced by the packed bag — only by 陪伴天数 + 好奇心 + pity.
export type Rarity = "N" | "R" | "SR";

export type TripStatus = "traveling" | "returned";

export type Gesture = "pat"; // optional 摸头/手势

// What the agent decided the pet should do with the day. A concrete OutcomeKind
// forces that ending; "quiet" is a low-key day (home/yard/rest).
export type TripIntent = OutcomeKind | "quiet";

export interface Trip {
  id: string;
  companionId: string;
  items: PackedItem[]; // <= 3
  message: string;
  gesture?: Gesture;
  status: TripStatus;
  destination: DestinationTheme;
  intent?: TripIntent; // the agent's decision; undefined === "auto"
  distance?: TripDistance; // near/far the agent chose (travel only)
  note?: string; // why the agent sent it out (free text, optional)
  startedAt: number; // epoch ms
  durationMs: number;
  returnsAt: number; // epoch ms
}

export interface Postcard {
  id: string;
  tripId: string;
  companionId: string;
  locationName: string; // the canonical landmark for this card (destination × rarity)
  destinationTheme: DestinationTheme;
  rarity: Rarity; // gacha rarity, rolled at resolution; drives the 图鉴 slot + frame
  title: string;
  message: string;
  reason: string;
  imageKey: string; // === destinationTheme; selects the procedural PostcardArt
  sentAt: string;
}

// Bag prepared by the player; the cloud pet waits in `ready` until the agent
// decides the day — there is no auto-departure, so no departAt/willGo here.
export interface PackedBag {
  items: PackedItem[];
  message: string;
  gesture?: Gesture;
  packedAt: number; // epoch ms
}

export type CompanionState = "idle_home" | "ready" | "traveling";

// --- Battle (对战) -----------------------------------------------------------

export type BattleResult = "win" | "lose" | "draw";

// A compact view of a pet, used both as the matchmaking-pool entry and as the
// context handed to the LLM judge for both sides.
export interface BattleSnapshot {
  name: string;
  species: CompanionType;
  personality: Personality;
  accessory: Accessory;
  stats: Pick<CapyState, "energy" | "mood" | "courage" | "curiosity" | "injury">;
  traits: string[];
  rating: number;
}

// A collectible battle record, sibling to Postcard. Rendered in the album.
export interface BattleRecord {
  id: string;
  day: string; // YYYY-MM-DD (UTC+8) the battle happened
  opponentName: string;
  opponentSpecies: CompanionType;
  isNpc: boolean;
  result: BattleResult;
  title: string;
  story: string; // the LLM/heuristic-generated process narrative
  injury: number; // injury our pet took
  spoils?: string; // optional trophy
  ratingDelta: number;
  createdAt: string; // ISO
}

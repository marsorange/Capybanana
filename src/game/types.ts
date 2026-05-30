// Core domain types for Capybanana.

export type CompanionType =
  | "animal"
  | "sprite"
  | "robot"
  | "mushroom"
  | "dumpling";

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
  keyword?: string; // bias keyword for planTrip, e.g. "海"
  color?: string; // dominant color hex
  tags?: ItemTag[]; // story-seed tags (from preset map or photo VLM/heuristic)
}

// The capybara's simple evolving state.
export interface CapyState {
  mood: number; // 0..100
  energy: number;
  curiosity: number;
  bravery: number;
  injury: number;
  bond: number;
  traits: string[];
  memories: string[];
}

export type OutcomeKind =
  | "home"
  | "yard"
  | "travel"
  | "claw"
  | "rest"
  | "secret";

export interface DayOutcome {
  id: string;
  kind: OutcomeKind;
  title: string;
  story: string; // what it did with your package
  reason: string; // references your message / items
  effects: Partial<
    Pick<
      CapyState,
      "mood" | "energy" | "curiosity" | "bravery" | "injury" | "bond"
    >
  >;
  souvenir?: string; // a brought-back trinket name
  misunderstanding?: string; // a "误解词典" entry
  memory?: string; // appended to CapyState.memories (secrets build suspense)
  trait?: string; // a personality trait it picked up
  postcard?: Postcard; // only for travel outcomes
  resolvedAt: string;
}

export type DestinationTheme =
  | "seaside"
  | "forest"
  | "snow"
  | "hotspring"
  | "harbor"
  | "mountain"
  | "flowerfield"
  | "raincity"
  | "town"
  | "nightstation";

export type TripStatus = "traveling" | "returned";

export type Gesture = "pat"; // optional 摸头/手势

export interface Trip {
  id: string;
  companionId: string;
  items: PackedItem[]; // <= 3
  message: string;
  gesture?: Gesture;
  status: TripStatus;
  destination: DestinationTheme;
  startedAt: number; // epoch ms
  durationMs: number;
  returnsAt: number; // epoch ms
}

export interface Postcard {
  id: string;
  tripId: string;
  companionId: string;
  locationName: string;
  destinationTheme: DestinationTheme;
  title: string;
  message: string;
  reason: string;
  imageKey: string; // === destinationTheme
  sentAt: string;
  // Prompt for the AI postcard art (MiniMax image-01), composed at trip
  // resolution from the companion look + packed items + location + the note the
  // player wrote. Sent to /api/postcard-image; falls back to procedural SVG art
  // if image generation is unavailable.
  imagePrompt?: string;
  // Generated image persisted on the card so it is only produced once.
  imageStatus?: "pending" | "ready" | "error";
  imageUrl?: string;
}

// Bag prepared by the player; the companion decides on its own when to leave.
export interface PackedBag {
  items: PackedItem[];
  message: string;
  gesture?: Gesture;
  packedAt: number; // epoch ms
  departAt: number; // epoch ms the companion intends to leave
  willGo: boolean; // false === "today it stays home", will be re-rolled
}

export type CompanionState = "idle_home" | "ready" | "traveling";

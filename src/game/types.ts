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

// A thing in the suitcase: either a preset item, or a real object the player
// photographed (the core "拍照实物带走" mechanic). Future iOS object-cutout
// would refine `photo` into a background-removed sticker.
export interface PackedItem {
  id: string;
  kind: "preset" | "photo";
  preset?: LuggageItem; // when kind === "preset"
  photo?: string; // dataURL thumbnail, when kind === "photo"
  label: string;
  hint?: string; // extracted element, e.g. "海一样的蓝"
  keyword?: string; // bias keyword for planTrip, e.g. "海"
  color?: string; // dominant color hex
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

export interface Trip {
  id: string;
  companionId: string;
  items: PackedItem[]; // <= 3
  message: string;
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
}

// Bag prepared by the player; the companion decides on its own when to leave.
export interface PackedBag {
  items: PackedItem[];
  message: string;
  packedAt: number; // epoch ms
  departAt: number; // epoch ms the companion intends to leave
  willGo: boolean; // false === "today it stays home", will be re-rolled
}

export type CompanionState = "idle_home" | "ready" | "traveling";

import type { Locale } from "@/i18n/core";
import {
  GENERIC_OPENINGS,
  GIFT_LINES,
  ITEM_NOUNS,
  KEYWORD_RULES,
  localizeDestination,
  PERSONALITY_LINES,
} from "./destinations";
import { photoItemsOf, presetsOf } from "./packing";
import type { Companion, DestinationTheme, Postcard, Trip } from "./types";
import { pick } from "./util";

function matchRule(text: string, theme: DestinationTheme) {
  const lower = text.toLowerCase();
  return KEYWORD_RULES.find(
    (r) =>
      r.themes.includes(theme) &&
      r.test.some((t) => lower.includes(t.toLowerCase())),
  );
}

// The glue phrases that stitch the postcard together, by language. Functions
// where a fragment needs to be slotted into a sentence (word order differs).
function glue(locale: Locale) {
  if (locale === "en")
    return {
      openWish: (wish: string, headTo: string) =>
        `I saw you'd written "${wish}", so I ${headTo}.`,
      openPhoto: (headTo: string) =>
        `The thing you packed for me — I watched it the whole way, and before I knew it I ${headTo}.`,
      clueHint: (hint: string) =>
        `The "${hint}" you photographed came along the whole way, like a tiny signpost.`,
      clueLabel: (label: string) =>
        `I made the "${label}" you photographed today's little charm and quietly carried it along.`,
      wishKept: `I carried that line you left me too, even if I'm a bit slow to understand it.`,
      reasonWish: (reason: string) => `Because ${reason}`,
      reasonPhotoHint: (hint: string) =>
        `Because the thing you photographed had a sort of "${hint}" feeling to it`,
      reasonPhoto: `Because the thing you photographed carried me here`,
      reasonNone: `I hadn't decided where to go, so I left today to the wind and my own feet`,
      photoNoun: `the thing you photographed`,
      itemsPhrase: (nouns: string) => `my bag was also packed with ${nouns}`,
      joinNouns: ", ",
      joinReason: ", ",
      end: ".",
    };
  return {
    openWish: (wish: string, headTo: string) =>
      `我看见你写下「${wish}」，就${headTo}。`,
    openPhoto: (headTo: string) =>
      `你给我带的那样东西，我一路上看着它，不知不觉就${headTo}。`,
    clueHint: (hint: string) =>
      `你拍下的「${hint}」一路陪着我，像一枚小小的路标。`,
    clueLabel: (label: string) =>
      `我把你拍的「${label}」当成今天的护身符，悄悄带了一路。`,
    wishKept: `你留的那句话我也带着，虽然我可能理解得有点慢。`,
    reasonWish: (reason: string) => `因为${reason}`,
    reasonPhotoHint: (hint: string) => `因为你拍的那样东西，有种「${hint}」的感觉`,
    reasonPhoto: `因为你拍下的那样东西，把我带到了这里`,
    reasonNone: `我没想好要去哪，就把今天交给了风和脚步`,
    photoNoun: `你拍下的东西`,
    itemsPhrase: (nouns: string) => `背包里还装着${nouns}`,
    joinNouns: "、",
    joinReason: "，",
    end: "。",
  };
}

/**
 * Compose the postcard the companion sends home. Called only at trip
 * resolution, so the destination is finally revealed here. References what the
 * player wrote AND the real things they photographed into the suitcase.
 * This is the no-LLM-key fallback; `locale` decides its language.
 */
export function generatePostcard(
  companion: Companion,
  trip: Trip,
  locale: Locale = "zh",
): Postcard {
  const meta = localizeDestination(trip.destination, locale);
  const g = glue(locale);
  const msg = trip.message ?? "";
  const presets = presetsOf(trip.items);
  const photos = photoItemsOf(trip.items);

  const photoText = photos.map((p) => p.keyword ?? "").join(" ");
  const byMessage = matchRule(msg, trip.destination);
  const byPhoto = matchRule(photoText, trip.destination);
  const photoClue = photos.find((p) => p.hint || p.label);
  const photoHint = photoClue?.hint;

  let opening: string;
  if (byMessage) {
    opening = g.openWish(byMessage.wish[locale], meta.headTo);
  } else if (byPhoto) {
    opening = g.openPhoto(meta.headTo);
  } else {
    opening = pick(GENERIC_OPENINGS[locale]);
  }

  const scene = pick(meta.scenes);
  const toneLine = pick(PERSONALITY_LINES[companion.personality][locale]);
  const clueLine = photoHint
    ? g.clueHint(photoHint)
    : photoClue
      ? g.clueLabel(photoClue.label)
      : "";
  const wishLine = msg.trim() && !byMessage ? g.wishKept : "";
  const giftLine = presets.includes("gift") ? pick(GIFT_LINES[locale]) : "";

  const message = [opening, clueLine, wishLine, scene, toneLine, giftLine]
    .filter(Boolean)
    .join("\n");

  // reason
  let reasonMain: string;
  if (byMessage) reasonMain = g.reasonWish(byMessage.reason[locale]);
  else if (byPhoto && photoHint) reasonMain = g.reasonPhotoHint(photoHint);
  else if (byPhoto) reasonMain = g.reasonPhoto;
  else reasonMain = g.reasonNone;

  const nouns = presets.map((p) => ITEM_NOUNS[p][locale]);
  if (photos.length > 0) nouns.push(g.photoNoun);
  const itemsPhrase =
    nouns.length > 0 ? g.itemsPhrase(nouns.join(g.joinNouns)) : "";

  const reason =
    [reasonMain, itemsPhrase].filter(Boolean).join(g.joinReason) + g.end;

  return {
    // Deterministic per trip (not a random uid): a trip mails at most one
    // postcard, so keying the id off trip.id means two requests that race to
    // settle the same return produce the SAME legacy_id. syncPostcards' `on
    // conflict (legacy_id) do update` then dedupes them instead of inserting a
    // second row that collides on the postcards.trip_id unique constraint (→500).
    id: `pc_${trip.id}`,
    tripId: trip.id,
    companionId: companion.id,
    // Placeholder; the engine rolls the rarity at resolution and overrides both
    // locationName (with the canonical landmark for that card) and rarity below.
    locationName: "",
    destinationTheme: trip.destination,
    rarity: "N", // placeholder; the engine rolls + overrides rarity at fold
    title: pick(meta.titles),
    message,
    reason,
    imageKey: trip.destination,
    sentAt: new Date().toISOString(),
  };
}

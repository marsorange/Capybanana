import {
  GENERIC_OPENINGS,
  getDestination,
  GIFT_LINES,
  ITEM_NOUNS,
  KEYWORD_RULES,
  PERSONALITY_LINES,
} from "./destinations";
import { photoItemsOf, presetsOf } from "./packing";
import { buildPostcardImagePrompt } from "./postcardPrompt";
import type { Companion, DestinationTheme, Postcard, Trip } from "./types";
import { pick, uid } from "./util";

function matchRule(text: string, theme: DestinationTheme) {
  return KEYWORD_RULES.find(
    (r) => r.themes.includes(theme) && r.test.some((t) => text.includes(t)),
  );
}

/**
 * Compose the postcard the companion sends home. Called only at trip
 * resolution, so the destination is finally revealed here. References what the
 * player wrote AND the real things they photographed into the suitcase.
 */
export function generatePostcard(companion: Companion, trip: Trip): Postcard {
  const meta = getDestination(trip.destination);
  const msg = trip.message ?? "";
  const presets = presetsOf(trip.items);
  const photos = photoItemsOf(trip.items);

  const photoText = photos.map((p) => p.keyword ?? "").join(" ");
  const byMessage = matchRule(msg, trip.destination);
  const byPhoto = matchRule(photoText, trip.destination);
  const photoHint = photos.find((p) => p.hint)?.hint;

  let opening: string;
  if (byMessage) {
    opening = `我看见你写下「${byMessage.wish}」，就${meta.headTo}。`;
  } else if (byPhoto) {
    opening = `你给我带的那样东西，我一路上看着它，不知不觉就${meta.headTo}。`;
  } else {
    opening = pick(GENERIC_OPENINGS);
  }

  const scene = pick(meta.scenes);
  const toneLine = pick(PERSONALITY_LINES[companion.personality]);
  const giftLine = presets.includes("gift") ? pick(GIFT_LINES) : "";

  const message = [opening, scene, toneLine, giftLine]
    .filter(Boolean)
    .join("\n");

  // reason
  let reasonMain: string;
  if (byMessage) reasonMain = `因为${byMessage.reason}`;
  else if (byPhoto && photoHint)
    reasonMain = `因为你拍的那样东西，有种「${photoHint}」的感觉`;
  else if (byPhoto) reasonMain = "因为你拍下的那样东西，把我带到了这里";
  else reasonMain = "其实你没特别说想去哪，是它自己拐着弯挑的";

  const nouns = presets.map((p) => ITEM_NOUNS[p]);
  if (photos.length > 0) nouns.push("你拍下的东西");
  const itemsPhrase = nouns.length > 0 ? `背包里还装着${nouns.join("、")}` : "";

  const reason = [reasonMain, itemsPhrase].filter(Boolean).join("，") + "。";

  const locationName = pick(meta.locationNames);

  return {
    id: uid("pc"),
    tripId: trip.id,
    companionId: companion.id,
    locationName,
    destinationTheme: trip.destination,
    title: pick(meta.titles),
    message,
    reason,
    imageKey: trip.destination,
    sentAt: new Date().toISOString(),
    // Prompt for the AI postcard art; image itself is generated client-side.
    imagePrompt: buildPostcardImagePrompt(companion, trip, {
      locationName,
      scene,
    }),
  };
}

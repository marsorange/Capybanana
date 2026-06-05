// GET the companion's recent battle records (newest first) + its win/loss tally.
import { authed } from "@/server/api";
import { tickSave } from "@/server/engine";
import { savePet } from "@/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  const a = await authed(req);
  if (a instanceof Response) return a;
  const save = tickSave(a.save, Date.now());
  await savePet(a.user.petId, save);

  return Response.json({
    ok: true,
    rev: save.rev,
    record: {
      rating: save.rating,
      wins: save.wins,
      losses: save.losses,
      draws: save.draws,
    },
    battles: save.battleRecords.map((b) => ({
      id: b.id,
      day: b.day,
      opponentName: b.opponentName,
      opponentSpecies: b.opponentSpecies,
      isNpc: b.isNpc,
      result: b.result,
      title: b.title,
      story: b.story,
      injury: b.injury,
      spoils: b.spoils,
      ratingDelta: b.ratingDelta,
      createdAt: b.createdAt,
    })),
  });
}

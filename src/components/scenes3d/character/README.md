# character/ — the protagonist's 3D assets

The protagonist is kept **separate from the home/environment assets** (`../home/`).
Anything that draws the pet lives here; the static diorama (island, house, yard)
lives in `../home/`. Shared rendering infra (`SceneCanvas`, `materials`, the
command/zoom buses, interaction layers) stays one level up in `../`.

## The six characters

There are exactly six fixed characters, one per species. Their metadata (labels,
default color, signature accessory, ear proportions, reference filename) is the
single source of truth in [`src/game/characters.ts`](../../../game/characters.ts).
Reference art (concept only, not bundled) is in
[`src/asset/Character/`](../../../asset/Character/):

| species   | character    | reference        |
| --------- | ------------ | ---------------- |
| capybara  | Capybanana   | `Capybanana.png` |
| rabbit    | Bunberry     | `Bunberry.png`   |
| duck      | Quackaroo    | `Quackaroo.png`  |
| raccoon   | Raccoonie    | `Raccoonie.png`  |
| shiba     | Shibuddy     | `Shibuddy.png`   |
| sheep     | Woollybean   | `Woollybean.png` |

## How rendering is wired (skeleton)

- `Character3D.tsx` — the only public entry point. Resolves `type` → species →
  the registered model, and renders it.
- `models.ts` — the per-species model registry.
- `CreatureModel.tsx` — the shared low-poly **placeholder** body. Every species
  currently renders this one parametric creature, tinted/proportioned per the
  roster.

## Dropping in a real 3D asset

The reference PNGs are art targets; the dedicated 3D models are generated later.
When a species' model is ready:

1. Add its component in this folder (e.g. `RabbitModel.tsx`), accepting the same
   props as `CreatureModel` (`type`, `color`, `accessory`, `seed`, `onPointerDown`).
2. Point that species' entry in `models.ts` at the new component.

Nothing else needs to change — the rest of the app already renders through
`Character3D`.

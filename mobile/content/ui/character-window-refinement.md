# Character window refinement assets

Date: 2026-09-27. Generated with built-in image_gen (no CLI fallback). Original outputs are preserved; PNG files are copied unchanged, with Godot delivery imports limited to 1024 and mipmaps enabled.

## Mannequin

Asset: `equipment-mannequin-v2.png`.
Original: `/Users/exsmund/.codex/generated_images/01a0dfd8-247d-7662-9197-dc693b1f8781/exec-86ffca94-9741-436d-be78-743519a3c739.png`.
Actual RGBA, transparent exterior and limb gaps. The generator's preview can display RGB hidden under zero alpha; the app uses alpha.

References: `public/ui/equipment-silhouette-neutral.png` for clothing and pose; approved five-tab mockup `exec-f2bff64d-a4f6-4bb6-9f53-5d2e8a0811cb.png`; all three `refs/image1.png`, `image2.png`, `image3.png` for material/style. This is a UI mannequin, not a new hero portrait or approved character identity.

Prompt:

Use case: stylized-concept. Generate a new production game UI equipment mannequin sprite, isolated on genuine transparent RGBA background. References: image1 is the existing mannequin for pose and clothing; image2 is the approved UI context, use only mannequin appearance in equipment tab; image3 gives weight and old bronze material rendering, image4 main sculptural gothic style and graphite palette, image5 linen fabric detail. One full-body neutral adult androgynous organic human-shaped faceless fitting mannequin, wearing simple dark faded grey-brown linen long-sleeve tunic, trousers and soft plain ankle boots. Same quiet front-facing stance as existing mannequin, arms relaxed slightly away from sides, both hands visible, feet shoulder-width. Human proportions, no robot joints, no wood, no stone golem. Head smooth and featureless as this is an equipment placeholder, not a character portrait. Sculptural convincing volume, fine aged woven linen, subtle folds, directional light from upper front-left, deep shadows, muted charcoal grey taupe highlights. No weapons, armor, equipment, jewelry, belts, bags, accessories, frame, UI slots, lettering, ground, backdrop, floor shadow, glow or checkerboard. Full figure head to toes inside canvas with 5% vertical margins, slender centered silhouette. Portrait canvas 2:3. Background and gaps between limbs are fully transparent.

## Window stone

Asset: `character-slate-v1.png`.
Original: `/Users/exsmund/.codex/generated_images/01a0dfd8-247d-7662-9197-dc693b1f8781/exec-b6a72a99-8bbe-4950-b683-f123cdd6cb86.png`.
Reference: approved five-tab mockup listed above.

Prompt:

Use case: stylized-concept. Production UI background texture for the approved game character-window mockup attached as sole reference. Generate ONLY its subtle cracked dark charcoal olive-black stone surface, without any UI. Square, flat straight-on evenly detailed material texture, fine irregular intersecting mineral veins and restrained shallow relief, sparse worn details. Match the almost-black low contrast graphite/olive slate inside the mockup's character panels and title/header panels. NOT brown leather, no pores or cloth weave. No metal edges, frames, corners, buttons, symbols, letters, characters, vignettes or lighting hot spots. The surface fills the whole image edge to edge, designed to tile behind readable ivory text, high quality detailed low-contrast game texture.

## Shared styling

Window/header/navigation use the same stone component and nine-slice gothic frame. Portraits in the hero tab use the separate portrait frame. Dividers and selected-tab markers share a single unframed metal highlight sampled from the original gothic frame, fading toward the ends in a shader. Header and footer use the same highlight. No baked image edits. Canonical sources remain untouched.

Prata remains the display font; `../fonts/Prata-UI.tres` uses a FontVariation with 0.15 emboldening. Body remains Golos Text. Shard counters use one component, with the visible icon 1.24× the numeral ink height, centered on the numeral ink.


Refinement: taller header and darker footer; portrait fits its original aspect ratio wholly inside the frame. Attribute values use Prata with only the proposed number green. Menu actions share the character-page action height and fit scale. Skills have larger tiles with smaller gaps; the equipment divider is hidden in landscape.

Follow-up: skill section has explicit vertical gaps, shared slot backgrounds have an inset shadow, dividers are subdued, square controls reuse a slightly thicker rim from their own texture. The attribute price displays `quote.nextCost` (one further point); the remaining shard counter still deducts the full pending batch.

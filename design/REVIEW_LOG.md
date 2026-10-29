# Design review log

## Round 1 (player, builder, art & sound director)

30 findings (6 must-fix). Full condensed findings: `.gamegen/review-round1.md`.

| Finding | Severity | Outcome |
|---|---|---|
| P1/B1 boss gaps unsurvivable at 4x | must-fix | Fixed: BOSS_SPEED 1.4 + 0.1/stage, heat updraft while Hades is away, autopilot regression |
| P2 hits need no skill | should | Fixed: middle 60% of face hits, edges deflect; >300 px drop = CRITICAL bonus |
| P3 dying at Hades wastes a run | should | Fixed: one "Persephone's blessing" rescue per fight |
| P4/B6 touch offset breaks taps | should | Fixed: quick tap places at finger, holds lift ghost 70 px; mouse places on down; no cancel |
| P5 cooldown drops taps | should | Fixed: every tap buffered, latest wins |
| P6 seed respawn too slow | should | Fixed: 8 s after miss, 15 s after collect, spawn 500–800 px below |
| P7 fireballs burn ramps in gaps | should | Fixed: fizzle when Hades sinks |
| P8/B2 boss intro has no pom rule | must-fix | Fixed: golden bubble, 2.5 s intro, fresh ledge + Get Ready; one death rule |
| P9 how-to cards slow the start | nice | Fixed: in-world hint + toasts; cards in How to Play |
| P10/B4/A5 playbackRate chipmunk | should | Fixed: cap 1.12 + descent-fast track at 2.5x; boss 1.00→1.08 |
| B3/A2 imagegen2 size limits | must-fix | Fixed: "generate at" column, trim + downscale; ramp cap + mid slices |
| B5 autopilot unspecified | should | Fixed: spec + fastForward/setTime + seed regression |
| B7 fixed 960 height wastes phone | should | Fixed: H = clamp(540·vh/vw, 960, 1170); portrait lock + rotate overlay |
| B8/A3 Hades stages misalign; no character sheet | must-fix | Fixed: character sheets; alignment with Pillow; ellipse as sprite fractions |
| B9 tiling | nice | Fixed: Pillow seamless + stacked check |
| B10 constants | nice | Fixed: ported-constant table, curve stated as deliberate |
| A1 nanogen edit mode | must-fix | Fixed: title art from text first, then reference for other backgrounds |
| A4 red on red | should | Fixed: lapis bumper, plum depth tint, gold rims, fixed code highlight |
| A6 music loops | should | Fixed: no-intro prompts, loop windows, one-shot victory |
| A7 missing sounds | should | Fixed: 27 SFX incl. fire ambience |
| A8 unlisted visuals | should | Fixed: coin/flower sheet; rest assigned to code |
| A9 background size | should | Fixed: nanogen pro 9:16 2K |
| A10 thin image budget | nice | Fixed: ~35 images, ~$16.5 total |

## Round 2 (player, builder, art & sound director) — refined by the director

1 must-fix, ~14 should-fix. Converged after this round (the setting allows 2).

| Finding | Severity | Outcome |
|---|---|---|
| Tap vs hold at 110 ms is unpredictable | should | Fixed: hold = moved ≥ 12 px or held ≥ 280 ms; place at the ghost only once it has fully lifted, else at the finger |
| Hades reachable? last seeds at 4x with fixed 0.3 s cooldown | should | Fixed: cooldown = max(0.15, 0.3/√speed); gap after seed 4+ is 10 s; regression: autopilot reaches 6 seeds in ≥ 10/20 seeds |
| Arena ramp rules (cap crumbles the pom's ramp; ramps inside rising Hades; spent ramps) | should | Fixed: never crumble the ramp the pom is on; ramps overlapping his ellipse crumble when he starts rising; arena ramps stay solid until crumbled |
| Touch players can't see NEXT near the pom | should | Fixed: faint next-piece glyph beside the pom on touch, with cooldown fill |
| Hitbox holes (inside face, lower-half side contact, image box) | must-fix | Fixed: rising crumbles overlapping ramps; lower-half contact deflects outward and never kills; Hades checked before ramps; ellipse measured on the shipped image |
| Hades stages drift | should | Fixed: inpainting mask + Pillow face paste onto hades-1 |
| Music memory (~130 MB) / music waits for every file | should | Fixed: staged loading (title+sfx first, then descent; fast/hades/victory on demand), title buffer freed in play |
| Core vs design mismatches | should | Fixed: buffered tap stored in world coords; death line H−60 (fire band); critical/blessing sounds added; fastForward runs silently. Kept: bumper force scales with speed (as the original) |
| Autopilot can't clone the world / no gap telemetry | should | Fixed: autopilot predicts with updraft and Hades; boss records gaps survived and death cause in state() |
| Loop points need a decoder | should | Fixed: trim leading/trailing silence at decode time in the browser; loop over the trimmed window |
| SFX < 0.5 s not allowed | should | Fixed: request 0.5 s, trim onset in code |
| Two style anchors never compared | should | Fixed: walls use the title art as reference; I compare pom over title art before build |
| Hades dark on dark | should | Fixed: rim light + gold crown in prompt, code glow behind his head |
| Ramp middle seams | should | Fixed: middle slice made seamless in Pillow, checked x4 |

## Final review (playtester, bug hunter)

| Finding | Severity | Outcome |
|---|---|---|
| Boss soft-lock: pom trapped below his shoulder, never dies | must-fix | Fixed: only his head keeps the fire off; opening ledge now drops the pom onto his nose (free first bonk); regression checks for a pom stuck below the fire line (none in 12 seeds) |
| Audio unlock only on pointerdown (phones) | should | Fixed: also on pointerup/touchend/click; resume whenever not running |
| Multi-touch places extra ramps | should | Fixed: only the first finger aims and places |
| Audio plays in background tab | should | Fixed: context suspended while hidden |
| HUD under the notch | should | Fixed: safe-area insets read via a probe element; HUD and NEXT card offset |
| One exception kills the loop; 0×0 viewport | should | Fixed: rAF scheduled first, tick/draw guarded; resize ignores 0 sizes |
| pointercancel swallows next tap | should | Fixed |
| NEXT card hides the pom in the arena | should | Fixed: card is half-transparent during the fight |
| Victory music at boss rate | should | Fixed: rate reset to 1 |
| How-to doesn't explain "middle of the face" | should | Fixed: text + glowing band on the card |
| H changes mid-run on resize | nice | Fixed: only recomputed outside a run |
| Rotate overlay doesn't block taps | nice | Fixed |
| First-run hint repeats | nice | Fixed |
| Victory lacks breakdown | nice | Fixed: seeds · bonks · Persephone bonus line |
| "Into the Fire!" swash glyphs | nice | Fixed: plain font |
| Seed sockets hard to read | nice | Fixed: bigger seeds, gold socket rings, "x/6" on the board |

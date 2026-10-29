# Assets and spending

Prices (looked up 2026-10-29):
- imagegen2 (GPT Image 2.5 Flare): $30 / 1M image output tokens, $8 / 1M image input tokens, $5 / 1M text input (OpenAI model page). Estimate = tokens × rate, rounded up.
- nanogen: pro 1K/2K $0.134, flash 1K $0.034 (nanogen SKILL.md).
- audiogen: music ~$0.30/min, sfx ~$0.12 each (audiogen SKILL.md).

Budget: $20. Warn at $16.

| ID | File | Tool | Prompt (short) | Tries | Est. cost |
|---|---|---|---|---|---|
| pom (anchor) | game/assets/sprites/pom.png, style-anchor.png | imagegen2 high 1024² | crimson pomegranate, gold rim, flat light | 1 | $0.06 |
| pom-gold | sprites/pom-gold.png | imagegen2 edit, medium | golden version of anchor | 1 | $0.02 |
| ramp | items/ramp-cap.png, ramp-mid.png | imagegen2 1536×512 medium + Pillow (seamless mid) | marble beam, bronze caps | 1 | $0.02 |
| bumper-s/m/l/j | items/bumper-*.png | imagegen2 medium ×4 | lapis shield, teal medallion, amethyst orb, laurel coin | 4 | $0.09 |
| seed | items/seed.png | imagegen2 medium | ruby aril | 1 | $0.02 |
| fireball | items/fireball.png | imagegen2 low | upward flame | 1 | $0.02 |
| coin + flower | items/coin.png, flower.png | imagegen2 low (one sheet) | coin, anemone | 1 | $0.02 |
| laurel | ui/laurel.png | imagegen2 low | laurel wreath | 1 | $0.02 |
| title-art | bg/title.jpg | nanogen pro 9:16 2K | underworld vista, text-only | 1 | $0.14 |
| bg-far | bg/bg-far.jpg | nanogen pro edit of title + Pillow seamless | dark cavern wall | 1 | $0.14 |
| victory-bg | bg/victory.jpg | nanogen pro edit of title | cavern in spring | 1 | $0.14 |
| walls | bg/walls.png | imagegen2 1024×1536 medium + Pillow | rock strip, mirrored | 1 | $0.03 |
| music ×5 | audio/music/*.mp3 | audiogen music | title, descent, descent-fast, hades, victory (≈ 5.6 min) | 5 | $1.73 |
| sfx ×27 | audio/sfx/*.mp3 | audiogen sfx | 27 effects (41 takes) | 41 | $4.92 |
| hades-1 | sprites/hades-1.png | imagegen2 high 1536×1024 | stern Hades, character sheet | 1 | $0.05 |
| hades-2..5, hit | sprites/hades-*.png | imagegen2 inpaint (face mask) + Pillow paste | angrier stages, dazed | 5 | $0.27 |
| persephone ref | (candidates) | imagegen2 high 1024×1536 | Persephone, character sheet | 1 | $0.05 |
| persephone-joy | sprites/persephone/persephone-0..3.png | anim8gen 4 frames | celebration loop | 5 calls | $0.28 |
| icons | favicon, apple-touch, icon-192/512/maskable | code (Pillow from anchor) | — | — | $0 |

**Total: ≈ $8.0 of $20** (estimate: images ≈ $1.35, audio ≈ $6.65). Never reached the 80% warning.

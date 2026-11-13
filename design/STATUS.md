# Pomegranate Panic 2 — status

## Requests (as typed)

> We want to make Pomegranate Panic 2. It's based on https://pomegranatepanic.synapticnoise.com/. https://github.com/zeveck/pomegranatepanic. We want the same basic game idea, but with better graphics and sound fx and there should maybe be a tiny cooldown if you spam placement too fast. Also, if you get all 6 pomegranite seeds you should get to "fight" Hades. My idea there is that a Hades face will come up and fill the bottom of the screen and you just let yourself bounce off him, which throws you back up, and Hades vanishes for a bit then comes back, and gets angrier each time, and you do that enough times to defeat him and free Persephone or something. The music should probably get faster as the game does and there should be boss music. There should probably be the ability to capture your high score locally if you want and you're above a certain reasonably high threshold. Maybe it keeps top 5 with initials after you clear 10000 points or something. High score would probably care how many seeds you had and whether you beat hades.

> /gamegen --feedback on --publish --no-confirm

(Run for the owner on 2026-11-13.)

## Settings

- Platform: both (desktop + mobile) · Target: web · Scope: medium · Budget: $20 · Rounds: 2
- Game folder: /workspaces/gg-test3 (was empty apart from tooling)
- Feedback: on
- Published: https://pomegranatepanic2.synapticnoise.com/ (repo zeveck/pomegranatepanic2) · making-of: on · credit: Rich Conlan

## Available

- OpenAI (imagegen2, anim8gen): ok
- Gemini (nanogen): ok
- ElevenLabs (audiogen): ok — restricted key, **paid plan** (mp3_44100_128 worked on the first sound) → no ElevenLabs credit line
- node ok, python3 + Pillow ok (installed Pillow 13.0.0), playwright-cli ok

## Phases

- [x] 1 Brief — design/BRIEF.md written (14-item ask checklist)
- [x] 2 Design — GAME_DESIGN.md v1: endless descent + 5-hit Hades boss, tiered top-5 board
- [x] 3 Design review — 2 rounds (30 + 15 findings), all resolved; see REVIEW_LOG.md
- [x] 4 Assets — 24 images, 1 animation (Persephone 4 fr), 5 songs, 27 sfx; ≈ $8.0 spent (see ASSETS.md)
- [x] 5 Build — core, art+sound, boss, all screens, saving, install/offline, juice; boss regression 6/12 wins + no gap deaths
- [x] 6 Play-test — desktop 1280×800 & 800×600, iPhone 15 portrait + landscape overlay, touch/multi-touch, keyboard initials, pause/mute/resize, offline (?sw=1), no console errors; boss regression 8/12 wins, no soft-locks
- [x] 7 Final review — 1 must-fix (boss soft-lock) + 15 others, all fixed and re-tested
- [x] 8 Wrap up — README, social card, Pages workflow, served on localhost
- [x] Change (2026-11-13): "Report a bug" (feedback on) on the title and pause menus (mouse, touch, ↑/↓ + Enter), Ctrl+Shift+F shortcut, form themed purple and gold; play-tested at 1280×720, 800×600, iPhone 15 upright and sideways; boss runs (seeds 1–12) and full runs (seeds 11–20) replayed with 0 accidental opens, full runs identical to before the change; published

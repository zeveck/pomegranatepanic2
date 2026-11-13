# Pomegranate Panic 2: Seeds of the Underworld

*Six seeds. One very angry god. Keep rolling.*

## Pitch

A pomegranate tumbles endlessly down through the underworld and you keep it
alive by slapping marble ramps under it. Big drops bounce for combos, bumpers
ring like pinball, and the whole thing keeps speeding up, music included. Grab
all six of Persephone's stolen seeds and Hades rises out of the fire to fill
the bottom of the screen: bounce off the middle of his face five times,
surviving the gaps while he sinks away and comes back angrier, and Persephone
goes free.

## Settings

- Platform: both (desktop mouse, phone touch, portrait)
- Target: web (plain HTML + JS ES modules, no build step)
- Scope: medium
- Budget: $20 for generated art and audio (plan ≈ $16)
- Tools available: imagegen2 + anim8gen (OpenAI), nanogen (Gemini), audiogen
  (ElevenLabs, plan unknown: settle with the first audio per asset-guide.md),
  Pillow, playwright-cli
- Decisions made on the player's behalf:
  - Built fresh, keeping the original's rules and tuning from its numbers
    (ported constants listed under Structure). The speed curve is deliberately
    new (see below).
  - Seeds keep spawning (one at a time) until you hold six, so the boss is
    reachable by skill. Missing a seed costs 8 s, not the run.
  - Cooldown ("maybe"): yes, 0.3 s, visible refill, and every tap during it is
    buffered (latest wins), so no tap is ever silently lost.
  - The boss arena runs at its own fixed speed, not the run's speed, so the
    fight is about aiming, not about surviving a 4× scroll.
  - One rescue per boss fight ("Persephone's blessing").
  - Persephone ("or something"): yes, she's freed in the victory scene.
  - Beating Hades ends the run in a victory (a run has an ending now).
  - Leaderboard is ranked by achievement tier first, then score (see below).
  - Phones play in portrait only; landscape phones see a "turn your phone"
    overlay.

## The player's fantasy

You are the panicked guardian angel of a very round fruit, frantically
building a staircase out of thin air under it, and then you get to humiliate
the god of the dead by bouncing a pomegranate off his nose.

## Core loop

- **10 s:** watch where the pom is heading, read the NEXT piece (angle,
  length), tap to drop a ramp in its path; sometimes deliberately leave a gap
  so it drops far and bounces for points, or steer it into a bumper.
- **1 min:** speed climbs, bumpers and a seed appear below (a "↓" arrow warns
  ~2 s ahead); you route the pom to the seed (+points, +speed). The music
  gets audibly quicker, then switches to a faster track.
- **Session:** chase a higher score, collect all six seeds, beat Hades, get
  your initials on the top-5 board with seed pips and a laurel.
- **The mechanic the game lives or dies by:** a ramp appearing exactly where
  you tapped, instantly, and the pom rolling off it believably.

## Controls

Desktop:

| Action | Mouse | Keyboard |
|---|---|---|
| Aim ramp | move the mouse (ghost ramp follows the pointer exactly) | — |
| Place ramp | left mouse **down** (as the original) | — |
| Pause | on-screen pause button | Esc or P |
| Mute music / sound | on-screen buttons | M (toggles both) |
| Menus | click buttons | Enter / Space = primary button; ↑/↓ pick a button on the title and pause menus, then Enter / Space; type letters in initials entry, Backspace, Enter |
| Report a bug | "Report a bug" on the title and pause menus | Ctrl+Shift+F, from anywhere (pauses first) |

The bug report shortcut keeps F: no game action uses F, and the game ignores
every key pressed with Ctrl, so Ctrl+Shift+F can't type an initial or reach
the game. (Every letter is a game key in initials entry, so no letter would
avoid that; the Ctrl is what keeps it apart.) While the report form is open,
the game ignores all keys and touches.

Touch (portrait):

| Action | Touch |
|---|---|
| Quick tap (< 110 ms and < 12 px movement) | ramp placed **at the finger** on lift (as the original, which placed at the release point) |
| Hold or drag (≥ 110 ms or ≥ 12 px) | ghost ramp eases (over 100 ms) to 70 logical px **above** the finger so the finger never hides it; ramp placed at the ghost on lift |
| Pause / mute | bronze roundel buttons top-right, 72×72 logical (≥ 52 CSS px on a 390-wide phone) |
| Initials | big ▲/▼ letter wheels and a ✓ button; typed letters also accepted |
| Report a bug | "Report a bug" on the title and pause menus |

There is no cancel gesture: every lift places a ramp (as the original).
Multi-touch: only the first active pointer aims; others are ignored until it
lifts.

Orientation: portrait, because the game is a vertical descent. The manifest
locks portrait. On a phone held landscape (`pointer: coarse` and width >
height) a full-screen "Turn your phone upright" overlay shows and the game
pauses. Desktop windows of any shape letterbox the portrait play area.

**Cooldown:** after a ramp is placed, the next can be placed 0.30 s later.
During the cooldown the ghost ramp is grey and the NEXT card shows a radial
refill. Any placement during the cooldown is **buffered** at its world
position and fires the moment the cooldown ends. If another tap arrives while
one is buffered, the newer one replaces it (latest wins), a soft stony "tk"
plays and the ghost wobbles. A buffered placement whose world position has
scrolled above the top of the screen is dropped.

## Structure and difficulty

One endless run with three acts, plus the boss.

1. **The Descent (0–~60 s).** Wide margins. Small and medium bumpers from 8 s.
   First seed at 15 s. Learn ramps and bounces.
2. **Deeper (~60–150 s).** Large bumpers; golden jackpot bumper possible
   (≥ 45 s apart). Background tint shifts toward plum/magenta with depth.
3. **The Pit (beyond).** Speed at or near the 4.0× cap; bumpers spawn more
   often (interval 2–5 s → 1.5–3.5 s).
4. **Hades (on the 6th seed).** See below. 5 hits to win.

### Speed (deliberately new)

The original used `1 + 0.06·t`, uncapped, and its "+1× per seed" was
overwritten on the next frame (index.html line 1002), so seeds never sped it
up. This game uses, recomputed every frame:

`speed = min(4.0, 1 + 0.03·t + 0.15·seeds)` (t = seconds of play, excluding
pause and boss).

In the boss arena `speed` is replaced by `BOSS_SPEED = 1.4 + 0.1 × (5 − hp)`
(1.4 at the first stage, 1.8 at the last).

### Ported constants

Scale factor K = 1.35 (the original's `scale = min(w,h)/400`, for a 540-wide
logical screen). All in logical px and seconds:

| Constant | Original | Ours |
|---|---|---|
| Pom radius | 18 | 24.3 |
| Ramp lengths | 80 / 120 / 160 | 108 / 162 / 216 |
| Ramp angles | ±10 / 20 / 35° | same |
| Ramp thickness (hitbox) | 12 | 16 (drawn ~26 thick: top surface on the collision line, the extra depth hangs below and never collides) |
| Landing threshold | 12·s + 5 | 23 |
| Gravity | 800 | 1080 (constant, not scaled by speed, as original) |
| Base roll speed | 80 | 108; roll = 108·speed·(1 + 1.5·|sin θ|) |
| Camera min scroll | 0.7 × roll base × speed | 75.6·speed; camera keeps the pom 1/3 from the top as original |
| Bounce min drop | 80·s | 108; bounce vy = −min(1.2·drop, 945) |
| Wall bounce | 0.6 | 0.6 |
| Bumper radii S/M/L | 28 / 32 / 38 | 37.8 / 43.2 / 51.3 |
| Jackpot radius | 50 | 67.5, shrinks 15 % per hit, 5 hits |
| Bumper bounce force | 500 | 675 |
| Seed collect radius | 25 | 33.75 (+ pom radius) |
| Fire height (drawn) | 120 | 162 |

Physics runs on a fixed 1/120 s substep for stability.

### Screen size

Logical width is always **540**. Logical height `H = clamp(540 × viewportH /
viewportW, 960, 1170)`, so tall phones are filled (390×844 → 540×1169) and
anything wider letterboxes. HUD is anchored to the top, the fire line and
NEXT card to the bottom; the camera keeps the pom at H/3.

### Seeds

One seed on screen at a time. First at 15 s; the next spawns **8 s after a
miss** (seed scrolled above the screen) or **15 s after a collect**, until six
are held. Spawn 500–800 px below the screen bottom, x in the middle 70 %,
never within 90 px of a bumper; pulsing glow; a "↓" arrow at the screen
bottom edge over its x while it's below view (≈ 2 s warning). Each seed:
`+1000 × n` points (n = seed number) and +0.15 speed.

### Death rule (both modes)

The run is lost when the **pom's centre goes below the fire line**, which is
on screen at `H − 70` (the top of the dense flames). In the descent the
camera follows the pom, so this only happens when it falls faster than the
camera catches up (as the original). In the arena the camera is fixed, so
the fire line is fixed. 0.8 s flare, then Game Over (or the blessing, below).

Anti-frustration: generous landing threshold (as original), seed and bumper
hitboxes 15 % generous, the tap buffer, 1 s "Get ready" on the start ledge,
fixed boss speed with a heat updraft, one blessing per boss fight.

### Hades (the boss)

**Intro (on the 6th seed):**
1. The pom is caught in a golden bubble. The world pauses (pom, ramps,
   bumpers, seeds freeze; particles and effects keep running). The pom turns
   golden inside the bubble (2× points from now on, as the original).
2. Over **2.5 s**: the bubble floats to top-centre (270, HUD bottom + 180);
   the camera eases to a stop; remaining bumpers pop away; old ramps crumble;
   the fire swells; "The ground shakes…" text; boss music crossfades in; Hades
   rises from the fire.
3. A fresh start ledge (162 long, +10°) appears under the pom, the bubble
   pops, 1 s "Get ready!" (pom held), then the pom is released as the boss
   music's first bar lands.

**Arena rules:**
- Camera fixed. Rock walls left/right (wall bounce 0.6), soft ceiling at the
  HUD bottom (pom bounces off at 50 % speed).
- Speed = BOSS_SPEED (above).
- Max 4 ramps on screen; placing a 5th crumbles the oldest (dust puff).
- Hades is drawn 600×400 logical, centred, bottom edge at H + 30 (his lower
  15 % fades into flame behind the code-drawn fire), so he fills roughly the
  bottom 35–40 % of the screen.

**The cycle:**
1. **Risen.** Hitbox: an ellipse defined as fractions of the stage-1 trimmed
   sprite bbox (cx 0.50, cy 0.55, rx 0.42, ry 0.38), shared by all stages
   (art is aligned to it, see Art direction). Contact counts only on the upper
   half of the ellipse.
   - **Hit:** contact while the pom moves down (or rests) **and** the contact
     point is within the middle 60 % of the ellipse width (|dx| ≤ 0.6·rx). Pom
     launches with vy = −1000 (apex near the top), Hades flashes white,
     recoils, roars, shake 0.4 s, hit-stop 80 ms, "+2,500" pops. HP −1.
   - **CRITICAL!:** if the pom dropped > 300 px (measured from its last apex,
     as bounces are) before the hit: extra +5,000 and a bigger pop/shake.
     Points only; damage is still 1.
   - **Deflect:** contact on his brow or shoulder edges (outside the middle
     60 %): pom is knocked sideways (vx = ±300 away from centre, vy = −400),
     dull stone "clunk", no damage.
2. **Sinking (0.8 s).** He sinks into the flames (vanish sound). Hitbox off.
   **All fireballs fizzle** (small puff) the moment sinking starts.
3. **Away (3.0 s, −0.2 s per stage, floor 2.4 s).** Only fire below. A **heat
   updraft** is on from the start of Sinking until Hades is half risen:
   gravity × 0.55 and fall speed capped at 480 px/s, shown by rising embers
   and shimmer. Target: 3–4 good ramps cover a gap (tuned with the autopilot,
   see Tech plan). A heat line + rumble warns 1 s before he returns.
4. **Rising (0.8 s).** He rises, angrier. Hitbox live from halfway up
   (touching him while rising counts, a gift).

**Persephone's blessing:** once per boss fight, the first time the pom
crosses the fire line it's spat back up (vy = −1100, x nudged 60 px toward
centre), 1 s of shimmer, "Persephone's blessing!" text. A small flower icon
next to the HP pips shows it's available and fades when used.

**Anger stages** (art changes per stage; boss music rate steps 1.00, 1.02,
1.04, 1.06, 1.08):

| Stage (HP left) | Face | Behaviour |
|---|---|---|
| 5 | stern | sits still, waits |
| 4 | annoyed, eyes glowing | spits 1 fireball every 2.4 s while risen: arcs up with an ember trail, **burns any ramp it touches** (ramp crumbles), bounces off walls, fizzles after 2.5 s or when he sinks. Touching the pom knocks it sideways (no death). |
| 3 | angry, ember cracks in skin | drifts left–right ±90 px (2.5 s period), exposing fire at one side; fireballs every 2.0 s |
| 2 | furious, mouth open, flames from eyes | drift ±120 px, 1.8 s period; fireballs every 1.6 s, two at a time |
| 1 | rage, cracking apart | as stage 2, and he stays risen only 6 s before sinking on his own (no damage, a missed chance) |

**Defeat (HP 0):** he cracks, crumbles into ash and sparks, the fire gutters
out, light breaks from above, the pom floats up, flowers bloom up the screen,
victory music → **Victory screen**: Persephone (animated) freed, "Persephone
is free!", bonus +20,000 (×2 golden), final score, then initials entry if it
qualifies.

## Win, lose and progress

- Score = `floor(10 × seconds alive) + bonuses` (as original). Bonuses:
  bounce drops (`floor((drop − 108)/2.7)` × combo, combo up to ×10), bumpers
  50/100/150 (× depth multiplier `1 + floor(depth/2700)`), jackpot 1000/hit +
  5000 on the 5th hit, seeds 1000·n, Hades hits 2500, CRITICAL +5000, Hades
  defeat 20,000; all ×2 once golden.
- Lose: the death rule above → 0.8 s flare → Game Over.
- Win: defeat Hades → Victory.
- **High scores** (localStorage): top 5. A run qualifies if its final score is
  **≥ 10,000** and it ranks into the top 5. Ranking: runs that beat Hades
  above runs that didn't; among those, more seeds above fewer; then higher
  score. Each entry: 3 initials, score, seeds (0–6), beat Hades (bool), date.
  Qualifying shows "New high score! Save it?" with initials entry and
  **Save** / **Skip** (the "if you want" part). The board shows seed pips
  and a gold laurel for Hades victories. Below 10,000 it shows "Reach 10,000
  to make the board".
- Saved: scores, best score, music/sound mute, "seen help" flag. Key
  `pomPanic2.save` = `{ v: 1, scores: [], best, muteMusic, muteSfx, seenHelp }`.

## Screens

- **Title:** painted key art (cover-fit), game name drawn in the display
  font, pulsing "Tap to play", buttons: Play, High Scores, How to Play; mute
  buttons. Pom tumbling animation. First tap unlocks audio.
- **How to play:** 3 cards built in code from the game's sprites (pom on a
  ramp with a tap marker / bounce + bumpers / seeds → Hades face with the
  middle zone highlighted), tap to page. Reached from the title only; not
  forced on first Play.
- **First-run teaching (until `seenHelp`):** during the first Get Ready, an
  in-world hint: a pulsing finger icon below the pom and "Tap below the pom!".
  One-line toasts (2.5 s, top-centre under the HUD) on: first bounce ("Big
  drops bounce. Chain them!"), first seed ("Seed 1/6! Six summon Hades"),
  first boss ("Bounce on the middle of his face!").
- **HUD:** score (top-left, big), speed "×1.4" under it, six seed sockets
  (top-centre; code-drawn rings that fill with the seed sprite), pause + mute
  roundels (top-right), NEXT card (bottom-right, above the fire, code-drawn
  bronze frame) with cooldown wipe, combo pop-ups at the pom. Boss: Hades HP
  as 5 small flame pips (fireball sprite) under the seed row, blessing flower
  icon beside them. All inside safe-area insets.
- **Pause:** dimmed, Resume / Restart / Quit to title, mute toggles.
- **Turn your phone:** full-screen overlay on landscape phones; pauses play.
- **Game over:** pom spins, "Into the fire!", score, seeds x/6, best; initials
  entry if qualifying; Play again / Title.
- **Victory:** spring scene, Persephone animation, score breakdown, initials
  entry; Play again / Title.
- **High scores:** top 5 table with rank, initials, score, seed pips, laurel.
- **Settings:** music and sound toggles live on title, HUD and pause.

## Juice

Must-haves:
- Pom rolls with true rotation; squash on landing, stretch on bounce.
- Ramp placement: stone "thunk", ramp drops in 6 px with a dust puff.
- Floating score pop-ups, combo text growing with the combo, combo chime
  pitch rising per combo step.
- Bumpers: recoil scale + light flash + ring sound; jackpot shrinks per hit and
  bursts into coins.
- Seed collect: sparkle burst, chime, seed flies to its HUD socket.
- Fire at the bottom: animated particle flames (code); flare on death; quiet
  fire ambience loop.
- Hades: screen shake, hit-stop, white flash, roar, ember particles, heat
  shimmer warning before he rises, CRITICAL! burst, fireball ember trails.
- Music tempo rises with speed (capped rate + faster track), boss music steps
  per stage.
- Frequent SFX (land, bounce, bumper, place) get random pitch ±5 %.

Should:
- Parallax rock walls; ember particles drifting up; background tint toward
  plum with depth.
- Golden pom sparkle trail; golden bubble at the boss intro.
- Screen transitions (0.3 s fades).

Nice:
- Dust puff when a ramp crumbles; letter wheels "click".

## Art direction

- **Style line (paste into every image prompt):** "painted storybook
  illustration with a Greek-myth flavour, rich saturated colours, deep
  underworld indigo and violet, glowing ember orange, pomegranate crimson,
  polished gold accents, soft rim lighting, clean dark outlines, readable at
  small size, no text".
- **Style anchor:** the pomegranate hero (`game/assets/style-anchor.png`,
  also `sprites/pom.png`), made first with imagegen2, transparent, front
  view, **flat even lighting** (no strong painted highlight, since it rotates);
  the code draws a fixed highlight (top-left) and shadow (bottom-right) over
  it, plus a 2 px pale-gold rim outline.
- **Palette:** Styx indigo #1b1433, cave violet #3a2a5e, ember #ff7a1a,
  flame gold #ffd25a, pomegranate #c0182c, seed ruby #ff2e4d, marble
  #e9e2d4, bronze #b5713a, lapis #2f5fb3, rim gold #f3dc8a, spring green
  #7ad16b (victory only).
- **Readability (red on red):** small bumper is bronze with lapis-blue enamel
  (not red); depth tint goes toward deep plum/magenta, never orange-red;
  backgrounds are kept below ~25 % brightness behind play (code darkening
  overlay); pom and seeds get a pale-gold rim outline in code; seeds get a
  white glint.
- **Camera:** side view, vertical scroll. Logical 540 × H (960–1170), backing
  store × devicePixelRatio (capped 2.5). On a 390-wide phone at DPR 3 one
  logical px ≈ 2.2 device px, so sprites ship at ~2.2× their logical size.
- **Generation sizes:** imagegen2 only accepts edges that are multiples of 16,
  ratio ≤ 3:1 and 655,360–8,294,400 total pixels (generate.cjs `validateSize`),
  so every sprite is generated at 1024×1024, 1536×1024, 1024×1536 or 1536×512,
  then trimmed and Lanczos-downscaled with Pillow to the shipped size.
- **Ramps:** generated as one 1536×512 image of a marble beam with a rounded
  bronze end cap; cut with Pillow into an end cap and a plain veined-marble
  middle slice. Drawn ~26 px thick: cap + **repeated** (not stretched) middle
  slice + mirrored cap; thin gold trim lines along top and bottom are drawn in
  code (a fine Greek key would vanish at this size).
- **Characters (written sheets; no likeness of any film or game, in
  particular no blue flaming hair):**
  - **Hades:** "a stern ancient Greek god, olive-bronze skin, heavy black
    beard and thick black brows, obsidian crown set with glowing ember gems,
    ember-orange eyes, dark violet mantle with gold trim, head and shoulders,
    straight front view, symmetrical, his chin, beard and shoulders dissolving
    into flame at the bottom, transparent background".
  - **Persephone:** "a young Greek goddess, warm brown skin, dark braided hair
    with a crown of spring flowers, pale green chiton, pomegranate-red sash,
    gold armbands, joyful, full body, front three-quarter view, transparent
    background".
- **Hades stages:** hades-1 is generated first (1536×1024). Stages 2–5 and
  hit are imagegen2 edits of hades-1 at the same canvas with: "keep head
  position, size, crown and silhouette identical; change only the expression,
  glow and ember cracks: <stage>". **Alignment step (Pillow):** trim each to
  its alpha bbox, align on the crown top-centre to one shared 1536×1024
  canvas, compare outlines to hades-1 and reject any whose head outline
  shifts more than ~8 px (regenerate); fade the bottom 15 % of every stage to
  transparent; downscale all to 1152×768. The debug overlay (`?debug=1`)
  draws the hit ellipse and the middle-60 % band on every stage.
- **Consistency:** the pom anchor is the reference image for every imagegen2
  sprite (`--image`). **nanogen is never given the pom** (any `--image`
  switches nanogen to edit mode and would paint a pomegranate in): title-art
  is generated first from text only (style line + palette hex + "no fruit, no
  characters, no text"), `--model pro --aspect 9:16 --size 2K`; bg-far and
  victory-bg are then nanogen edits **of title-art** with "a new scene in
  exactly this painting style: …, no fruit, no characters, no text".
- **Seamless background:** nanogen can't tile, so bg-far is made seamless
  vertically in Pillow: offset by half its height, blend/repaint a ~120 px
  band over the seam, check three stacked copies by eye. Slow far parallax
  (0.25× camera). Walls get the same treatment.

## Audio direction

- **Title:** mysterious, warm underworld lullaby: lyre/harp arpeggios, soft
  low drone, light frame drum. 60 s loop.
- **Descent (main):** driving playful arcade groove with a Greek flavour:
  plucked bouzouki/lyre melody, hand percussion, walking bass, ~120 bpm. 90 s.
- **Descent-fast:** the same mood pushed harder: ~145 bpm, busier
  percussion, doubled bouzouki, more urgent. 90 s. Crossfaded in (1.5 s) when
  speed ≥ 2.5 (speed never falls within a run, so no switching back).
- **Hades:** dark, urgent orchestral boss fight: pounding drums, low brass,
  tremolo strings, menacing bouzouki riff, ~140 bpm. 75 s.
- **Victory:** bright spring triumph, flutes and harp, sunrise feeling,
  ending on a held final chord. 30 s, **one-shot** (not looped).
- **Every looping prompt** adds: "steady groove from the first bar, no intro,
  no ending, no fade-out", with `--force-instrumental` and `--length-ms`.
  audiogen music has no seamless-loop option (audiogen SKILL.md, Loop
  Caveat), so after generation a script picks loop points on bar boundaries
  (from the bpm, checked by ear/waveform) and stores them in
  `assets/audio/music/loops.json`; the game sets `loopStart`/`loopEnd` on the
  `AudioBufferSourceNode`. One retry budgeted per track.
- **Tempo:** Web Audio's `playbackRate` shifts pitch (no preserve-pitch on
  buffer sources, and web-target.md rules out `<audio>` for music), so it is
  capped small: descent rate smoothed toward `min(1.12, 1 + 0.05·(speed − 1))`;
  descent-fast `min(1.08, 1 + 0.053·(speed − 2.5))`; boss 1.00 → 1.08 by
  stage. Current track and rate are reported in `audioState()`.
- **SFX** (audiogen sfx, mp3; 0.3–3 s unless noted):
  1. ramp place (stone thunk)
  2. buffered tap replaced (soft stony "tk")
  3. land (soft thud)
  4. bounce (springy boing)
  5. combo chime (one sample, pitch stepped in code)
  6. bumper ring (bronze)
  7. jackpot hit (big bell)
  8. jackpot burst (coins)
  9. seed collect (sparkle chime)
  10. golden transform (shimmer swell)
  11. wall / ceiling / Hades-edge bump (dull stone clunk)
  12. fall into fire (whoosh + sizzle)
  13. game-over sting (~3 s descending)
  14. heat warning rumble (~1 s)
  15. ground shakes (boss transition, ~2.5 s)
  16. Hades rise (rumble + growl)
  17. Hades hit (gong + groan)
  18. CRITICAL (bright crack + choir stab)
  19. Hades vanish (fiery whoosh)
  20. fireball spit (fwoosh)
  21. fireball hits pom (sizzle pop)
  22. ramp burns / crumbles (crackle; also used for the arena 5th-ramp
      crumble and fireball fizzle)
  23. Persephone's blessing (rising harp swell)
  24. Hades defeat (crumble + roar fading)
  25. new high score (fanfare)
  26. UI click (also the letter-wheel click)
  27. fire ambience (`--loop`, ~10 s, quiet, under all gameplay)

## Asset list

| ID | What it is | Tool | Generate at → ship | Transparent | Animation | Priority |
|---|---|---|---|---|---|---|
| pom | Pomegranate hero, style anchor, flat lighting | imagegen2 high | 1024² → trim → 128² png | yes | rotated in code | must |
| pom-gold | Golden pomegranate | imagegen2 medium (edit of pom) | 1024² → 128² png | yes | code | must |
| ramp | Marble beam + bronze end cap → cap + middle slice | imagegen2 medium | 1536×512 → cap 64×64, middle 128×64 png | yes | — | must |
| bumper-s | Bronze shield, lapis-blue enamel | imagegen2 medium | 1024² → 192² png | yes | code recoil | must |
| bumper-m | Teal glazed ceramic medallion | imagegen2 medium | 1024² → 192² png | yes | code | must |
| bumper-l | Amethyst orb in gold ring | imagegen2 medium | 1024² → 224² png | yes | code | must |
| bumper-j | Golden laurel coin jackpot | imagegen2 medium | 1024² → 320² png | yes | code | must |
| seed | Glowing ruby seed (rim + glint added in code) | imagegen2 medium | 1024² → 96² png | yes | code pulse | must |
| fireball | Hades fireball (also HP pip) | imagegen2 low | 1024² → 96² png | yes | code flicker + ember trail | must |
| hades-1 | Hades stern (character sheet prompt) | imagegen2 high | 1536×1024 → aligned → 1152×768 png | yes | code bob/shake | must |
| hades-2..5 | annoyed / angry / furious / rage | imagegen2 high (edits of hades-1) | 1536×1024 → aligned → 1152×768 png | yes | code | must |
| hades-hit | dazed/hurt | imagegen2 high (edit) | 1536×1024 → aligned → 1152×768 png | yes | — | should |
| persephone | Persephone reference (character sheet prompt) | imagegen2 high | 1024×1536 → 384×576 png | yes | — | should |
| persephone-joy | Persephone celebrating, 4 frames | anim8gen (ref: persephone) | 1024×1536 frames → 320×480 sheet | yes | 4 fr loop, 6 fps | should |
| coin-flower | Gold coin + 3 spring flowers on one sheet, sliced | imagegen2 low | 1024² → 4 × 64² png | yes | code particles | should |
| laurel | Gold laurel icon for board | imagegen2 low | 1024² → 64² png | yes | — | should |
| walls | Left rock wall with stalactites (right = mirror), seamless | imagegen2 medium | 1024×1536 → crop → 192×1152 png | yes | code parallax | should |
| title-art | Title key art, text-only prompt, no fruit/characters | nanogen pro | 9:16 2K → 1152×2048 jpg | no | — | must |
| bg-far | Underworld cavern, edit of title-art, made seamless | nanogen pro | 9:16 2K → 1080×1920 jpg | no | code parallax | must |
| victory-bg | Spring breaking into the underworld, edit of title-art | nanogen pro | 9:16 2K → 1152×2048 jpg | no | — | should |
| icons | favicon, apple-touch, 192, 512, maskable | code (Pillow, from pom) | png | — | — | must |
| social-card | 1200×630 | code (HTML screenshot) | jpg | — | — | must |
| font | Cinzel Decorative + Nunito (OFL, with licenses) | bundled | woff2 | — | — | must |
| how-to cards | 3 cards | code (from sprites) | — | — | — | must |
| HUD pieces | seed sockets, NEXT frame, pause/mute roundels, ↓ arrow, seed pips | code (+ seed/fireball sprites) | — | — | — | must |
| fire, dust, debris, bubble | particles and effects | code | — | — | — | must |
| music ×5 | title 60 s, descent 90 s, descent-fast 90 s, hades 75 s, victory 30 s | audiogen music | mp3, loop points in loops.json | — | loop (victory one-shot) | must (descent-fast, victory: should) |
| sfx ×27 | listed under Audio (26 + fire loop) | audiogen sfx | mp3 | — | fire: loop | must (most) |

About 22 generated images (+ retries), 1 animation, 3 nanogen backgrounds,
5 songs, 27 sound effects.

## Tech plan

```
game/
  index.html          canvas + CSS; meta, manifest, icons
  js/main.js          boot, loop (fixed 1/120 s physics substeps, accumulator, clamp), screens
  js/input.js         pointer (mouse/touch) → aim/tap/hold/place, tap buffer, keys, buttons
  js/audio.js         Web Audio: buffers, loop points, crossfades, playbackRate, mute
  js/world.js         pure step(world, dt): pom, ramps, bumpers, seeds, camera, scoring
  js/boss.js          Hades state machine, hitbox, fireballs, updraft, blessing
  js/autopilot.js     test-only bot (spec below)
  js/render.js        drawing, particles, HUD, debug overlay
  js/ui.js            title, help, toasts, pause, game over, victory, scores, initials
  js/save.js          localStorage (versioned, try/catch)
  js/rng.js           seeded RNG (mulberry32)
  manifest.webmanifest (orientation: portrait), sw.js, icons, social-card.jpg, fonts/, assets/
```

- ES modules, no libraries.
- **Scaling:** canvas fills the window; logical 540 × H (H from the viewport
  as above), fitted by letterbox, backing × devicePixelRatio (capped 2.5).
  Recomputed on `resize`/`orientationchange`; H changes only between runs or
  on the title/pause (mid-run it keeps the run's H and letterboxes). Pointer
  coords mapped back to logical. HUD inside safe-area insets.
- **World:** `step(world, dt)` is a pure function of the world state, input
  events and the seeded RNG; rendering only reads it. Everything random comes
  from one per-run RNG (`?seed=` or the hook), so runs replay exactly.
- **Input:** desktop places on `pointerdown` (mouse). Touch tracks the first
  pointer; on `pointerup` decides tap vs hold/drag (110 ms / 12 px) and places
  at the finger or the lifted ghost. Placement goes through one
  `requestPlace(worldX, worldY)` that applies the cooldown buffer.
- **Audio:** decode all buffers after the first gesture; music in a gain
  chain with crossfades; descent ↔ descent-fast ↔ hades crossfades; rates
  smoothed (time constant 0.5 s) within the caps above; music ducked on
  pause; fire ambience on its own gain; never two copies of a track.
- **Save:** `pomPanic2.save`, versioned JSON.
- Pause on `visibilitychange`/`blur` and on the landscape overlay.
- **Debug hook** `window.__game`:
  - `state()` → `{screen, t, score, speed, seeds, H, boss: {stage, hp, phase,
    blessingUsed}, pom: {x, y, vx, vy}, ramps, cooldown, buffered, gameOver,
    won}`
  - `newRun(seed)`, `giveSeeds(n)`, `startBoss()`, `bossHit()` (shortcut to
    later stages), `setTime(t)` (sets the play clock; speed follows)
  - `setAutopilot(on)`
  - `fastForward(seconds)`: runs fixed 1/120 s steps in a loop without
    rendering, with the autopilot on, and returns `state()`.
  - `audioState()` → `{context, musicMuted, sfxMuted, track, rate}`
- **Autopilot spec:** it only acts through `requestPlace` (so the cooldown
  and NEXT piece apply), with a 0.15 s reaction delay. Each time the cooldown
  is ready and no ramp is under the pom's predicted path: clone the world,
  forward-simulate with no new ramps for up to 1.5 s, take the pom's
  predicted position 0.4 s ahead (or 0.2 s before it would cross the fire
  line, if sooner), and place the NEXT ramp so its surface is 30 px under
  that point, shifted so the pom lands on the uphill third and rolls toward
  the screen centre (or toward a visible seed). In the arena it stops placing
  while Hades is risen/rising and the pom is above his middle zone, and steers
  toward the middle zone otherwise.
- **Regression checks** (play-test): for `?seed=1..20`, `startBoss()` then
  `fastForward(120)`: the autopilot survives every Away gap at every stage in
  ≥ 18 of 20 seeds and wins in ≥ 15 (tune updraft, Away and BOSS_SPEED until
  it does); `newRun(seed)` + `fastForward(240)` never throws and reaches ≥ 4
  seeds in most runs. Two recorded seeds are kept as fixed replays.

## Cut list

In order:
1. Persephone animation (use the still Persephone image, bobbing in code).
2. hades-hit face (flash the current face white instead).
3. Victory background (code-drawn gradient + flowers).
4. Parallax walls layer (code-drawn dark rock edges).
5. descent-fast track (descent rate cap only).
6. Stage 1's "sinks on his own" rule; stage 1/2 behaviour merges.
7. Fire ambience loop.
8. Victory music (reuse title theme).
9. Separate music/sound toggles (one mute).
10. How-to illustrations (text-only cards).

## Budget estimate

imagegen2 reports token usage but no prices: look up OpenAI's current GPT
Image 2.5 pricing once at the start of asset work and record it with the date
in `design/ASSETS.md`. Planning figures (gpt-image-class rates, rounded up):

- imagegen2 ~35 images incl. retries (high: pom, Hades ×6, Persephone with 2–3
  tries each for Hades; medium: bumpers, ramp, walls, pom-gold, seed; low:
  fireball, laurel, coin-flower): ≈ $6.5
- anim8gen 1 animation (~10–12 imagegen2 frame tries): ≈ $1.5
- nanogen pro 2K: 3 backgrounds × 2 tries + 1 seam repaint ≈ 7 × $0.134: ≈ $1
- audiogen music 5 tracks ≈ 5.75 min × $0.30, plus one retry each: ≈ $3.5
- audiogen sfx 27 + ~6 retries × $0.12: ≈ $4
- **Total ≈ $16.5** of $20 (≈ $3.5 headroom). At 80 % ($16) get thrifty per
  asset-guide.md.

## Definition of done

- [ ] Starts with no console errors at desktop 1280×800 and phones 390×844
      and 360×640; on 390×844 the play area fills the screen (H ≈ 1169).
- [ ] Landscape phone shows the "turn your phone" overlay and pauses; desktop
      letterboxes.
- [ ] Quick taps place ramps at the finger; holds/drags place at the lifted
      ghost; desktop places on mouse down. Cooldown buffers taps (latest wins,
      "tk" on replace); no tap is silently lost.
- [ ] Pom rolls, falls, bounces, combos; bumpers and the jackpot work; seeds
      appear until six are held (8 s after a miss, 15 s after a collect).
- [ ] Speed follows the formula; music audibly speeds up and switches to the
      fast track at speed 2.5; rate never exceeds 1.12.
- [ ] Sixth seed → bubble intro (pom frozen, 2.5 s), Hades rises, boss music,
      Get Ready on a fresh ledge.
- [ ] Hits count only in the middle zone; edges deflect; CRITICAL on > 300 px
      drops; fireballs fizzle when he sinks; blessing rescues once.
- [ ] Autopilot regression: survives Away gaps in ≥ 18/20 seeds and wins in
      ≥ 15/20; Victory screen with Persephone.
- [ ] Pom centre below the fire line ends the run (descent and arena, after
      the blessing in the arena).
- [ ] First run shows the Get Ready hint and toasts once; How to Play cards
      reachable from the title.
- [ ] High score: ≥ 10,000 and top 5 → initials entry (save/skip) on both
      platforms; tiered ranking; persists across reloads.
- [ ] Pause, resume, restart, mute (M + buttons) all work; mute persists.
- [ ] Installs as an app (manifest + icons, portrait) and works offline
      (`?sw=1`).

## Round 2 decisions (these override anything above)

- Touch: a hold is decided by movement ≥ 12 px or 280 ms; only then does the ghost ease up 70 px. The ramp goes to the ghost only if it had fully lifted, otherwise at the finger.
- Cooldown = max(0.15, 0.30/√speed). Seed gap after the 4th+ collect: 10 s.
- Buffered taps are stored in world coordinates.
- Death line: pom centre below H − 60 (both modes).
- Arena: ramps don't fade when passed (stay until crumbled); the 4-ramp cap never crumbles the ramp the pom is on; when Hades starts rising, ramps overlapping his ellipse crumble; lower-half contact with his ellipse deflects outward (vx ±300, vy −200) and never kills; Hades is checked before ramps.
- Touch players get a faint next-piece glyph beside the pom, filled by the cooldown.
- Audio loads in stages; leading/trailing silence is trimmed at decode time and loops use the trimmed window.
- Boss telemetry in state(): gaps survived per stage and the cause of death.

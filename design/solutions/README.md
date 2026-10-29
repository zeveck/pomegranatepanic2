# Proof the game can be finished

Pomegranate Panic 2 is one endless run (seeded), so "levels" are proved with
seeded autopilot runs. The autopilot (`game/js/autopilot.js`) only acts
through `tryPlace()`, the same call a click uses, so it obeys the cooldown.

Serve `game/` on 127.0.0.1:8123, open it with playwright-cli as session
`desktop`, press Enter once (unlocks audio), then:

- **Boss** (`boss-regression.sh SEED [seconds]`): new run with SEED, jump to
  the Hades fight via `__game.startBoss()`, autopilot for 150 s.
  Result 2026-10-29 (seeds 1–12): 6 wins; 5 still alive and fighting at
  150 s; 1 loss (seed 12, stage 5, after using the blessing). Every
  "away" gap at every stage was survived in every run except that one.
- **Full runs** (from the title, no shortcuts):
  `G.newRun(seed); for (...) G.fastForward(5)` for 300 s.
  Result (seeds 11–20, before seed timing was tightened): reached Hades in
  6/10 (between 200 s and 300 s, the autopilot doesn't steer to seeds) and
  won every boss fight it reached; never died in the descent.
- **Touch**: phone session (iPhone 15) taps place ramps at the finger
  (`.gamegen` play-test log), keyboard initials entry saves to localStorage.

# Deepwater Orbs · V2

A small, mobile-first 2D browser game for testing swimming and spatial feel.

**Play:** https://houseandrade.github.io/deepwater-orbs/

Tap **Refresh** in the upper right to load the latest game files and restart your dive. This also works from a home-screen shortcut and fetches fresh HTML, styles, game code, and physics code.

Turn your iPhone or iPad sideways. Drag the left joystick to swim; its distance from the center controls swimming strength. Let go to glide. Hold BOOST with your other thumb for more speed. On a computer, use WASD or arrow keys and hold Space to boost.

Swim right into the stationary giant fish's mouth, past its teeth, and touch the glowing orb on its tongue. Turn left and hold BOOST to escape before the mouth shuts. Getting eaten gives you an immediate retry; escaping gives you a replay button.

## What V2 tests

- Analog acceleration, momentum, drag, and two-thumb joystick/boost input.
- One enormous stationary fish, with its mouth and tongue in the same world as the ocean.
- A camera that smoothly follows and moves closer as the swimmer enters; no scene cut or teleport.
- A 4.5-second escape, closing jaws, success, getting eaten, and retry.
- Landscape layouts, iOS safe areas, pointer cancellation, and pausing when the page is hidden or the device turns portrait.

There are no dependencies, asset downloads, menus, progression, extra fish, enemies, or powers. Artwork is drawn directly in Canvas 2D.

## Run locally

Use `npm start` (Python 3 required), then open http://localhost:8000. JavaScript modules require an HTTP server; opening the HTML directly through Files or Finder does not run the game reliably.

Run `npm test` with Node.js 18 or newer. No installation step is needed. Tests cover the movement model, collision boundaries, the entire loop through the actual joystick/boost event handlers, pointer cancellation, retry, and background pausing. Input tests use a minimal simulated DOM; they do not replace real device testing.

## GitHub Pages

The included GitHub Actions workflow tests and publishes only the six static game files whenever `main` changes. The repository's Settings → Pages → Source must be **GitHub Actions**. Paths are relative so the game runs under `/deepwater-orbs/`.

## Useful playtest questions

1. Can you move gently, turn around, and stop where you expect?
2. Does entering feel like swimming into a huge fish instead of switching rooms?
3. Can you see where to go and use both controls comfortably?
4. Is the escape readable and achievable after a couple of tries?

Real Safari performance, thumb comfort, and difficulty still need Brian and Dean's phone/iPad playtest. No audio, fullscreen API, orientation-lock permission, tracking, storage, or external services are required.

## Files and tuning

- `physics.js`: world geometry, movement, collision, orb pickup, and the escape timer. `WORLD.escapeSeconds` controls escape difficulty; acceleration and drag are in `step`.
- `game.js`: input, camera, drawing, and status text. Physics runs at a fixed 120 Hz independent of rendering.
- `style.css`: landscape controls and safe areas.
- `tests/`: dependency-free automated checks.

The earlier conversation supplied the behavior reference. Its original downloadable prototype was not available, so V2 implements the agreed loop anew.

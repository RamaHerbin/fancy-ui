# FireworksHdr

A GPU fireworks background that burns shells into the night sky. A DOM/GPU-free
physics core drives a WebGPU renderer into an `rgba16float`, wide-gamut (P3),
extended-tone-mapping canvas, so bursts, flashes, and comet trails render
_brighter than SDR white_ on an HDR display. It degrades silently — a clamped
WebGPU-SDR path, then a WebGL2 fallback (display-p3 or plain sRGB), then nothing
at all — so the effect stays safe on everything else.

The simulation (rockets, peony/willow/ring/glyph shells, sparks, embers, smoke,
seekers) is fully deterministic given a seed, and pointer- or code-driven. The
intro "word" burned by the host app (glyph shells spelling out letters) is just
the generic `glyph` shell fed explicit target points — the component itself
ships no copy.

## Usage

```svelte
<script>
	import { FireworksHdr } from "fancy-ui-svelte";

	let handle;
</script>

<div class="relative h-screen w-screen bg-black">
	<FireworksHdr
		palette={["#ff2fd6", "#a142ff", "#3d5bff", "#42cfff"]}
		exposure={2.2}
		ambient
		interactive
		onReady={(h) => (handle = h)}
	/>
</div>
```

Drive it programmatically (e.g. pair with `interactive={false}`):

```js
handle.launch({ apex: { x: 0.5, y: 0.3 }, shell: "peony" });
handle.setAmbient(true, 0.5);
handle.setKeepClear({ x0: 0.28, y0: 0.3, x1: 0.72, y1: 0.82 });
handle.setExposure(2.6);
```

## Props

| Prop                   | Type                                 | Default                                     | Description                                                                                                                                 |
| ---------------------- | ------------------------------------ | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `palette`              | `string[]` (hex)                     | `["#ff2fd6","#a142ff","#3d5bff","#42cfff"]` | Brand hues. Order is irrelevant — parsed and sorted cool→warm (by oklab hue angle) for the shell sweep.                                     |
| `hdr`                  | `boolean`                            | `true`                                      | Opt into the GPU engine (WebGPU HDR first, then a WebGL2 fallback). When `false`, no engine boots at all.                                   |
| `exposure`             | `number`                             | `2.2`                                       | Display exposure multiplier, clamped to `[1,4]`.                                                                                            |
| `ambient`              | `boolean`                            | `true`                                      | Run the ambient auto-scheduler (Poisson-timed background shells).                                                                           |
| `ambientIntensity`     | `number`                             | `0.35`                                      | Ambient energy `[0,1]` — scales shell size.                                                                                                 |
| `interactive`          | `boolean`                            | `true`                                      | Launch a shell toward the pointer on window `pointerdown`.                                                                                  |
| `quality`              | `"auto" \| "high" \| "mid" \| "low"` | `"auto"`                                    | Particle budget; `auto` picks from the render level + DPR.                                                                                  |
| `respectReducedMotion` | `boolean`                            | `true`                                      | Force ambient off under `prefers-reduced-motion` (explicit launches still work).                                                            |
| `class`                | `string`                             | `""`                                        | Extra classes on the canvas wrapper.                                                                                                        |
| `onReady`              | `(handle: FireworksHandle) => void`  | —                                           | Fired when the engine is live, and again with a fresh handle after a recovered GPU context loss. Never fired when no GPU renderer comes up. |
| `onLost`               | `() => void`                         | —                                           | Fired once when a GPU context loss could not be recovered; the component has torn itself down and any handle it gave out is inert.          |

The canvas wrapper is `pointer-events-none` and `aria-hidden` — it is a
background. `interactive` listens at the window level, so clicks pass through to
your UI while still launching a shell.

## Handle (`FireworksHandle`)

The imperative control surface passed to `onReady`. Coordinates are normalized
`[0,1]`, top-left origin.

| Member         | Signature                                   | Description                                                                                 |
| -------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `launch`       | `(opts: LaunchOptions) => LaunchResult`     | Fire a shell; returns the resolved `{ flightMs, breakMs }`.                                 |
| `setAmbient`   | `(on: boolean, intensity?: number) => void` | Toggle the ambient scheduler / set its intensity `[0,1]`.                                   |
| `setKeepClear` | `(rect: Rect \| null) => void`              | Set (or clear) the rect ambient apexes avoid; also soft-dims stray particles that drift in. |
| `setExposure`  | `(v: number) => void`                       | Update exposure (clamped `[1,4]`).                                                          |
| `renderLevel`  | `FireworksRenderLevel`                      | Which path actually engaged (see below).                                                    |
| `cleanup`      | `() => void`                                | Stop the loop, remove listeners, release GPU memory.                                        |

`setKeepClear` drives two things at once: the ambient scheduler steers new apexes
out of the rect, and the sim soft-dims any spark, ember, or trail that drifts
inside it — so the area behind a foreground card stays calm without the scheduler
alone being enough.

## Types

- `LaunchOptions` — `{ apex, from?, shell?, color?, glyphPoints?, scale?, flightMs?, intensity?, depth?, seed?, releaseAtMs? }`. `glyphPoints` is **required** when `shell === "glyph"`. `flightMs` (when given) wins over the apex height for timing — apex only sets the horizontal target; omit it and the flight time is solved from gravity. `depth ∈ [0,1]` pushes a shell "back" (dimmer, smaller, desaturated).
- `LaunchResult` — `{ flightMs, breakMs }` where `breakMs = flightMs + fuse-hang` (when the shell detonates).
- `ShellKind` — `"peony" | "willow" | "ring" | "glyph"`.
- `QualityTier` — `"high" | "mid" | "low"`.
- `FireworksRenderLevel` — `"webgpu-hdr" | "webgpu-sdr" | "webgl-p3" | "webgl-sdr" | "none"`.

## Render levels

`renderLevel` reports the path that _actually_ engaged. It is sampled once at
startup and does **not** follow the window to another display. The value is
honest — the component never claims HDR it is not delivering.

| Level        | Meaning                                                                                                               |
| ------------ | --------------------------------------------------------------------------------------------------------------------- |
| `webgpu-hdr` | WebGPU with extended tone mapping active **and** a `(dynamic-range: high)` display — true brighter-than-white output. |
| `webgpu-sdr` | WebGPU float16 + P3, but the browser clamped tone mapping or the display is SDR.                                      |
| `webgl-p3`   | WebGL2 fallback with a `display-p3` drawing buffer (wider gamut, no over-white headroom).                             |
| `webgl-sdr`  | WebGL2 fallback, plain sRGB.                                                                                          |
| `none`       | No GPU rendering available; `onReady` never fires.                                                                    |

Honesty invariants:

- `webgpu-hdr` is reported **only** when extended tone mapping reads back as
  active from `getConfiguration()` **and** `matchMedia("(dynamic-range: high)")`
  matches. A WebGPU context that renders float16 + P3 but cannot prove extended
  tone mapping downgrades to `webgpu-sdr`.
- `webgl-p3` is reported **only** when the `drawingBufferColorSpace = "display-p3"`
  assignment reads back as `display-p3`; otherwise the buffer stays sRGB and the
  level is `webgl-sdr`.
- `onReady` fires once per live engine, and never when both engines fail. The
  consumer owns the fallback decision (e.g. a short timeout that swaps in a
  static poster) — the component stays silent rather than showing a broken
  canvas.
- The `sdr` uniform the shaders branch on uses the **same** predicate as
  `webgpu-hdr`. An SDR display therefore always gets the exposure-`1.0`
  soft-knee path, even when the browser did keep extended tone mapping — the
  render level and the pixels can never disagree.

### GPU context loss

A lost WebGPU device or a `webglcontextlost` event kills the engine: nothing it
draws lands again. The component detects it on the next frame and recovers
**once** — WebGPU asks for a fresh device (re-running the WebGPU → WebGL2
fallback), WebGL waits up to 4 s for `webglcontextrestored`. A successful
recovery re-seats the sim and fires `onReady` again with a handle whose
`renderLevel` reflects the engine that came back. If recovery fails, or a second
loss follows, the component tears itself down — loop stopped, observers and
listeners removed, GPU memory released — and calls `onLost` so the consumer can
swap in its static fallback. It never sits there driving a dead engine.

On an SDR display the effect is still safe: exposure is pinned to `1.0`, a
soft-knee compression keeps highlights from clipping, and a small saturation lift
compensates for the lost range (see _SDR degradation_ below). Everything
_sub-white_ renders identically on HDR and SDR.

## Quality & adaptive downgrade

`quality="auto"` resolves a tier from the render level, device-pixel-ratio, and a
conservative low-power signal:

| Condition                                | Tier   |
| ---------------------------------------- | ------ |
| container min-dimension `< 480px`        | `low`  |
| WebGL2 fallback **and** low-power device | `low`  |
| `webgpu-hdr`                             | `high` |
| `webgpu-sdr`, DPR ≥ 2                    | `high` |
| `webgpu-sdr`, DPR < 2                    | `mid`  |
| WebGL2 (`webgl-p3` / `webgl-sdr`)        | `mid`  |

Tiers set the particle budget and trail emission rate:

| Tier   | maxParticles | trailRate (/s) |
| ------ | ------------ | -------------- |
| `high` | 4096         | 180            |
| `mid`  | 2560         | 120            |
| `low`  | 1280         | 60             |

On top of the tier, a **session-sticky adaptive ladder** watches an EMA of frame
time (α = 0.1) and drops a notch when the average holds above 24 ms (~<42 fps)
for ~60 consecutive active frames. It only ever downgrades — never hunts back up
— and sheds GPU cost before CPU cost:

| Step | renderScale | spawnScale | Sheds                    |
| ---- | ----------- | ---------- | ------------------------ |
| 0    | 1.0         | 1.0        | — (full)                 |
| 1    | 0.75        | 1.0        | GPU: accumulation buffer |
| 2    | 0.5         | 1.0        | GPU: accumulation buffer |
| 3    | 0.5         | 0.66       | CPU: burst spawn density |
| 4    | 0.5         | 0.4        | CPU: burst spawn density |

The pool is fixed-size (frozen at `createSim`), so the ladder never rebuilds it
mid-show — it shrinks _new burst_ counts instead, which is pop-free. Glyph
seekers are driven by explicit points and are never scaled, so the intro word
stays intact under downgrade. Only active foreground frames (particles present,
not `document.hidden`, not reduced-motion-idle) fold into the average, so
paused/quiet frames never trigger a spurious drop.

## Performance

The CPU sim has large headroom; the real budget risk is GPU fill-rate on the HDR
float path, which is what the adaptive ladder targets first. Measured on Apple
Silicon at the `high` tier:

- **Intro peak** (four glyph shells + garnish): `step()` + `writeInstances()`
  ≈ **0.10 ms** mean per frame.
- **Saturation** (4096 live particles): ≈ **1.03 ms** mean per frame — still well
  under a 60 fps CPU budget, leaving the frame to the GPU.

---

## Art direction

Design rationale for the frame. Brightness values are _encoded linear,
pre-exposure_; `1.0` = SDR white. Shipped exposure is 2.2 ambient / 2.6 intro on
HDR; SDR pins exposure to 1.0 with a soft knee.

### Palette & color

- Family (ping-pong index order): cyan `#42cfff` (196°), blue `#3d5bff` (231°),
  violet `#a142ff` (271°), magenta `#ff2fd6` (312°). Electric blue `#3d5bff` is
  the signature hue.
- **White-hot life ramp** (life fraction `L`): `L 0–0.06` pure white (magnesium
  bias `#f4f8ff`); `0.06–0.18` crossfade white→hue in oklab (never grey);
  `0.18–0.75` full hue; `0.75–1.0` cool then dim to warm-white `#ffcf9c`.
- **Shell assignment**: 85% single-hue via a ping-pong sweep
  cyan→blue→violet→magenta→violet→blue→cyan; 12% adjacent-duo only
  (`cyan+blue`, `blue+violet`, `violet+magenta`); 3% silver crackle. Never
  rainbow, never cyan+magenta.
- Intro glyph hues: **H = cyan, D = blue, R = violet, ? = magenta**.
- Hue jitter ±7° per shell, ±3° per spark.
- Embers are palette-tinted (dimmed, desaturated parent hue), cooling to
  `#ffcf9c` only at low luminance — **not** orange. Smoke is a near-black cool
  grey `#0a0b10` that picks up 8–12% of the nearest shell hue when re-lit.
- Ascent comet head is white-hot `#fff2e0` with a short tail tinted toward the
  incoming hue.

### Brightness ladder (pre-exposure)

Intro flash **6.0** · ambient flash **3.8** · fresh spark **2.2** · steady
**0.9** · terminal **0.15** · hue-hot **2.5 → 1.2** · ascent head **2.8** / tail
**0.6** · burst streak **0.5** · ember mean **0.35** (flicker ×0.6–2.0 @
8–14 Hz irregular) · smoke **0.05–0.12** · glyph hold **1.3** · glyph release
**2.6** · haze ceiling behind the card **≤ 0.18** (hard).

- **Must exceed white** (HDR, transient, small area): flashes, fresh sparks,
  comet, glyph release, hue-hot.
- **Must not bloom**: steady sparks, embers, smoke, haze, streaks. The frame
  reads as mostly deep black with surgical over-white points.

### Fades

- Spark, two-stage: `L 0→0.7` flash 2.2→0.9 (first ~150 ms drop, then slow burn);
  `L 0.7→1.0` cubic ease-in to 0, shrink ~15%, desaturate warm.
- Core flash, exponential: 50% @ 60 ms, 10% @ 180 ms, gone by 350 ms; crossfades
  to hue while decaying.
- Accumulation decay: ascent comet persists 350–500 ms (×0.90–0.93/frame @
  60 fps); burst streaks 150–220 ms (×0.82–0.86). Smoke expands + fades over
  1.5–3 s.
- Universal: the last 10% of life is multiplied by `smoothstep(1.0, 0.9, L)`;
  alpha and size ease together; nothing is ever removed at non-zero brightness.

### Composition & negative space

- Launch origin off-screen: `y ∈ [1.02, 1.08]`, `x ∈ [0.08, 0.92]` (ambient x
  weighted to the sides).
- Ambient apex zones (`x0,y0,x1,y1 · weight`): UL `.04,.08,.34,.40 · .28` · UR
  `.66,.08,.96,.40 · .28` · top-centre `.34,.05,.66,.24 · .18` · left-mid
  `.02,.34,.20,.62 · .13` · right-mid `.80,.34,.98,.62 · .13`.
- Max simultaneous: ambient 2–3 (rare 4); intro exactly 4, staggered.
- Burst radius (fraction of min-dimension): ambient 0.10–0.20, feature 0.24,
  glyph 0.14, hard max 0.28.
- **Keep-clear** rect: desktop `(0.28, 0.30, 0.72, 0.82)`, mobile
  `(0.10, 0.22, 0.90, 0.90)`. Apexes are hard-rejected inside it; drift-in
  particles are soft-dimmed. Rockets may transit thin/fast; their trails dim
  inside. Haze behind the card is capped at 0.18 encoded.

### Rhythm

- Ambient: Poisson, mean 2200 ms, clamped `[900, 5200]`.
- Double-launch 18% of the time, +120–320 ms later into a mirrored zone. No
  finales.
- **Intro (≈2.7 s)**: launches at t = 0 / 180 / 360 / 540 ms; detonations ≈ 700 /
  880 / 1060 / 1300 ms; the "?" dot accent (magenta) ~1450 ms; hold until ~2.0 s
  (word readable 500–600 ms); release cascade 500 ms; card panel-in ~2.3–2.4 s;
  settled ≈ 3.1 s. Post-intro pause 800–1000 ms, then a first small single low
  shell.

### Realism anchors

Session wind ±0.02–0.05 on ascents and drift · detonation at `vy ≈ 0` plus an
80–140 ms fuse hang · all sparks ballistic (willow = slower, longer-lived) ·
smallest embers hit terminal velocity and outlive everything · apex smoke puffs
drift and are re-lit by later bursts · per-shell depth `∈ [0,1]` dims
size/brightness/saturation, far shells edge-biased · break asymmetry ±12% plus 5%
stragglers at 1.4× · color-cooling white→hue→warm-white · crackle strobe ~24 Hz
(1-in-6 sparks, or the 3% silver shells), 0.2 ↔ 2.4.

### SDR degradation

Exposure pinned to 1.0 · soft-knee start 0.8, asymptotic to 1.0 · ladder
unchanged (the over-white separation is simply lost) · bigger-not-brighter: core
radius ×1.3–1.5 with a longer falloff · crossfade to hue earlier + global
saturation +10–15% · everything sub-white is identical to HDR.

## Physics model

A DOM/GPU-free simulation core (`fireworks-shared.ts`). Positions are normalized
`[0,1]`, top-left, y-down. Velocities and accelerations are in **visual units** —
screen-heights per second, isotropic — with aspect `A = canvasW / canvasH`
applied only at horizontal integration (`pos.x += (vel.x / A)·dt`) and when
converting a normalized position error to visual units. All `step()` randomness
is seed-derived (deterministic); `Math.random` only ever sits behind an
injectable `rng()` at spawn/schedule time.

### World

`G = 3.6` (visual, +y down) · `DT_MAX = 0.033` · launch `y ∈ [1.02, 1.08]`,
`x ∈ [0.08, 0.92]`. Semi-implicit Euler: `vel += a·dt; pos.x += (vel.x/A)·dt;
pos.y += vel.y·dt`. Drag: `vel /= (1 + drag·dragScale·dt)`. Death gate:
`brightnessOut = curve · smoothstep(1.0, 0.9, lifeT)`, `lifeT = age / ttl`.

### Per-type behavior

| Type   | gravScale | drag (1/s)            | ttl (s)           | size (norm-h) | windScale |
| ------ | --------- | --------------------- | ----------------- | ------------- | --------- |
| rocket | 1.0       | 0.6                   | flight + hang     | 0.004 head    | 0.05      |
| spark  | 0.85      | 1.8                   | 0.9–1.6           | 0.0025–0.004  | 0.30      |
| ember  | 0.35      | 2.4 (terminal ~0.525) | 1.6–2.8           | 0.002–0.003   | 0.70      |
| smoke  | −0.05 → 0 | 3.0                   | 1.5–3.0           | 0.010 → 0.050 | 1.0       |
| flash  | 0         | 0                     | 0.06–0.12         | 0.08–0.16     | 0         |
| seeker | 0 → 1.0   | 1.2 (pop)             | phased (0.9 rel.) | 0.003–0.005   | 0.4       |

Session wind is seeded once: `wx ∈ ±[0.02, 0.05]`, `wy ∈ ±[0.01, 0.02]` visual
accel, applied as `a += w · windScale[type]`.

### Deterministic flicker

```
hash11(x) = fract(sin(x·127.1)·43758.5453)
flickerNoise(seed, age, freq): t = age·freq; i = floor(t); f = t − i;
  a = hash11(seed+i); b = hash11(seed+i+1); u = f·f·(3−2f); return a + (b−a)·u
ember mul = 0.6 + 1.4·flickerNoise(seed, age, 8 + 6·hash11(seed))
crackle  = flickerNoise(seed, age, 24) > 0.5 ? hi : lo
```

### Shells

| Kind   | high        | mid  | low  | ember frac | smoke | radius (×scale)       | builder     |
| ------ | ----------- | ---- | ---- | ---------- | ----- | --------------------- | ----------- |
| peony  | 320         | 200  | 120  | 0.15       | 1     | 0.10–0.20 (feat 0.24) | sphereBurst |
| willow | 200         | 130  | 80   | 0.80       | 1–2   | 0.14–0.22             | willowBurst |
| ring   | 180         | 120  | 70   | 0.10       | 0     | 0.12–0.20             | ringBurst   |
| glyph  | pts+garnish | +25% | +15% | garnish    | 1     | 0.14                  | glyphPoints |

Break asymmetry ±12% via `hash11(seed+i)`; 5% stragglers at 1.4× speed,
`dragScale ×0.7`. Depth `d`: `size ×(1 − 0.5d)`, `brightness ×(1 − 0.45d)`,
`saturation ×(1 − 0.35d)`, `burst radius ×(1 − 0.25d)`. The dim rides on the
particle (pool field `depthDim`) and multiplies whatever the type's brightness
curve resolves to each frame, so it reaches sparks, embers, smoke, the
detonation flash, and glyph seekers alike — not just the spawn value.

### Rockets

`solveLaunch` inverts the same model `integrate` runs the rocket through —
gravity `G`, linear drag `k = 0.6`, the session wind (rocket `windScale`), and
the `pos.x += (vel.x / A)·dt` aspect divide — so the shell breaks at the apex it
was asked for. Vertically, `vu(t) = (vu0 + g/k)·e^(−kt) − g/k`: given `flightMs`
that solves to `vu0 = (g/k)·(e^(k·flight) − 1)` (`vy = 0` exactly at flight time,
apex only sets the horizontal target); otherwise `vu0` is Newton-solved from the
rise `vu0/k − (g/k²)·ln(1 + k·vu0/g) = from.y − apex.y` and the flight follows
from it. Horizontally `Δx·A = (ax/k)·t + (vx0 − ax/k)·(1 − e^(−kt))/k`. Passing
no medium (`drag = 0`, `A = 1`, no wind) collapses both back to the undamped
`flight = sqrt(2·(from.y − apex.y)/G)`, `v0x = (apex.x − from.x)/flight` forms.
A ballistic solve fed to the damped integrator undershoots the apex by ~25% of
the rise and misses horizontally on any non-square canvas.

Fuse hang 80–140 ms seeded (the intro "?" uses
140); `breakMs = flightMs + hangMs`. At break: enqueue the shell at the current
position plus one flash, then kill the rocket. Trail uses a fractional
accumulator (`emit += trailRate·dt; while (emit ≥ 1) { spawn; emit-- }`) — trail
sparks are ttl 0.3–0.5, size 0.002, ascent-tail brightness, ~zero velocity;
the head is ascent-head brightness. The trail hue is the comet head mixed 25%
toward **that launch's** first shell hue (stored on the launch spec), so a
branded palette never gets the built-in cyan on its ascent.

### Glyph seekers

1. **Pop** (0–80 ms): velocity toward the seeker's own target, magnitude
   `dist / 0.08`; spring off, drag 1.2, gravity off.
2. **Spring** (ω = 6, ζ = 0.9), per axis in visual units:
   `a = −ω²(p − target) − 2ζω·v`. Stable (`ω·dt = 0.198 ≪ 2` at 33 ms).
3. **Hold** until `releaseAt`: brightness `1.3·(0.85 + 0.3·flicker)`.
4. **Release**: spring off, gravity → 1.0, pop-2.6 decay, ttl 0.9 s, two-stage
   fade. The sim self-triggers release from `releaseAtMs`, so the renderer stays
   agnostic.

### Per-frame pipeline (`step`)

1. Clamp `dt`.
2. Drain the spawn queue (previous-frame detonations; over capacity →
   `droppedSpawns++`).
3. Per live particle: apply accel (gravity + wind) → type behavior (rocket
   trail/break; seeker phases; smoke expand; spark two-stage + life-color; ember
   flicker + terminal velocity; flash exp decay) → integrate → age → brightness
   `= curve · smoothstep(1, 0.9, lifeT)` → dead → **swap-remove** (re-examine the
   swapped index).
4. `writeInstances`.

**Instance layout (8 floats)**: `[posX, posY, size, r·bright, g·bright, b·bright,
velX·STRETCH, velY·STRETCH]` with `STRETCH ≈ 0.015 s`. The renderer draws a
velocity-stretched quad (major axis from the velocity terms, minor from size),
two-lobe gaussian (hot core + soft halo), additive. Swap-remove keeps the pool
contiguous — no freelist; allocate at `count++`, reject at capacity.

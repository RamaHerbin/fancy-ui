# Meteors

A meteor shower for a dark card or hero. Each meteor sits at its own depth: near ones are larger, brighter, longer-tailed and faster, far ones faint and slow, so the shower reads in parallax. A meteor fades in, streaks across on a diagonal with a glowing head and a tapering tail, and burns out; about one in five flares just before it goes.

## Props

| Prop    | Type     | Default | Description                                                                                    |
| ------- | -------- | ------- | ---------------------------------------------------------------------------------------------- |
| `count` | `number` | `20`    | Number of meteors to render                                                                    |
| `angle` | `number` | `215`   | Direction of travel in degrees (215 = down and to the right)                                   |
| `speed` | `number` | `1`     | Speed multiplier                                                                               |
| `color` | `string` | —       | Head and tail colour; defaults to pale blue-white on dark pages (`.dark`), slate on light ones |
| `seed`  | `number` | `1`     | Seed for the field — same seed, same shower                                                    |
| `class` | `string` | `''`    | Additional CSS classes on each meteor                                                          |

## Usage

The meteors are absolutely positioned: give the parent `position: relative`, a size and `overflow: hidden`.

```svelte
<div class="relative h-64 w-full overflow-hidden bg-black">
	<Meteors count={30} />
</div>

<Meteors color="#fcd34d" angle={235} speed={1.5} />
```

## How it works

- `meteorField(count, seed)` (exported from the component module) builds the shower with a seeded PRNG, so the server and the client render the same markup. Starts range from −50% to 100% of the width (meteors drift right as they fall) and −30% to 30% of the height. Depth is skewed toward far, as in a real sky. Every meteor starts part-way through its pass (a negative delay), so the shower is already under way on load instead of starting in a burst.
- Depth drives the head's scale, the tail length (40–150 px), the peak opacity, the travel distance and the duration (≈2.5 s near, ≈8 s far), all as CSS variables on each span.
- The head is the span (a `box-shadow` glow); the tail is its `::before`, a gradient that fades out behind the head. One `meteor-fall` keyframe rotates to `angle` and translates along it, fading in over the first 8%; flaring meteors use `meteor-fall-flare`, which swells the glow at ~74%.
- `prefers-reduced-motion`: no animation — each meteor is drawn once, still, part-way along its path.

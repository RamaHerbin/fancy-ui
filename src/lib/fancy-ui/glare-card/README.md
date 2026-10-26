# GlareCard

A holographic trading card effect with mouse-tracking glare, rainbow foil, and 3D rotation.

## Props

| Prop    | Type     | Default | Description            |
| ------- | -------- | ------- | ---------------------- |
| `class` | `string` | `""`    | Additional CSS classes |

## Snippets

- `children` — Card content

## Usage

```svelte
<GlareCard>
  <div class="flex flex-col items-center justify-center h-full p-6 text-white">
    <h3 class="text-xl font-bold">Holographic</h3>
    <p class="text-sm">Move your mouse around</p>
  </div>
</GlareCard>
```

## Accessibility

- The foil and glare are decorative and pointer-driven: only mouse and pen pointers move them, touch pointers are ignored so the foil never sticks where a finger lifted.
- When keyboard focus lands on something inside the card (`:focus-visible`), the foil lights up at the same strength as on hover, centred and idle. It goes out when focus leaves.
- Under `prefers-reduced-motion` the foil changes without transitions.

# InteractiveHoverButton

Button with a hover animation: text slides out to the right while an arrow and duplicate text slide in from the right. A small `bg-primary` dot scales up to fill the button background.

## Props

| Prop       | Type     | Default    | Description                         |
|------------|----------|------------|-------------------------------------|
| `text`     | `string` | `"Button"` | Button label text                   |
| `class`    | `string` | `""`       | Additional CSS classes              |
| `children` | Snippet  | -          | Optional content (overrides `text`) |

Also accepts all standard `<button>` attributes via `...restProps`.

## Animation details

All animations are pure CSS via Tailwind `group-hover` utilities, no JS required:

- **Dot**: `scale-1` -> `scale-[100.8]` fills the button background with `bg-primary`
- **Initial text**: slides right (`translate-x-12`) and fades out (`opacity-0`)
- **Hover text + arrow**: slides in from right (`-translate-x-5`) and fades in (`opacity-100`)
- All transitions use `duration-300`

## Porting notes

- Direct port, no structural changes needed
- Inline SVG arrow (no Lucide dependency)
- Uses theme tokens: `bg-background`, `bg-primary`, `text-primary-foreground`

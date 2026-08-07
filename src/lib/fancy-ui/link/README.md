# Link

A plain-text anchor styled for prose and inline copy — a colored text link, not a button, with the safe
`rel` handling an off-site destination needs.

## Components

- `Link` - An `<a>` element with a `default`/`muted` color treatment, a configurable underline, and an
  `external` mode for links that leave the site

## Usage

```svelte
<script>
	import { Link } from "fancy-ui-svelte";
</script>

<p>
	Read the <Link href="/docs/components/link">component docs</Link> or open the
	<Link href="https://github.com" external>source on GitHub</Link>.
</p>
```

## Props

| Prop        | Type                            | Default     | Description                                                                                    |
| ----------- | ------------------------------- | ----------- | ---------------------------------------------------------------------------------------------- |
| `href`      | `string`                        | —           | Destination URL (required)                                                                     |
| `variant`   | `"default" \| "muted"`          | `'default'` | `default` reads as inline copy; `muted` recedes into supporting text at a smaller size         |
| `external`  | `boolean`                       | `false`     | Appends an arrow glyph, defaults `target` to `_blank`, and guarantees a safe `rel`             |
| `underline` | `"hover" \| "always" \| "none"` | `'hover'`   | When the underline shows                                                                       |
| `target`    | `string`                        | `undefined` | Anchor `target`; `external` fills this in as `_blank` when left unset                          |
| `rel`       | `string`                        | `undefined` | Anchor `rel`; merged with the safe tokens below whenever `target` opens a new browsing context |
| `onclick`   | `(event: MouseEvent) => void`   | `undefined` | Native click handler                                                                           |
| `class`     | `string`                        | `undefined` | Additional CSS classes                                                                         |
| `ref`       | `HTMLAnchorElement \| null`     | `null`      | Bindable element reference                                                                     |

## Implementation Notes

- **Safe `rel` is derived, not just defaulted.** `rel` is guaranteed to contain `noopener noreferrer`
  whenever `target` names a browsing context other than `_self`, `_parent`, or `_top` (matched
  case-insensitively, per the HTML standard) — not just the literal string `"_blank"`. A named target like
  `target="promo"` opens a new top-level context exactly like `_blank` does, with `window.opener` intact
  unless `rel` says otherwise, so it gets the same treatment. `external` also always forces the safe
  tokens, even in the (harmless) edge case where the caller's own `target` resolves to one of the three
  same-tab keywords — browsers ignore `rel` when no new context actually opens. A caller-supplied `rel` is
  parsed into tokens and merged through a `Set`, so `rel="nofollow"` becomes `"nofollow noopener noreferrer"`
  rather than being discarded. Without `noopener`, the new context keeps a `window.opener` handle back to
  the page that opened it, which lets that tab redirect the original one.
- **`external` implies, it does not overwrite.** `target` defaults to `_blank` only when the caller left it
  unset; passing both `external` and a named `target` keeps the named target while still forcing the safe
  `rel`.
- **The arrow is an inline `<svg>`, marked `aria-hidden`,** paired with a visually-hidden
  `(opens in a new tab)` span so the announcement to assistive tech is a sentence, not an unlabelled glyph.
- **`--ft-link` / `--ft-link-hover`** carry the `default` variant's color and are `light-dark()` pairs, so
  **your theme must declare `color-scheme`** for the right half to be picked. They are unset — and the
  brand hue skipped entirely — on the `muted` variant, which uses the ordinary `text-muted-foreground`
  token instead.
- **`--ft-accent`** drives the focus-visible ring. It's a family-level property shared, by name only,
  across every component in the Actions group — none of them can reach a real shared token file, so each
  reads it through `var(--ft-accent, <local fallback>)` into its own private alias (`--ft-link-accent`
  here) rather than redeclaring `--ft-accent` outright, which would shadow whatever an ancestor set.
  Setting `--ft-accent` once on a common ancestor retints the ring on every component in the family at
  once.
- **The underline is a set of Tailwind classes, not a text-decoration prop on the element**, so
  `underline="hover"` (the default) reads as `no-underline` at rest and adds `underline` on both `:hover`
  and `:focus-visible` — keyboard focus gets the same affordance a mouse hover does.

## Theming

```css
.article-body {
	--ft-link: light-dark(oklch(0.4 0.14 293), oklch(0.85 0.09 293));
	--ft-link-hover: light-dark(oklch(0.3 0.14 293), oklch(0.92 0.05 293));
	--ft-accent: light-dark(oklch(0.5 0.24 300), oklch(0.62 0.25 301));
}
```

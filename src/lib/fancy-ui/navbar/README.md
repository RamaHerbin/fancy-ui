# Navbar

A horizontal top-of-page bar: a brand mark on the left, navigation links,
a flexible gap, then actions on the right.

## Components

- `Navbar` — the bar itself: a `<nav>` landmark laying out three optional
  regions (`brand`, the default `children` slot for links, `actions`)
- `NavbarLink` — one link in the bar; a standalone component with no context
  dependency on `Navbar`, so it can be used anywhere a same-styled link fits

## Usage

```svelte
<script>
	import { Navbar, NavbarLink } from "fancy-ui-svelte";

	let pathname = "/docs";
</script>

<Navbar>
	{#snippet brand()}
		<span class="h-2 w-2 rounded-sm bg-gradient-to-br from-purple-500 to-cyan-400"></span>
		FancyUI
	{/snippet}

	<NavbarLink href="/docs" current={pathname === "/docs"}>Docs</NavbarLink>
	<NavbarLink href="/components" current={pathname === "/components"}>Components</NavbarLink>
	<NavbarLink href="/showcase" current={pathname === "/showcase"}>Showcase</NavbarLink>

	{#snippet actions()}
		<button type="button">Sign in</button>
	{/snippet}
</Navbar>
```

Pin the bar to the top of the viewport with `sticky`:

```svelte
<Navbar sticky>
	<!-- ... -->
</Navbar>
```

## Props

### Navbar

| Prop       | Type                  | Default  | Description                                                       |
| ---------- | --------------------- | -------- | ----------------------------------------------------------------- |
| `label`    | `string`              | `"Main"` | Accessible name for the `<nav>` landmark                          |
| `sticky`   | `boolean`             | `false`  | `position: sticky; top: 0` with a translucent, blurred background |
| `bordered` | `boolean`             | `true`   | Draws a 1px hairline along the bottom edge                        |
| `brand`    | `Snippet`             | —        | The brand mark / wordmark, on the left                            |
| `children` | `Snippet`             | —        | The navigation links, between the brand and the actions           |
| `actions`  | `Snippet`             | —        | Actions on the right — search, sign-in, a theme switch            |
| `class`    | `string`              | —        | Additional CSS classes                                            |
| `ref`      | `HTMLElement \| null` | `null`   | Bindable element reference                                        |

### NavbarLink

| Prop       | Type                          | Default | Description                                                                                |
| ---------- | ----------------------------- | ------- | ------------------------------------------------------------------------------------------ |
| `href`     | `string`                      | —       | Destination URL. Required                                                                  |
| `current`  | `boolean`                     | `false` | Marks this as the current page — `aria-current="page"` plus a visible weight/colour change |
| `external` | `boolean`                     | `false` | Opens in a new tab with a safe `rel`, and notes it for assistive tech                      |
| `disabled` | `boolean`                     | `false` | Strips the link out of the click and keyboard-activation paths                             |
| `onclick`  | `(event: MouseEvent) => void` | —       | Native click handler. Never called while `disabled`                                        |
| `children` | `Snippet`                     | —       | The link's label                                                                           |
| `class`    | `string`                      | —       | Additional CSS classes                                                                     |
| `ref`      | `HTMLAnchorElement \| null`   | `null`  | Bindable element reference                                                                 |

## Accessibility

- `Navbar` renders a `<nav>` with an accessible name (`label`, default
  `"Main"`) — give every `Navbar` on a page a distinct `label` if there is
  more than one landmark of this kind.
- `current` on `NavbarLink` sets `aria-current="page"` **and** changes
  font-weight, colour, and draws an accent underline — current is never
  conveyed by colour alone.
- `external` appends a visually-hidden "(opens in a new tab)" note to the
  link's accessible name, in addition to the safe `rel="noopener noreferrer"`
  and `target="_blank"`.
- `disabled` has no native equivalent on an `<a>`: it strips `href`, sets
  `aria-disabled="true"` and `tabindex="-1"`, and the click handler itself
  refuses to fire — a synthetic `.click()` (a test, some assistive tech)
  cannot walk past a missing native `disabled` attribute the way it can on
  a real anchor, so the guard lives in the handler, not just the markup.

## Theming

`Navbar` and `NavbarLink` **both** declare `--ft-nav-accent`, each with the
same documented fallback, and neither ever redeclares `--ft-accent` itself:

```css
--ft-nav-accent: var(
	--ft-accent,
	light-dark(oklch(0.5432 0.2528 300.22), oklch(0.604 0.2606 301.75))
);
```

`NavbarLink` reads `var(--ft-nav-accent)` for its current-link underline. It
declares its own copy of the fallback rather than relying on inheriting
`Navbar`'s — the same shape `Button`'s `--ft-btn-accent` and
`Autocomplete`/`Combobox`/`TimePicker`'s `--ft-field-accent` already use,
and specifically the same reason `TimePicker`'s portalled `TimePickerPanel`
declares its own copy too: `NavbarLink` is deliberately independent of
`Navbar` ("keep them independent so a consumer can put a `NavbarLink`
anywhere" — a mobile menu, a footer), so it can't lean on inheriting from
one particular ancestor the way a component that only ever renders nested
inside its compound root could. Retint from further up the tree — this
reaches both declarations, since neither one redeclares `--ft-accent`
itself:

```css
.my-header {
	--ft-accent: oklch(0.7 0.18 200);
}
```

## Implementation Notes

- `brand`, `children` and `actions` are each optional and independently
  omitted from the DOM when not passed — there is no empty wrapper `<div>`
  left behind for a region a consumer didn't use.
- The actions region uses `margin-left: auto` rather than a dedicated
  spacer element between it and the links — that pushes it to the far
  right whether or not `children` is present, with no leftover empty `div`
  in the DOM when there are no links.
- `sticky` swaps the bar's fill for a translucent one and adds
  `backdrop-blur-md`, so content scrolling underneath stays legible through
  the blur instead of disappearing behind a flat panel the instant it's
  pinned.
- `NavbarLink` intentionally shares no Svelte context with `Navbar` — it is
  a fully standalone component you can drop anywhere a similarly-styled
  link fits (a mobile menu, a footer), not just inside a `Navbar`.

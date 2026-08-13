# NavigationMenu

A horizontal row of triggers, each opening a rich, multi-column panel below
the row — the site-navigation surface for a marketing header or a docs site,
not an application menu.

## Why not `role="menu"`

This is the single most important decision this component makes, so it is
worth stating plainly: **NavigationMenu is not a menu.** `role="menu"` /
`"menuitem"` describes an application menu of _commands_ — think a desktop
app's File menu, or this library's own `DropdownMenu` — and a screen reader
announces it that way, with menu-specific instructions and menu-specific
expectations about what the arrow keys do inside it. Site navigation is a
list of _destinations_, not commands, and behaves nothing like a command
menu: the "items" inside a panel are ordinary links a reader can open, copy,
or open in a new tab, none of which a real `role="menuitem"` supports well.

So this component builds the **disclosure navigation** pattern instead: a
`<nav>` containing a list, each item holding a `<button aria-expanded
aria-controls>` and a panel with a matching `id`. It also does not consume
this library's `_internals/menu.svelte.ts` — that module's real-DOM-focus
core is built specifically for `role="menu"` surfaces (`DropdownMenu`,
`ContextMenu`), and moving focus the way it does would only be correct if
this were one. NavigationMenu keeps its own, smaller keyboard model instead
(see below), close in spirit to `ToggleGroup`'s roving tabindex more than to
either menu component.

## Components

- `NavigationMenu` — the root: owns which item is open, the hover-intent
  timers, and the roving-tabindex position across the trigger row
- `NavigationMenuList` — the `<ul>` trigger row. Every panel anchors against
  this element, not against whichever trigger opened it
- `NavigationMenuItem` — one `<li>`; publishes its own `value` and the id
  pair linking its trigger to its panel
- `NavigationMenuTrigger` — the `▾` button that opens/closes its item's panel
- `NavigationMenuContent` — the panel, portalled to `document.body` and
  anchored under the trigger row
- `NavigationMenuLink` — a title + description row inside a panel, or (with
  `class="ft-navigation-menu-feature"`) the panel's highlighted feature tile

## Usage

```svelte
<script>
	import {
		NavigationMenu,
		NavigationMenuList,
		NavigationMenuItem,
		NavigationMenuTrigger,
		NavigationMenuContent,
		NavigationMenuLink,
	} from "fancy-ui-svelte";
</script>

<NavigationMenu label="Product">
	<NavigationMenuList>
		<NavigationMenuItem value="products">
			<NavigationMenuTrigger>Products</NavigationMenuTrigger>
			<NavigationMenuContent>
				<NavigationMenuLink
					href="/components"
					title="Components"
					description="Browse the full UI library"
					class="ft-navigation-menu-feature"
				/>
				<NavigationMenuLink href="/themes" title="Themes" description="Generate palettes" />
			</NavigationMenuContent>
		</NavigationMenuItem>
		<!-- A plain link that isn't a disclosure — no panel — wraps in its own <li>, same as every NavigationMenuItem. -->
		<li><a href="/pricing">Pricing</a></li>
	</NavigationMenuList>
</NavigationMenu>
```

`value` on `NavigationMenu` is bindable, `""` when every panel is closed —
use it to read or drive which item is open from outside, the same shape as
`onValueChange`.

## Keyboard model

- **Enter / Space / ArrowDown** on a trigger opens its panel and moves focus
  to the first focusable element inside it.
- **Escape** closes the open panel and returns focus to its trigger.
- **ArrowLeft / ArrowRight** move the roving tab stop between triggers,
  wrapping at the ends; **Home / End** jump straight to the first/last
  trigger. Exactly one trigger carries `tabindex="0"` at a time, the rest
  `tabindex="-1"` — the same roving-tabindex shape as `ToggleGroup`. If a
  panel is already open when you arrow to a different trigger, the panel
  follows immediately, the same "no re-delay" rule hover gets (below) —
  otherwise you'd be looking at a panel anchored under a trigger that no
  longer has focus.
- **Tab** out of an open panel is never trapped: it moves through the
  panel's links like any other content, and once focus leaves the panel
  entirely, the panel closes behind it — see Positioning below for why that
  matters.
- There is deliberately **no `onfocus` handler that opens a panel.** Only an
  explicit Enter/Space/ArrowDown does. A keyboard user tabbing _past_ a
  trigger on the way elsewhere must not pop its panel open, and — this is
  the part worth remembering if you're tempted to add one — Escape's own
  refocus of the trigger would immediately reopen the panel it just closed,
  since programmatic `.focus()` fires the same event a real Tab does. The
  component's test file pins this down explicitly.

## Hover-with-intent, both ways

- **`openDelay`** (default 150ms) keeps a panel from flickering open as the
  pointer merely crosses the trigger row on its way somewhere else.
- **`closeDelay`** (default 200ms) is what lets the pointer travel from a
  trigger down into its panel without the panel vanishing mid-trip: leaving
  the trigger starts the close timer, entering the panel cancels it, leaving
  the panel restarts it.
- **Moving from one open trigger to another is immediate, no delay.** Once
  something is already open, the pointer arriving on a different trigger is
  read as continuing along the row it already committed to, not as a fresh,
  possibly-accidental hover — re-running `openDelay` there is the flicker
  every hover-with-intent surface has to avoid past its first item. The same
  rule applies to keyboard arrowing between triggers (see above).

## Positioning

The panel anchors to the **trigger row** (`NavigationMenuList`'s own
element), start-aligned, not to whichever trigger opened it — the mockup
this component follows shows one panel edge that lines up with the row
regardless of which trigger is open. It renders through a portal to
`document.body`, so it escapes any ancestor `overflow: hidden`, and is
**not modal**: no focus trap, no scroll lock, and Tab is free to walk out of
it. That last point is also why a panel that loses focus entirely — Tab
carries it past the last link, or a pointer click lands somewhere else
focusable — closes itself: without a trap, "still open" and "still has your
attention" can otherwise drift apart, leaving an invisible-until-you-look
panel hanging off in the portal.

## Dismissal

Escape and an outside click both close through this library's shared
`dismissable` action (one Escape listener, shared with every other
dismissable surface in the app — see that module's own doc comment for why
a second one is a bug, not a feature). Both routes return focus to the
trigger; see the keyboard model above for why that refocus is safe and
doesn't fight the pointer.

## Props

### NavigationMenu

| Prop            | Type                      | Default  | Description                                                      |
| --------------- | ------------------------- | -------- | ---------------------------------------------------------------- |
| `value`         | `string`                  | `""`     | The open item's value, bindable. `""` when every panel is closed |
| `onValueChange` | `(value: string) => void` | —        | Called whenever the open item changes, from any trigger          |
| `label`         | `string`                  | `"Main"` | Accessible name for the `<nav>`                                  |
| `openDelay`     | `number`                  | `150`    | Delay in ms before a hovered trigger opens its panel             |
| `closeDelay`    | `number`                  | `200`    | Delay in ms before a panel closes after the pointer leaves it    |
| `children`      | `Snippet`                 | —        | Typically a single `NavigationMenuList`                          |
| `class`         | `string`                  | —        | Additional CSS classes for the `<nav>`                           |
| `ref`           | `HTMLElement \| null`     | `null`   | Bindable element reference for the `<nav>`                       |

### NavigationMenuList

| Prop       | Type                       | Default | Description                           |
| ---------- | -------------------------- | ------- | ------------------------------------- |
| `children` | `Snippet`                  | —       | `NavigationMenuItem`s and plain links |
| `class`    | `string`                   | —       | Additional CSS classes                |
| `ref`      | `HTMLUListElement \| null` | `null`  | Bindable element reference            |

### NavigationMenuItem

| Prop       | Type      | Default | Description                                                                                   |
| ---------- | --------- | ------- | --------------------------------------------------------------------------------------------- |
| `value`    | `string`  | —       | This item's value — what `NavigationMenu`'s `value` becomes while its panel is open. Required |
| `children` | `Snippet` | —       | A `NavigationMenuTrigger` + `NavigationMenuContent` pair                                      |
| `class`    | `string`  | —       | Additional CSS classes                                                                        |

### NavigationMenuTrigger

| Prop       | Type                        | Default | Description                |
| ---------- | --------------------------- | ------- | -------------------------- |
| `children` | `Snippet`                   | —       | The trigger's label        |
| `class`    | `string`                    | —       | Additional CSS classes     |
| `ref`      | `HTMLButtonElement \| null` | `null`  | Bindable element reference |

### NavigationMenuContent

| Prop       | Type                     | Default | Description                                               |
| ---------- | ------------------------ | ------- | --------------------------------------------------------- |
| `children` | `Snippet`                | —       | The panel's content, typically a feature tile + link rows |
| `class`    | `string`                 | —       | Additional CSS classes                                    |
| `ref`      | `HTMLDivElement \| null` | `null`  | Bindable element reference                                |

### NavigationMenuLink

| Prop          | Type      | Default | Description                                                                       |
| ------------- | --------- | ------- | --------------------------------------------------------------------------------- |
| `href`        | `string`  | —       | Destination URL. Required                                                         |
| `current`     | `boolean` | `false` | Marks this as the current page: `aria-current="page"` + current-row styling       |
| `title`       | `string`  | —       | The row's title. Ignored when `children` is given                                 |
| `description` | `string`  | —       | The row's supporting text, under the title. Ignored when `children` is given      |
| `external`    | `boolean` | `false` | Opens in a new tab with a safe `rel`, and adds an sr-only note                    |
| `children`    | `Snippet` | —       | Full override for the row's content — e.g. the feature tile's icon + title layout |
| `class`       | `string`  | —       | Additional CSS classes                                                            |

## Theming

| Custom property   | Declared in             | Read by                                                            |
| ----------------- | ----------------------- | ------------------------------------------------------------------ |
| `--ft-nav-accent` | `NavigationMenuContent` | `NavigationMenuLink`'s `.ft-navigation-menu-feature` utility class |

`--ft-nav-accent` falls back through `--ft-accent` (the brand purple shared,
by name only, across this library's components) to a `light-dark()` pair
when neither is set:

```css
--ft-nav-accent: var(
	--ft-accent,
	light-dark(oklch(0.5432 0.2528 300.22), oklch(0.604 0.2606 301.75))
);
```

It is declared exactly once, on `NavigationMenuContent`'s own root — **not**
on `NavigationMenu`'s `<nav>`. That placement is deliberate, not
incidental: `NavigationMenuContent` is moved to `document.body` by
`use:portal`, which severs the DOM ancestry a custom property would
otherwise inherit through, so a declaration up on `<nav>` would never reach
anything rendered inside a panel — the panel's real ancestor chain, once
mounted, runs through `document.body`, not through wherever `<NavigationMenu>`
sits in your page.

This cuts the other way too, and it's worth being explicit about: **because
the panel is portalled, it cannot inherit a `--ft-accent` set on a wrapper
elsewhere in the page** — only a value set at or above `<body>` (e.g. on
`:root`) reaches it. Retinting the feature tile by wrapping `<NavigationMenu>`
in a styled container and setting `--ft-accent` on that container will
silently do nothing to the panel, for the same reason the component doesn't
declare its own fallback on `<nav>`. Never redeclare `--ft-nav-accent` or
`--ft-accent` on a nearer ancestor either way — that would shadow whatever
was set above it.

Set `class="ft-navigation-menu-feature"` on the one `NavigationMenuLink` in
a panel meant to read as the feature tile (see Usage above) — it applies
the gradient `color-mix(in oklch, var(--ft-nav-accent) …, transparent)`
build from that token plus the same cyan used elsewhere in this library's
navigation family. It is a class, not a boolean prop, because the mockup
this component follows only ever shows one per panel — a prop would exist
for a single call site.

If `--ft-nav-accent` is ever unresolved where `.ft-navigation-menu-feature`
reads it, the failure is quiet in a different way than you might expect from
a portal: the whole declaration is `background: linear-gradient(...)`, and
`background` is **not** an inherited property, so an unresolved `var()`
inside it makes that declaration invalid at computed-value time and it falls
to its initial value — the gradient simply never paints, rather than
computing to some ambient color the way an inherited property (`color`,
say) would. The tile renders with no fill at all; nothing in the console
says why.

Everything else — the panel's `bg-popover`/`border-border`, the active
trigger's `bg-accent`, a current link's `bg-accent` — reads this app's
ordinary semantic tokens and needs no local fallback.

## Implementation notes

- **Two contexts, not one.** The root context (`NavigationMenuContext`,
  `types.ts`) is shared by every piece and owns the single source of truth:
  which item is open, the timers, the roving position. The item context
  (`NavigationMenuItemContext`) is re-provided by each `NavigationMenuItem`
  and only ever holds that one item's own `value` and id pair. A trigger or
  panel reads both — the item context to know who it is, the root context
  to know (and change) what's open.
- **Roving order comes from a live DOM query, not registration order** —
  the same reasoning `ToggleGroup` documents for its own `move`/
  `moveToEdge`: a trigger that mounts out of order still navigates in
  visual order, because the arrow-key handlers re-query
  `NavigationMenuList`'s element at the moment a key is pressed rather than
  trusting the order triggers happened to register in. A small `$state`
  array (`registeredOrder`) still exists purely so _something_ reactive
  changes when a trigger mounts or unmounts — Svelte's array proxy notifies
  on `push`/`splice`, which is why it's an array and not a `Set`/`Map`.
- **The keyboard-focus-into-panel handoff is a one-shot request, not a
  direct call.** `NavigationMenuTrigger`'s Enter/Space/ArrowDown handler
  calls `root.requestFocus(value)` right after opening; the panel doesn't
  exist yet at that point (it mounts from the `{#if}` the _next_ render).
  `NavigationMenuContent`'s own `$effect` — which only runs once the panel
  is actually in the DOM — consumes that request and moves focus to the
  first link, or to the panel's own root if there isn't one. A hover- or
  click-open never sets the request, so focus is untouched either way.
- **`close()` always refocuses the closing item's trigger**, whether the
  dismissal was Escape or an outside click — both route through the same
  function (see Dismissal above), and `dismissable`'s callback carries no
  information about which one fired. For Escape that refocus is exactly the
  documented requirement. For an outside click on another focusable
  element, a real browser's own default mousedown action — which runs
  _after_ every listener, including this one — sends focus to whatever was
  actually clicked regardless, so the forced refocus only ever "sticks" for
  a click on non-focusable space, where landing on the trigger beats
  falling back to `<body>`. jsdom does not implement that default action
  (see the component's own test file), so the refocus is unconditionally
  visible in tests there — which is also the correct outcome for the
  Escape path the tests actually assert on.
- **A panel that loses focus on its own — Tab past the last link, a click
  elsewhere — closes without trying to refocus anything.** That's a
  separate code path from `close()` (see `collapseIfOpen`): forcing focus
  back onto the trigger here would yank it away from wherever the user's
  click or Tab just legitimately sent it.
- What jsdom cannot prove, and is therefore stated in a comment beside the
  code rather than asserted in the test file: it does not implement
  focus-follows-mousedown as a default action, so the "outside click
  refocus" fallback above is unconditionally exercised in tests, not just
  in the fallback case a real browser would narrow it to.

# `Sidebar` — port notes

`Sidebar`, `SidebarGroup`, `SidebarItem`, `SidebarSeparator`, `SidebarFooter`
and the `SIDEBAR_KEY` context, ported from `src/lib/fancy-ui/sidebar/`. One
file per source file; the two `<style>` blocks became `sidebar.css` and
`sidebar-item.css`, both already anchored on the class the source names
(`.ft-sidebar`, `.ft-sidebar-item`), so nothing had to be invented to scope
them.

## The context

The source publishes a read-only `{ collapsed }` object under a `Symbol`
context key. React's own context object plays that role here, so the exported
name `SIDEBAR_KEY` is kept and its value is a `React.Context` (the
`ButtonGroup` precedent). The source's `get collapsed()` getter becomes a
plain object rebuilt in `useMemo` keyed on `collapsed` — the rebuild is what
re-renders `SidebarGroup`, `SidebarItem` and `SidebarFooter`, which is the
same live behaviour the getter bought. Every consumer reads it with
`useContext` and treats `undefined` as `collapsed: false`, so a subcomponent
rendered outside a `Sidebar` degrades instead of throwing, exactly as before.

`collapsed` stays a plain prop with no controlled/uncontrolled split: nothing
inside the compound ever changes it, so there is nothing to round-trip.

## Port register

- **`class` → `className`, `onclick` → `onClick`.** The house rename; the
  handler's guard (`disabled` ⇒ `preventDefault()` and no callback) is
  unchanged, and still the thing that actually stops a synthetic click on both
  the anchor and the button branch.
- **`ref` props → `forwardRef`.** On `Sidebar`, `SidebarItem`,
  `SidebarSeparator` and `SidebarFooter` — exactly the four that declare
  `ref = $bindable(null)`. `SidebarGroup` declares none and gets none.
  `SidebarItem` forwards through `Ref<HTMLAnchorElement>` /
  `Ref<HTMLButtonElement>` casts at the two branches, the `RainbowButton`
  pattern for a polymorphic root.
- **`$props.id()` → `useFancyId()`.** Same guarantee: the group heading's id
  exists in the first server-rendered markup, so `aria-labelledby` never points
  at nothing.
- **No rest-prop spread.** The source reads a closed prop list off `$props()`
  and spreads nothing, so the props interfaces here extend no DOM attribute set
  either — the Svelte API surface is the contract, per component.
- **`SidebarHarness.test.svelte` collapsed into `Sidebar.test.tsx`.** A
  `.test.svelte` file exists only because a Svelte component needs its own
  file; the React harness is declared at the top of the test file. The `await
  tick()` after each toggle is gone — `fireEvent` flushes React's update
  synchronously — and nothing else about the assertions changed.

## Package-level gap (not fixable from this folder)

`react/tailwind.css` declares `--color-background` and `--color-ring` but not
`--color-accent`, `--color-accent-foreground`, `--color-muted-foreground` or
`--color-border`. `SidebarItem`'s current/hover fill (`bg-accent`,
`text-accent-foreground`), the muted label colours (`text-muted-foreground`,
`text-muted-foreground/70`) and the separator's `border-border` therefore
resolve to nothing in an app that does not already ship the shadcn token set.
This is the same class of gap PORTING.md §Styling rule 6 covers, and the fix
belongs in `react/tailwind.css`, which this folder does not own. The accent bar
and the badge fill are unaffected — both run off the component's own
`--ft-nav-accent` fallback, declared locally in the two CSS files.

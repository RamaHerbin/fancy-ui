/**
 * The contract between `Sidebar` and everything nested inside it.
 *
 * `Sidebar` owns the collapsed/expanded state and publishes it through
 * context so `SidebarGroup`, `SidebarItem` and `SidebarFooter` can each
 * adapt their own rendering (icon-only, `sr-only` labels) without the state
 * being threaded down as a prop through every layer by hand. Unlike
 * `ToggleGroupContext`, this context is read-only from the consumer side —
 * there is no `toggle`/`setCollapsed` method here on purpose: `collapsed` is
 * driven entirely from outside the compound (a consumer's own trigger,
 * bound through `Sidebar`'s `collapsed` prop), never by anything nested
 * inside it.
 *
 * A subcomponent mounted outside a `Sidebar` degrades instead of throwing —
 * `getContext` returns `undefined` and every consumer treats that the same
 * as `collapsed: false`. See each subcomponent for the exact fallback.
 */

/** What `Sidebar` publishes. Nested components read it; only `Sidebar` writes it. */
export interface SidebarContext {
	/** Whether the sidebar is currently in its icon-only, collapsed state. */
	readonly collapsed: boolean;
}

export const SIDEBAR_KEY: unique symbol = Symbol("sidebar-context");

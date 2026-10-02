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
 * passed through `Sidebar`'s `collapsed` prop), never by anything nested
 * inside it.
 *
 * A subcomponent mounted outside a `Sidebar` degrades instead of throwing —
 * `inject` returns `undefined` and every consumer treats that the same as
 * `collapsed: false`. See each subcomponent for the exact fallback.
 */

import type { InjectionKey } from "vue";

/** What `Sidebar` publishes. Nested components read it; only `Sidebar` writes it. */
export interface SidebarContext {
	/** Whether the sidebar is currently in its icon-only, collapsed state. */
	readonly collapsed: boolean;
}

/**
 * The same symbol the source publishes the context under, now carrying the
 * value type so `provide`/`inject` are checked. Read it as optional — a
 * subcomponent rendered outside a `Sidebar` gets `undefined` rather than
 * throwing:
 *
 * ```ts
 * const sidebar = inject<SidebarContext | undefined>(SIDEBAR_KEY, undefined);
 * ```
 */
export const SIDEBAR_KEY: InjectionKey<SidebarContext> = Symbol("sidebar-context");

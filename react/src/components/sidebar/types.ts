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
 * the context reads `undefined` and every consumer treats that the same as
 * `collapsed: false`. See each subcomponent for the exact fallback.
 */

import { createContext } from "react";

/** What `Sidebar` publishes. Nested components read it; only `Sidebar` writes it. */
export interface SidebarContext {
	/** Whether the sidebar is currently in its icon-only, collapsed state. */
	readonly collapsed: boolean;
}

/**
 * The context nested components read to learn whether the surrounding rail is
 * collapsed. The source publishes it under a `Symbol` context key; React's own
 * context object plays that role here, so the exported name is kept and the
 * value is a `React.Context` rather than a symbol:
 *
 * ```tsx
 * const sidebar = useContext(SIDEBAR_KEY);
 * ```
 *
 * Read it as optional — a subcomponent rendered outside a `Sidebar` gets
 * `undefined` rather than throwing.
 */
export const SIDEBAR_KEY = createContext<SidebarContext | undefined>(undefined);
SIDEBAR_KEY.displayName = "SidebarContext";

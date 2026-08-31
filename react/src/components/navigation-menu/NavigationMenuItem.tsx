import { useMemo } from "react";
import type { ReactNode } from "react";

import { cn } from "../../utils.js";
import { useFancyId } from "../../internals/use-id.js";
import { NAVIGATION_MENU_ITEM_KEY } from "./types.js";
import type { NavigationMenuItemContext } from "./types.js";

export interface NavigationMenuItemProps {
	/** This item's value — what `NavigationMenu`'s `value` becomes while its panel is open. */
	value: string;
	/** A `NavigationMenuTrigger` + `NavigationMenuContent` pair. */
	children?: ReactNode;
	/** Additional CSS classes. */
	className?: string;
}

/**
 * One disclosure in the row: its trigger, its panel, and the identity that
 * ties the two together.
 *
 * The source exposes no ref here, so neither does this (PORTING.md's
 * per-component ref rule).
 */
export function NavigationMenuItem({ value, children, className }: NavigationMenuItemProps) {
	// Stable across SSR and hydration — `uid()` throws on the server, and the
	// trigger's `aria-controls` / the panel's `aria-labelledby` need to agree
	// with themselves from the first server-rendered paint (convention C-6).
	const baseId = useFancyId();

	// Memoised on its two scalar inputs, so a re-render that changes neither
	// does not re-run the effects the trigger and the panel key on this
	// object's members.
	const context = useMemo<NavigationMenuItemContext>(
		() => ({ value, triggerId: `${baseId}-trigger`, contentId: `${baseId}-content` }),
		[value, baseId]
	);

	return (
		<NAVIGATION_MENU_ITEM_KEY.Provider value={context}>
			<li className={cn("ft-navigation-menu-item", className)}>{children}</li>
		</NAVIGATION_MENU_ITEM_KEY.Provider>
	);
}

NavigationMenuItem.displayName = "NavigationMenuItem";

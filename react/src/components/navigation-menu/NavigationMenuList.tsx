import { forwardRef, useEffect } from "react";
import type { ReactNode } from "react";

import { cn } from "../../utils.js";
import { useComposedRefs } from "../../internals/dom/use-composed-refs.js";
import { useElementRef } from "../../internals/dom/use-element-ref.js";
import { useNavigationMenuContext } from "./types.js";

export interface NavigationMenuListProps {
	/** The `NavigationMenuItem`s (and any plain link that isn't a disclosure). */
	children?: ReactNode;
	/** Additional CSS classes. */
	className?: string;
}

export const NavigationMenuList = forwardRef<HTMLUListElement, NavigationMenuListProps>(
	function NavigationMenuList({ children, className }, forwardedRef) {
		const { setListRef } = useNavigationMenuContext();

		// Convention C-1: the NODE, not a ref. The root keys work on this
		// element's existence — a panel anchors against it and the trigger row
		// is queried from it — so it has to publish itself the moment it
		// appears, not one `[]`-deps effect too late.
		const [node, setNode] = useElementRef<HTMLUListElement>();

		// Convention C-2: composed at the top of the body, never inside the JSX.
		const listRef = useComposedRefs(setNode, forwardedRef);

		// This is the element every panel anchors against (start-aligned to the
		// whole row, not to whichever trigger opened it — see
		// NavigationMenuContent) and the element trigger buttons are queried
		// from for roving-tabindex order. Handing the root a plain element
		// reference, not a render prop, keeps `NavigationMenuTrigger` /
		// `NavigationMenuContent` unaware that a `NavigationMenuList` even
		// exists.
		useEffect(() => {
			setListRef(node);
			return () => setListRef(null);
		}, [setListRef, node]);

		return (
			<ul
				ref={listRef}
				className={cn(
					"ft-navigation-menu-list m-0 flex list-none items-center gap-1 p-0",
					className
				)}
			>
				{children}
			</ul>
		);
	}
);

NavigationMenuList.displayName = "NavigationMenuList";

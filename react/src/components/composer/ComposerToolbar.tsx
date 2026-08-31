import type { ReactNode } from "react";

import { cn } from "../../utils.js";

/**
 * Props for ComposerToolbar
 */
export interface ComposerToolbarProps {
	/** The controls on the rail, laid out left to right in source order. */
	children?: ReactNode;
	/** Additional CSS classes */
	className?: string;
}

/**
 * The bottom rail of a composer: one row, one gap, no opinions about what sits
 * on it. A model picker, an attach button and a send button are all just
 * children here, laid out left to right in source order.
 *
 * The trailing spacer convention
 * ------------------------------
 * The rail lays everything out from the left. Anything that belongs on the
 * right — the send button, a token meter — is pushed there by a spacer the
 * integrator writes into `children`, rather than by a second slot this
 * component would have to invent:
 *
 * ```tsx
 * <ComposerToolbar>
 *   <ComposerModelPicker models={models} />
 *   <div className="flex-1" />
 *   <ComposerSubmit />
 * </ComposerToolbar>
 * ```
 *
 * One flexible box, any number of groups, and the split stays visible in the
 * consumer's markup instead of being buried in ours.
 *
 * Deliberately not `role="toolbar"`: that role promises arrow-key roving focus
 * between its controls, and a row that announces itself as a toolbar without
 * implementing that is worse for a keyboard user than a plain row of tab stops.
 */
export function ComposerToolbar({ children, className }: ComposerToolbarProps) {
	return (
		<div className={cn("ft-composer-toolbar flex items-center gap-1", className)}>{children}</div>
	);
}

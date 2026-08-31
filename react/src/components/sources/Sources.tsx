import { forwardRef, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "../../utils.js";
import type { SourceData } from "../../internals/ai-types.js";
import { useFancyId } from "../../internals/use-id.js";
import { SourcesTrigger } from "./SourcesTrigger.js";
import { SourcesList } from "./SourcesList.js";
import { SOURCES_CONTEXT_KEY } from "./types.js";
import type { SourcesContext } from "./types.js";

/**
 * Props for Sources
 */
export interface SourcesProps {
	/** The documents backing the answer, in the order they should be read. */
	sources: SourceData[];
	/** Whether the list is expanded. Starts closed. */
	open?: boolean;
	/** Called whenever the list opens or closes. */
	onToggle?: (open: boolean) => void;
	/** Replaces the default trigger-and-list composition entirely. */
	children?: ReactNode;
	/** Additional CSS classes */
	className?: string;
}

/**
 * The citations under an answer: a pill you can ignore and a set of cards you
 * can scan.
 *
 * The root element arrives through the ref channel rather than a `ref` prop,
 * per PORTING.md — the Svelte source declares `ref = $bindable(null)`.
 */
export const Sources = forwardRef<HTMLDivElement, SourcesProps>(function Sources(
	{ sources, open: openProp, onToggle, children, className },
	ref
) {
	// The Svelte source's `open` is `$bindable(false)`: a consumer can bind it,
	// or leave it alone and let the component keep writing its own copy. React
	// has no such channel, so the prop is controlled when it is passed and this
	// local copy takes over when it is not. Either way `onToggle` fires with the
	// same value.
	const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
	const isControlled = openProp !== undefined;
	const open = isControlled ? openProp : uncontrolledOpen;

	const uid = useFancyId();
	const listId = `${uid}-list`;

	// Rebuilt only when something a part reads actually changes — that rebuild is
	// what re-renders the trigger and the list below, and it is the React
	// counterpart of the Svelte context's live getters.
	const context = useMemo<SourcesContext>(
		() => ({
			open: { current: open },
			count: sources.length,
			sources,
			listId,
			toggle() {
				const next = !open;
				if (!isControlled) setUncontrolledOpen(next);
				onToggle?.(next);
			},
		}),
		[open, sources, listId, isControlled, onToggle]
	);

	return (
		<SOURCES_CONTEXT_KEY.Provider value={context}>
			<div ref={ref} className={cn("ft-sources w-full", className)} data-open={open}>
				{children ?? (
					<>
						<SourcesTrigger />
						<SourcesList />
					</>
				)}
			</div>
		</SOURCES_CONTEXT_KEY.Provider>
	);
});

import { useContext } from "react";
import type { CSSProperties, ReactNode } from "react";
import { cn } from "../../utils.js";
import { useInertAttribute } from "../../internals/dom/use-inert-attribute.js";
import type { SourceData } from "../../internals/ai-types.js";
import { SourceCard } from "./SourceCard.js";
import { SOURCES_CONTEXT_KEY } from "./types.js";
import "./sources-list.css";

/**
 * Props for SourcesList
 */
export interface SourcesListProps {
	/** Replaces the default card. Receives the source and its index. */
	item?: (source: SourceData, index: number) => ReactNode;
	/** Additional CSS classes */
	className?: string;
}

/** The expanding region of cards. */
export function SourcesList({ item, className }: SourcesListProps) {
	// Undefined when the list is used outside a Sources root: it then renders an
	// empty, permanently open region rather than throwing.
	const sources = useContext(SOURCES_CONTEXT_KEY);

	const items = sources?.sources ?? [];
	const isOpen = sources?.open.current ?? true;
	const inertRef = useInertAttribute<HTMLUListElement>(!isOpen);

	return (
		<div className={cn("ft-sources-list", isOpen && "ft-open")}>
			<div className="overflow-hidden">
				{/*
					`inert` is written straight to the node by `useInertAttribute`, never
					as a JSX prop: `inert={true}` is dropped by React 18 and `inert=""` is
					rejected by React 19, so no single prop spelling covers this package's
					peer range. The hook emits the same attribute on both.
				*/}
				<ul
					ref={inertRef}
					id={sources?.listId}
					aria-label="Sources"
					className={cn("ft-sources-grid", className)}
				>
					{items.map((source, index) => (
						/*
							The entrance animation hangs off `.ft-in` rather than mount, because
							the cards never unmount: collapsing is a height transition over live
							DOM, so re-adding the class is the only thing that can replay it.
						*/
						<li
							key={source.id}
							className={cn("ft-sources-item", isOpen && "ft-in")}
							style={{ "--ft-sources-index": index } as CSSProperties}
						>
							{item ? item(source, index) : <SourceCard source={source} />}
						</li>
					))}
				</ul>
			</div>
		</div>
	);
}

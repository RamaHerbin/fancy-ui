import { useContext } from "react";
import { cn } from "../../utils.js";
import { hostOf, monogram } from "../../internals/host.js";
import { SOURCES_CONTEXT_KEY } from "./types.js";
import "./sources-trigger.css";

/**
 * Props for SourcesTrigger
 */
export interface SourcesTriggerProps {
	/** Overrides the count line. Defaults to "4 sources", singular at one. */
	label?: string;
	/** Additional CSS classes */
	className?: string;
}

/** How many monograms fit in the stack before it stops meaning anything. */
const STACK_LIMIT = 3;

/** The collapsed pill: monogram stack, count, chevron. */
export function SourcesTrigger({ label, className }: SourcesTriggerProps) {
	// Undefined when the pill is used outside a Sources root: it then renders an
	// empty, inert count rather than throwing.
	const sources = useContext(SOURCES_CONTEXT_KEY);

	const count = sources?.count ?? 0;
	const isOpen = sources?.open.current ?? false;
	const stack = (sources?.sources ?? []).slice(0, STACK_LIMIT);
	const text = label ?? `${count} ${count === 1 ? "source" : "sources"}`;

	return (
		<button
			type="button"
			className={cn(
				"ft-sources-trigger text-muted-foreground hover:text-foreground inline-flex items-center gap-2 rounded-full px-2 py-1 text-xs",
				className
			)}
			aria-expanded={isOpen}
			aria-controls={sources?.listId}
			onClick={() => sources?.toggle()}
		>
			{stack.length > 0 && (
				// Decorative: every name in it is spelled out in the list below.
				<span className="ft-sources-stack flex flex-none items-center" aria-hidden="true">
					{stack.map((source) => (
						<span key={source.id} className="ft-sources-chip">
							{monogram(source.domain || hostOf(source.url) || source.title)}
						</span>
					))}
				</span>
			)}

			<span className="font-medium">{text}</span>

			<svg
				className={cn("ft-sources-chevron size-3 flex-none", isOpen && "ft-open")}
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2.5"
				strokeLinecap="round"
				strokeLinejoin="round"
				aria-hidden="true"
			>
				<path d="m9 6 6 6-6 6" />
			</svg>
		</button>
	);
}

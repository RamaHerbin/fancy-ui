import { useContext } from "react";
import { cn } from "../../utils.js";
import { CHAT_MESSAGE_CONTEXT_KEY } from "./types.js";

/**
 * Props for ChatMessageBranches
 */
export interface ChatMessageBranchesProps {
	/** Which version is on screen, 1-based. */
	index: number;
	/** How many versions exist. */
	count: number;
	/** Asked to show another version, by 1-based index. Required — the navigator holds no state. */
	onNavigate: (index: number) => void;
	/** Additional CSS classes */
	className?: string;
}

const buttonClass =
	"text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring inline-flex size-6 cursor-pointer items-center justify-center rounded-md transition-colors focus-visible:ring-1 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40";

/** The "2/3" version navigator that sits under a regenerated answer. */
export function ChatMessageBranches({
	index,
	count,
	onNavigate,
	className,
}: ChatMessageBranchesProps) {
	// Only used to decide which edge the navigator hugs; absent context is fine.
	const message = useContext(CHAT_MESSAGE_CONTEXT_KEY);

	const atStart = index <= 1;
	const atEnd = index >= count;

	return (
		<div
			className={cn(
				"text-muted-foreground flex items-center gap-0.5 text-xs",
				message?.role === "user" && "justify-end",
				className
			)}
			role="group"
			aria-label="Response versions"
		>
			<button
				type="button"
				className={buttonClass}
				aria-label="Previous version"
				disabled={atStart}
				onClick={() => onNavigate(index - 1)}
			>
				<svg
					className="size-3.5"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2.5"
					strokeLinecap="round"
					strokeLinejoin="round"
					aria-hidden="true"
				>
					<path d="m15 18-6-6 6-6" />
				</svg>
			</button>

			<span className="tabular-nums">
				{index}/{count}
			</span>

			<button
				type="button"
				className={buttonClass}
				aria-label="Next version"
				disabled={atEnd}
				onClick={() => onNavigate(index + 1)}
			>
				<svg
					className="size-3.5"
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
		</div>
	);
}

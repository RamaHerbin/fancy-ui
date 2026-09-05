import { forwardRef } from "react";
import type { ReactNode } from "react";
import { cn } from "../../utils.js";

/**
 * Props for ChatEmptyState
 */
export interface ChatEmptyStateProps {
	/** The greeting, read as the heading of the empty conversation. */
	title?: string;
	/** A line under the greeting saying what this assistant is for. */
	description?: string;
	/** Decorative mark above the greeting, replacing the default sparkle. */
	icon?: ReactNode;
	/** Rendered under the description — where `PromptSuggestions` belongs. */
	children?: ReactNode;
	/** Additional CSS classes */
	className?: string;
}

export const ChatEmptyState = forwardRef<HTMLDivElement, ChatEmptyStateProps>(
	function ChatEmptyState(
		{ title = "How can I help?", description, icon, children, className },
		ref
	) {
		return (
			<div
				ref={ref}
				className={cn(
					"ft-empty text-muted-foreground flex h-full flex-col items-center justify-center gap-3 px-6 py-16 text-center",
					className
				)}
			>
				{/*
				 * Decorative by definition: the greeting below carries the meaning, so
				 * the mark is hidden from the accessibility tree whether it is ours or
				 * a consumer's.
				 */}
				<span className="ft-empty-icon" aria-hidden="true">
					{icon ?? (
						<svg
							className="size-8 opacity-60"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="1.5"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<path d="M11 5 12.6 10.9 18.5 12.5 12.6 14.1 11 20 9.4 14.1 3.5 12.5 9.4 10.9Z" />
							<path d="M18.5 3 19.1 5.4 21.5 6 19.1 6.6 18.5 9 17.9 6.6 15.5 6 17.9 5.4Z" />
						</svg>
					)}
				</span>

				<h2 className="ft-empty-title text-foreground text-lg font-semibold text-balance">
					{title}
				</h2>

				{description ? (
					<p className="ft-empty-description max-w-prose text-sm leading-relaxed text-balance">
						{description}
					</p>
				) : null}

				{children ? (
					<div className="ft-empty-extra mt-2 flex w-full flex-col items-center">{children}</div>
				) : null}
			</div>
		);
	}
);

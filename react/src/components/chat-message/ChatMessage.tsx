import { forwardRef, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "../../utils.js";
import { StreamingText } from "../streaming-text/StreamingText.js";
import { formatRelativeTime } from "../../internals/relative-time.js";
import { useNow } from "../../internals/use-elapsed.js";
import { CHAT_MESSAGE_CONTEXT_KEY } from "./types.js";
import type { ChatMessageContext } from "./types.js";
import "./chat-message.css";

/**
 * Props for ChatMessage
 */
export interface ChatMessageProps {
	/** Who produced this turn. Drives alignment, chrome, and the accessible name. */
	role?: "user" | "assistant" | "system";
	/** The message body. Growing strings animate — see StreamingText's contract. */
	content?: string;
	/** Whether `content` is still arriving. Passed through to the body renderer. */
	streaming?: boolean;
	/** Render the body as markdown instead of a tinted plain-text stream. */
	markdown?: boolean;
	/** When the turn was produced. Rendered relative, with the exact time as its tooltip. */
	timestamp?: Date | number;
	/** Rendered beside the body: an image, initials, an icon. */
	avatar?: ReactNode;
	/** Replaces the default body rendering entirely. `content` is then ignored. */
	children?: ReactNode;
	/** Action buttons, in a rail that fades in on hover or focus. Put `ChatMessageActions` here. */
	actions?: ReactNode;
	/** Rendered under the body — where `ChatMessageBranches` belongs. */
	footer?: ReactNode;
	/** Additional CSS classes */
	className?: string;
}

const LABELS = {
	user: "User message",
	assistant: "Assistant message",
	system: "System message",
} as const;

/**
 * One turn in a conversation: an avatar, a body that can still be arriving, a
 * relative timestamp, an action rail and a footer.
 *
 * The root element arrives through the ref channel rather than a `ref` prop,
 * per PORTING.md — the Svelte source declares `ref = $bindable(null)`.
 */
export const ChatMessage = forwardRef<HTMLElement, ChatMessageProps>(function ChatMessage(
	{
		role = "assistant",
		content = "",
		streaming = false,
		markdown = false,
		timestamp,
		avatar,
		children,
		actions,
		footer,
		className,
	},
	ref
) {
	// Pointer and focus are tracked separately and OR-ed: a pointer leaving the
	// message while a button inside it still holds focus must not yank the rail
	// out from under the keyboard.
	const [pointerInside, setPointerInside] = useState(false);
	const [focusInside, setFocusInside] = useState(false);
	const hovered = pointerInside || focusInside;

	// Rebuilt only when something a child reads actually changes — that rebuild
	// is what re-renders the rail and the branch navigator below.
	const context = useMemo<ChatMessageContext>(
		() => ({ role, streaming, hovered: { current: hovered } }),
		[role, streaming, hovered]
	);

	const isUser = role === "user";
	const isSystem = role === "system";

	const time =
		timestamp === undefined
			? undefined
			: timestamp instanceof Date
				? timestamp.getTime()
				: timestamp;
	const isValidTime = time !== undefined && Number.isFinite(time);

	// A message left mounted through a long-lived session must not freeze at
	// whatever age it had on first paint. `useNow` is the shared clock: a thread
	// of fifty messages costs one interval, and it stops once the last consumer
	// unmounts. `formatRelativeTime` is never called with a defaulted
	// `Date.now()` (convention C-7) — the clock's value is always passed in.
	const now = useNow();

	const relative = isValidTime ? formatRelativeTime(time as number, { now }) : "";
	const iso = isValidTime ? new Date(time as number).toISOString() : undefined;

	const body = children ?? <StreamingText text={content} streaming={streaming} markdown={markdown} />;

	return (
		<CHAT_MESSAGE_CONTEXT_KEY.Provider value={context}>
			<article
				ref={ref}
				className={cn(
					"ft-message flex w-full gap-3",
					isUser && "flex-row-reverse",
					isSystem && "justify-center",
					className
				)}
				data-role={role}
				aria-label={LABELS[role]}
				onPointerEnter={() => setPointerInside(true)}
				onPointerLeave={() => setPointerInside(false)}
				// React backs `onFocus`/`onBlur` with the native focusin/focusout
				// pair, so these are the `onfocusin`/`onfocusout` of the source:
				// they fire for a button focused anywhere inside the turn.
				onFocus={() => setFocusInside(true)}
				onBlur={() => setFocusInside(false)}
			>
				{isSystem ? (
					<div className="text-muted-foreground flex max-w-prose flex-col items-center gap-1 py-1 text-center">
						<div
							className="text-xs leading-relaxed text-balance"
							aria-live="polite"
							aria-atomic="true"
							aria-busy={streaming}
						>
							{body}
						</div>
						{relative ? (
							<time
								className="text-[0.6875rem] tabular-nums opacity-80"
								dateTime={iso}
								title={iso}
							>
								{relative}
							</time>
						) : null}
						{footer}
					</div>
				) : (
					<>
						{avatar ? <div className="ft-message-avatar mt-0.5 shrink-0">{avatar}</div> : null}

						<div
							className={cn(
								"flex min-w-0 flex-col gap-1.5",
								isUser ? "items-end" : "w-full",
								isUser && "ft-message-capped"
							)}
						>
							<div
								className={cn(
									"text-sm leading-relaxed",
									isUser && "rounded-2xl px-4 py-2.5",
									isUser && "ft-message-bubble"
								)}
								aria-live="polite"
								aria-atomic="true"
								aria-busy={streaming}
							>
								{body}
							</div>

							{relative || actions ? (
								<div className={cn("flex items-center gap-2", isUser && "flex-row-reverse")}>
									{relative ? (
										<time
											className="text-muted-foreground text-xs tabular-nums"
											dateTime={iso}
											title={iso}
										>
											{relative}
										</time>
									) : null}
									{actions}
								</div>
							) : null}

							{footer}
						</div>
					</>
				)}
			</article>
		</CHAT_MESSAGE_CONTEXT_KEY.Provider>
	);
});

import { useContext } from "react";
import type { ReactNode } from "react";
import { cn } from "../../utils.js";
import { CHAT_MESSAGE_CONTEXT_KEY } from "./types.js";
import "./chat-message-actions.css";

/**
 * Props for ChatMessageActions
 */
export interface ChatMessageActionsProps {
	/** Keep the rail on screen even when the message is neither hovered nor focused. */
	alwaysVisible?: boolean;
	/** The buttons — `ChatMessageAction` elements. */
	children?: ReactNode;
	/** Additional CSS classes */
	className?: string;
}

/** The rail of buttons under a turn, revealed on hover or focus. */
export function ChatMessageActions({
	alwaysVisible = false,
	children,
	className,
}: ChatMessageActionsProps) {
	// Undefined when the rail is used outside a ChatMessage: it then behaves as a
	// plain always-hidden-until-focused button group rather than throwing.
	const message = useContext(CHAT_MESSAGE_CONTEXT_KEY);

	const visible = alwaysVisible || (message?.hovered.current ?? false);

	return (
		<div
			className={cn(
				"ft-message-actions flex items-center gap-0.5",
				className,
				visible && "ft-visible"
			)}
			role="group"
			aria-label="Message actions"
		>
			{children}
		</div>
	);
}

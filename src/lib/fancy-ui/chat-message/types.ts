/**
 * The contract between the chat-message root and its parts.
 *
 * `ChatMessage` publishes a live, read-only view of the turn it is rendering;
 * every child reads it through `getContext` instead of having the same three
 * values threaded back down as props. The getters keep it reactive: a child that
 * reads `hovered.current` inside its own reactive scope re-runs when the root's
 * pointer state changes.
 */

/** What the root publishes. Children read it; only the root writes it. */
export interface ChatMessageContext {
	readonly role: "user" | "assistant" | "system";
	readonly streaming: boolean;
	readonly hovered: { readonly current: boolean };
}

export const CHAT_MESSAGE_CONTEXT_KEY = Symbol("chat-message-context");

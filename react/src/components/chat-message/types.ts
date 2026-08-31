/**
 * The contract between the chat-message root and its parts.
 *
 * `ChatMessage` publishes a live, read-only view of the turn it is rendering;
 * every child reads it through context instead of having the same three values
 * threaded back down as props. The root rebuilds the object whenever one of
 * those values changes, which is what re-renders the parts below it — the React
 * counterpart of the Svelte context's live getters.
 */

import { createContext } from "react";

/** What the root publishes. Children read it; only the root writes it. */
export interface ChatMessageContext {
	readonly role: "user" | "assistant" | "system";
	readonly streaming: boolean;
	readonly hovered: { readonly current: boolean };
}

/**
 * The context a part reads to find the root above it. The Svelte source
 * publishes it under a `Symbol` context key; React's own context object plays
 * that role here, so the exported name is kept and the value is a
 * `React.Context` rather than a symbol:
 *
 * ```tsx
 * const message = useContext(CHAT_MESSAGE_CONTEXT_KEY);
 * ```
 *
 * Read it as optional. Every shipped part does, so a part rendered outside a
 * root degrades instead of throwing.
 */
export const CHAT_MESSAGE_CONTEXT_KEY = createContext<ChatMessageContext | undefined>(undefined);
CHAT_MESSAGE_CONTEXT_KEY.displayName = "ChatMessageContext";

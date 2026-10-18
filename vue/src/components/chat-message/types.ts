/**
 * The contract between the chat-message root and its parts.
 *
 * `ChatMessage` publishes a live, read-only view of the turn it is rendering;
 * every child reads it through `inject` instead of having the same three values
 * threaded back down as props. The getters keep it reactive: a child that reads
 * `hovered.current` inside its own reactive scope re-runs when the root's
 * pointer state changes.
 */

import type { InjectionKey } from "vue";

/** What the root publishes. Children read it; only the root writes it. */
export interface ChatMessageContext {
	readonly role: "user" | "assistant" | "system";
	readonly streaming: boolean;
	readonly hovered: { readonly current: boolean };
	/**
	 * Whether this message plays sound cues — forwarded from the root's own
	 * `sound` prop. Optional so a part read outside a `ChatMessage` root
	 * (`message?.sound`) falls through to `undefined`, which is the correct
	 * "no sound" answer there too.
	 */
	readonly sound?: boolean;
}

/**
 * The same symbol the source publishes the context under, now carrying the
 * value type so `provide`/`inject` are checked:
 *
 * ```ts
 * const message = inject(CHAT_MESSAGE_CONTEXT_KEY, undefined);
 * ```
 *
 * Read it as optional. Every shipped part does, so a part rendered outside a
 * root degrades instead of throwing.
 */
export const CHAT_MESSAGE_CONTEXT_KEY: InjectionKey<ChatMessageContext> =
	Symbol("chat-message-context");

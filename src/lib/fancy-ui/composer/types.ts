/**
 * The contract between the composer root and its parts.
 *
 * `Composer` owns the draft — the text, the attachments, the textarea element —
 * and publishes a live, read-only view of it plus the handful of commands a part
 * may issue. Every part reads it through `getContext` instead of having six
 * values and four callbacks threaded back down as props, and every part must
 * render harmlessly (inert, no-op) when the context is absent, so a part dropped
 * outside a composer degrades instead of throwing.
 *
 * The getters keep it reactive: a part that reads `value.current` inside its own
 * reactive scope re-runs when the root's draft changes.
 *
 * `textareaRef` is typed read-only because exactly one part writes it —
 * `ComposerInput`, which registers its own element through a documented cast to
 * the writable shape the root actually publishes. Everyone else reads.
 */

import type { AttachmentData } from "../_internals/ai-types.js";

/** What the root publishes. Parts read it; only the root writes it. */
export interface ComposerContext {
	/** The current draft text, exactly as typed — untrimmed. */
	readonly value: { readonly current: string };
	/** The attachments riding along with the draft. The consumer owns this list. */
	readonly attachments: { readonly current: AttachmentData[] };
	/** Nothing may be typed, sent, or attached. */
	readonly disabled: boolean;
	/** A response is arriving: send becomes stop. */
	readonly streaming: boolean;
	/**
	 * Whether `stop()` reaches anyone. The root always publishes a callable
	 * `stop`, so a control asking "is there a handler behind it" has to ask this
	 * instead — otherwise a stop button offers itself with nothing to stop.
	 */
	readonly stoppable: boolean;
	/** The live textarea, once `ComposerInput` has mounted one. */
	readonly textareaRef: { readonly current: HTMLTextAreaElement | null };
	/** Send the draft. No-ops while disabled, while streaming, and on an empty draft. */
	submit(): void;
	/** Interrupt the stream. No-ops unless the composer is streaming. */
	stop(): void;
	/** Replace the draft outright. */
	setValue(next: string): void;
	/**
	 * Splice `text` in at the caret. With `replaceTriggerToken`, the trigger token
	 * the caret sits in — the whitespace-delimited run before it, when that run
	 * opens with a non-alphanumeric character — is replaced instead, and the
	 * completion closes with a trailing space.
	 */
	insertText(text: string, replaceTriggerToken?: boolean): void;
	/** Hand files to the consumer. It uploads them and pushes onto `attachments`. */
	addFiles(files: File[]): void;
	/** Drop one attachment from the draft by id. */
	removeAttachment(id: string): void;
}

export const COMPOSER_CONTEXT_KEY = Symbol("composer-context");

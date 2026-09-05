/**
 * The contract between the composer root and its parts.
 *
 * `Composer` owns the draft — the text, the attachments, the textarea element —
 * and publishes a live, read-only view of it plus the handful of commands a part
 * may issue. Every part reads it through context instead of having six values
 * and four callbacks threaded back down as props, and every part must render
 * harmlessly (inert, no-op) when the context is absent, so a part dropped
 * outside a composer degrades instead of throwing.
 *
 * The root rebuilds the object on every render, which is what makes a part that
 * reads `value.current` re-render when the draft changes. The commands are
 * identity-stable and always call the root's latest logic, so a handle captured
 * once — a menu's long-lived listener, a test's probe — never goes stale.
 *
 * `textareaRef` is typed read-only because exactly one part writes it —
 * `ComposerInput`, which registers its own element through a documented cast to
 * the writable shape the root actually publishes. Everyone else reads. It is the
 * one member of the object that is NOT rebuilt per render: the root publishes a
 * single accessor pair backed by a ref, so a write lands immediately and still
 * wakes the parts that render off it.
 */

import { createContext } from "react";

import type { AttachmentData } from "../../internals/ai-types.js";

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
	/**
	 * Whether this composer plays sound cues — forwarded from the root's own
	 * `sound` prop. Parts read `composer?.sound ?? false`, so a part rendered
	 * outside a `Composer` stays silent rather than throwing.
	 */
	readonly sound?: boolean;
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

/**
 * The context the parts read to find their root.
 *
 * The source publishes it under a `Symbol` context key; React's own context
 * object plays that role here, so the exported name is kept and the value is a
 * `React.Context` rather than a symbol:
 *
 * ```tsx
 * const composer = useContext(COMPOSER_CONTEXT_KEY);
 * ```
 *
 * Read it as optional — a part rendered outside a `Composer` gets `undefined`
 * rather than throwing.
 */
export const COMPOSER_CONTEXT_KEY = createContext<ComposerContext | undefined>(undefined);
COMPOSER_CONTEXT_KEY.displayName = "ComposerContext";

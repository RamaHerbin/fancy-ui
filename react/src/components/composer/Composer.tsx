import { forwardRef, useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";

import { cn } from "../../utils.js";
import { useConstant } from "../../internals/dom/ssr.js";
import { useEventCallback } from "../../internals/dom/use-event-callback.js";
import type { AttachmentData } from "../../internals/ai-types.js";
import { findTokenStart } from "./caret.js";
import { ComposerInput } from "./ComposerInput.js";
import { ComposerSubmit } from "./ComposerSubmit.js";
import { COMPOSER_CONTEXT_KEY } from "./types.js";
import type { ComposerContext } from "./types.js";
import "./composer.css";

/**
 * Props for Composer
 */
export interface ComposerProps {
	/**
	 * The draft text. Controlled when passed — report every write through
	 * `onValueChange`; leave it out and the composer keeps its own copy.
	 * Cleared by a successful submit.
	 */
	value?: string;
	/** Called with the draft on every write the composer makes: typing, an insertion, a clear. */
	onValueChange?: (value: string) => void;
	/**
	 * Files riding along with the draft. Controlled when passed — the consumer
	 * owns uploading them and reports removals back through
	 * `onAttachmentsChange`.
	 */
	attachments?: AttachmentData[];
	/** Called with the remaining attachments whenever the composer drops one. */
	onAttachmentsChange?: (attachments: AttachmentData[]) => void;
	/** Blocks typing, sending, and attaching. */
	disabled?: boolean;
	/** A response is arriving: the send button becomes a stop button. */
	streaming?: boolean;
	/** Placeholder for the default input. Ignored once `children` replaces the composition. */
	placeholder?: string;
	/** Called with the trimmed draft and a snapshot of the attachments. */
	onSubmit?: (payload: { text: string; attachments: AttachmentData[] }) => void;
	/** Called when the stop button is pressed while streaming. */
	onStop?: () => void;
	/** Called with the files handed to `addFiles`. Upload them, then push onto `attachments`. */
	onAttach?: (files: File[]) => void;
	/** Replaces the default input-and-send-row composition entirely. */
	children?: ReactNode;
	/** An overlay covering the composer — a voice panel, a drop target, a confirmation. */
	accessory?: ReactNode;
	/** Additional CSS classes */
	className?: string;
}

/** Shared empty list, so the uncontrolled seed is one allocation for the module. */
const NO_ATTACHMENTS: AttachmentData[] = [];

/**
 * The root of the composer compound: it owns the draft and publishes it.
 *
 * The form element arrives through the ref channel rather than a `ref` prop,
 * per PORTING.md — the source declares `ref = $bindable(null)`.
 */
export const Composer = forwardRef<HTMLFormElement, ComposerProps>(function Composer(
	{
		value: valueProp,
		onValueChange,
		attachments: attachmentsProp,
		onAttachmentsChange,
		disabled = false,
		streaming = false,
		placeholder,
		onSubmit,
		onStop,
		onAttach,
		children,
		accessory,
		className,
	},
	forwardedRef
) {
	// The source's `value` is `$bindable("")` and `attachments` is
	// `$bindable([])`: a consumer can bind either, or leave it alone and let the
	// component keep writing its own copy. React has no such channel, so each
	// prop is controlled when it is passed and the local copy takes over when it
	// is not. Either way the `on*Change` callback fires with the same payload.
	const [uncontrolledValue, setUncontrolledValue] = useState("");
	const value = valueProp !== undefined ? valueProp : uncontrolledValue;

	const [uncontrolledAttachments, setUncontrolledAttachments] =
		useState<AttachmentData[]>(NO_ATTACHMENTS);
	const attachments = attachmentsProp !== undefined ? attachmentsProp : uncontrolledAttachments;

	// Written by ComposerInput through the context, read by insertText's caret
	// arithmetic. A composer with no input part keeps it null and falls back to
	// appending at the end of the draft.
	//
	// The ref holds the element so a write lands the instant it is made — the
	// context object every part reads is rebuilt per render, but this accessor
	// pair is not, so a part that stored it (or a test that captured it) keeps
	// reaching the live element. The state beside it exists only to re-render
	// the parts that render off the element's arrival: the completion menus,
	// which are nothing at all until an input has registered one.
	const textareaElRef = useRef<HTMLTextAreaElement | null>(null);
	const [, setRegisteredTextarea] = useState<HTMLTextAreaElement | null>(null);
	const textareaRef = useConstant(() => ({
		get current(): HTMLTextAreaElement | null {
			return textareaElRef.current;
		},
		set current(next: HTMLTextAreaElement | null) {
			textareaElRef.current = next;
			setRegisteredTextarea(next);
		},
	}));

	// Where insertText wants the caret once its write has reached the DOM, and
	// the render that guarantees the effect below gets a chance to put it there
	// even when the consumer ignores `onValueChange`. The counterpart of the
	// source's `void tick().then(...)`.
	const pendingCaretRef = useRef<{ el: HTMLTextAreaElement; caret: number } | null>(null);
	const [, setCaretNonce] = useState(0);

	function applyValue(next: string) {
		if (valueProp === undefined) setUncontrolledValue(next);
		onValueChange?.(next);
	}

	function applyAttachments(next: AttachmentData[]) {
		if (attachmentsProp === undefined) setUncontrolledAttachments(next);
		onAttachmentsChange?.(next);
	}

	// Every command is identity-stable and always runs the latest render's
	// logic: a part holds one of these across its whole life (a menu's document
	// listener, an input's mount registration) and must never call a closure
	// over a draft that has moved on.
	const submit = useEventCallback(() => {
		// A composer that is off or already busy sends nothing, whatever the draft
		// says — the send button is disabled in both states, but Enter and a
		// programmatic `submit()` reach here too.
		if (disabled || streaming) return;
		const text = value.trim();
		if (text === "" && attachments.length === 0) return;
		// With nobody listening there is nowhere for the draft to go, and clearing
		// it would throw away text the reader has no way of getting back.
		if (!onSubmit) return;
		// A copy, so a consumer stashing the payload does not end up holding the
		// live list it is about to mutate.
		onSubmit({ text, attachments: [...attachments] });
		// The text is ours to clear; the attachments belong to the consumer, who
		// alone knows whether an upload is still in flight.
		applyValue("");
	});

	const stop = useEventCallback(() => {
		if (!streaming) return;
		onStop?.();
	});

	const setValue = useEventCallback((next: string) => {
		applyValue(next);
	});

	const insertText = useEventCallback((text: string, replaceTriggerToken = false) => {
		// A composer that is off or already busy takes no dictation either — the
		// textarea is readonly in both states, and a menu writing through the
		// context would be the one way around that.
		if (disabled || streaming) return;
		const current = value;
		const el = textareaElRef.current;
		const rawEnd = el?.selectionEnd;
		const end = typeof rawEnd === "number" ? rawEnd : current.length;
		const rawStart = el?.selectionStart;
		const selectionStart = typeof rawStart === "number" ? Math.min(rawStart, end) : end;

		// The menus' own definition of a token, not a second one that could drift
		// from it: what a menu matched is exactly what a completion overwrites.
		const trigger = replaceTriggerToken ? findTokenStart(current, end) : -1;
		const start = trigger >= 0 ? trigger : selectionStart;
		const trailing = current.slice(end);

		// Completing a token leaves the caret ready for the next word; a plain
		// insert splices exactly what it was handed, and nothing more.
		const needsSpace = trigger >= 0 && !/\s$/.test(text) && !/^\s/.test(trailing);
		const insertion = needsSpace ? `${text} ` : text;
		const caret = start + insertion.length;

		applyValue(`${current.slice(0, start)}${insertion}${trailing}`);

		if (!el) return;
		// The caret can only be placed once the value has reached the DOM, so it
		// waits for the commit. Focus comes back with it: the insertion was almost
		// certainly triggered from a menu that stole it.
		pendingCaretRef.current = { el, caret };
		setCaretNonce((nonce) => nonce + 1);
	});

	const addFiles = useEventCallback((files: File[]) => {
		if (disabled || files.length === 0) return;
		onAttach?.(files);
	});

	const removeAttachment = useEventCallback((id: string) => {
		applyAttachments(attachments.filter((attachment) => attachment.id !== id));
	});

	// No dependency list: the caret restore has to run on the commit that carried
	// the insertion, whichever render that turns out to be. It disarms itself.
	useEffect(() => {
		const pending = pendingCaretRef.current;
		if (!pending) return;
		pendingCaretRef.current = null;
		if (!pending.el.isConnected) return;
		pending.el.focus();
		pending.el.setSelectionRange(pending.caret, pending.caret);
	});

	// Rebuilt every render on purpose: the rebuild is what re-renders the parts
	// reading the draft off it. Never memoise it.
	const context: ComposerContext = {
		value: { current: value },
		attachments: { current: attachments },
		disabled,
		streaming,
		stoppable: typeof onStop === "function",
		// Declared read-only on ComposerContext so no other part writes it; the
		// setter exists for ComposerInput alone, which registers its element here
		// on mount. See the note at the top of types.ts.
		textareaRef,
		submit,
		stop,
		setValue,
		insertText,
		addFiles,
		removeAttachment,
	};

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		// Nothing here navigates: the draft leaves through onSubmit.
		event.preventDefault();
		submit();
	}

	return (
		<COMPOSER_CONTEXT_KEY.Provider value={context}>
			<form
				ref={forwardedRef}
				className={cn(
					"ft-composer relative flex w-full flex-col border p-2",
					className,
					disabled && "ft-composer-disabled"
				)}
				data-streaming={streaming ? "" : undefined}
				onSubmit={handleSubmit}
			>
				{children ?? (
					<>
						<ComposerInput placeholder={placeholder} />
						<div className="mt-2 flex items-center gap-2">
							<div className="flex-1" />
							<ComposerSubmit />
						</div>
					</>
				)}

				{accessory ? (
					<div className="ft-composer-accessory absolute inset-0 z-10">{accessory}</div>
				) : null}
			</form>
		</COMPOSER_CONTEXT_KEY.Provider>
	);
});

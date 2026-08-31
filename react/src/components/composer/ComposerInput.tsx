import { forwardRef, useContext, useEffect, useRef } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";

import { cn } from "../../utils.js";
import { useElementRef } from "../../internals/dom/use-element-ref.js";
import { useComposedRefs } from "../../internals/dom/use-composed-refs.js";
import { COMPOSER_CONTEXT_KEY } from "./types.js";
import "./composer-input.css";

/**
 * Props for ComposerInput
 */
export interface ComposerInputProps {
	/** Shown while the draft is empty. */
	placeholder?: string;
	/** Height, in lines, before anything has been typed. Also the SSR height. */
	rows?: number;
	/** Height ceiling, in lines. Past it the textarea scrolls instead of growing. */
	maxRows?: number;
	/** Take focus on mount. */
	autofocus?: boolean;
	/** Additional CSS classes */
	className?: string;
}

/** Used when the platform reports no usable line-height, e.g. under jsdom. */
const FALLBACK_LINE_HEIGHT = 20;
/** Multiplier applied to the font size when only that is measurable. */
const NORMAL_LINE_RATIO = 1.5;

/**
 * A line count a textarea can actually be built from.
 *
 * `rows={0}` collapses the box to nothing and `maxRows={NaN}` poisons every
 * height derived from it — both arrive from a consumer computing the number
 * rather than writing it, so they fall back instead of reaching the geometry.
 */
function lines(count: number, fallback: number): number {
	const whole = Math.floor(count);
	return Number.isFinite(whole) && whole >= 1 ? whole : fallback;
}

function px(input: string): number {
	const parsed = Number.parseFloat(input);
	return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * The composer's textarea: auto-growing, Enter-to-send, registered into the root.
 *
 * The textarea arrives through the ref channel rather than a `ref` prop, per
 * PORTING.md — the source declares `ref = $bindable(null)`.
 */
export const ComposerInput = forwardRef<HTMLTextAreaElement, ComposerInputProps>(
	function ComposerInput(
		{ placeholder = "Message…", rows = 1, maxRows = 8, autofocus = false, className },
		forwardedRef
	) {
		// Undefined when the input is used outside a Composer: it then behaves as a
		// plain uncontrolled textarea rather than throwing, and Enter does nothing.
		const composer = useContext(COMPOSER_CONTEXT_KEY);

		// The node, not a ref: the mount registration below is keyed on it, and a
		// `[]`-deps effect reading a ref would be the bug convention C-1 exists to
		// remove.
		const [node, setNode] = useElementRef<HTMLTextAreaElement>();
		const ref = useComposedRefs(forwardedRef, setNode);

		const value = composer?.value.current ?? "";

		const minLines = lines(rows, 1);
		// A ceiling below the floor is not a ceiling: the box would be told to grow
		// and to stop growing at the same height.
		const maxLines = Math.max(lines(maxRows, 8), minLines);
		// Readonly rather than disabled: a disabled textarea drops out of the tab
		// order and stops announcing its content, and a reader mid-draft should still
		// be able to select and copy what they wrote while a response streams in.
		const locked = (composer?.disabled ?? false) || (composer?.streaming ?? false);

		// Measured once from the mounted element — line-height does not change under
		// this component's feet, and re-reading it on every keystroke would force a
		// layout for an answer we already have.
		const metricsRef = useRef<{ line: number; extra: number } | null>(null);

		function measure(el: HTMLTextAreaElement): { line: number; extra: number } {
			if (metricsRef.current) return metricsRef.current;
			const style = getComputedStyle(el);
			const declared = Number.parseFloat(style.lineHeight);
			const fontSize = Number.parseFloat(style.fontSize);
			const line =
				Number.isFinite(declared) && declared > 0
					? declared
					: Number.isFinite(fontSize) && fontSize > 0
						? fontSize * NORMAL_LINE_RATIO
						: FALLBACK_LINE_HEIGHT;
			const padding = px(style.paddingTop) + px(style.paddingBottom);
			// scrollHeight covers content and padding but never the border, which a
			// border-box height does include.
			const border =
				style.boxSizing === "border-box"
					? px(style.borderTopWidth) + px(style.borderBottomWidth)
					: 0;
			metricsRef.current = { line, extra: padding + border };
			return metricsRef.current;
		}

		/**
		 * Fit the box to its content, between the declared rows and the ceiling.
		 *
		 * `height: auto` first, otherwise scrollHeight reports the box we last set
		 * rather than the text inside it, and the textarea can only ever grow.
		 */
		function grow() {
			const el = node;
			if (!el) return;
			const { line, extra } = measure(el);
			el.style.height = "auto";
			const content = el.scrollHeight;
			const min = minLines * line + extra;
			const max = maxLines * line + extra;
			const height = Math.min(Math.max(content, min), max);
			el.style.height = `${height}px`;
			el.style.overflowY = content > max ? "auto" : "hidden";
		}

		function handleInput(event: ChangeEvent<HTMLTextAreaElement>) {
			composer?.setValue(event.currentTarget.value);
			grow();
		}

		function handleKeydown(event: KeyboardEvent<HTMLTextAreaElement>) {
			if (event.key !== "Enter" || event.shiftKey) return;
			// Mid-composition Enter belongs to the IME, which is picking a candidate,
			// not to the composer.
			if (event.nativeEvent.isComposing) return;
			event.preventDefault();
			composer?.submit();
		}

		useEffect(() => {
			// Registering here rather than through a prop keeps the wiring inside the
			// pair that needs it: the root's caret arithmetic reaches the element, and
			// no consumer has to thread a ref between two components it composed.
			// The cast is the documented escape hatch from the read-only view every
			// other part sees — see the note at the top of types.ts. The slot is the
			// one member of the context the root does NOT rebuild per render, so
			// capturing it here for the life of the node is safe.
			if (!node) return;
			const slot = composer?.textareaRef as
				| { current: HTMLTextAreaElement | null }
				| undefined;
			if (slot) slot.current = node;
			if (autofocus) node.focus();
			grow();
			return () => {
				// Only retract our own registration: a second input may have replaced
				// us in the slot already.
				if (slot && slot.current === node) slot.current = null;
			};
			// eslint-disable-next-line react-hooks/exhaustive-deps
		}, [node]);

		// Growth has to answer to programmatic writes too — an inserted slash command
		// or a restored draft never passes through the input handler. Reads the draft,
		// writes only the element's style, so it can never wake itself.
		useEffect(() => {
			grow();
			// eslint-disable-next-line react-hooks/exhaustive-deps
		}, [value, node]);

		return (
			<textarea
				ref={ref}
				className={cn(
					"ft-composer-input placeholder:text-muted-foreground w-full resize-none bg-transparent px-2 py-1.5 text-sm leading-relaxed outline-none",
					className
				)}
				rows={minLines}
				placeholder={placeholder}
				// Controlled by the root's draft, and only by it. Outside a composer
				// there is no draft to control, and a permanently-empty controlled
				// value would erase every keystroke the moment React restored it —
				// where the source's one-way `value={value}` simply never fires again.
				value={composer ? value : undefined}
				readOnly={locked}
				aria-disabled={locked ? "true" : undefined}
				onChange={handleInput}
				onKeyDown={handleKeydown}
			/>
		);
	}
);

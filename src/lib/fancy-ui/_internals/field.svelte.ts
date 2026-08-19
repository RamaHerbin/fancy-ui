/**
 * The contract between a FormField and whatever control it wraps.
 *
 * `FormField` owns the id, the label/help/error wiring and the required/
 * disabled flags; every control in this wave (Input, Textarea, Checkbox, ...)
 * reads all of that through `getField()` instead of a caller threading ids
 * and aria attributes by hand. A control mounted outside a `FormField`
 * degrades to `undefined` — it must still work standalone, falling back to
 * its own props, exactly like `ToggleGroupItem` degrades outside a
 * `ToggleGroup`.
 *
 * `FieldContext` below is the frozen surface every other component in this
 * wave was built against — its shape must not change. `createFieldState` is
 * this file's own implementation detail: what `FormField` actually
 * constructs and publishes, and the only thing that changes if the wiring
 * inside `describedBy` ever needs to change.
 */

import { getContext } from "svelte";

/** Context key `FormField` publishes under. Consumers read it only via `getField()`. */
export const FIELD_KEY: unique symbol = Symbol("field-context");

/** What a `FormField` publishes to the control (and `Label`) it wraps. */
export interface FieldContext {
	/**
	 * The id the labelled control must carry. Pair it with a native
	 * `for`/`id` association — only meaningful for a control whose *root* is
	 * one of the elements `<label for>` can target (button, input, meter,
	 * output, progress, select, textarea). A control whose root is anything
	 * else (a `<div role="radiogroup">`, say) must use `labelId` below
	 * instead — `for` cannot reach it, ARIA role or not.
	 */
	readonly controlId: string;
	/**
	 * Id of the rendered `<label>` element, for a control whose root is not
	 * one `for` can target — point that control's own `aria-labelledby` at
	 * this instead. `undefined` when `FormField` renders no label of its
	 * own (no `label` prop given). Optional for the same reason `valid` is —
	 * see its doc comment.
	 */
	readonly labelId?: string;
	/** Space-joined ids of whichever help and error text are actually rendered, or undefined. */
	readonly describedBy: string | undefined;
	readonly invalid: boolean;
	/**
	 * Whether the field is explicitly marked as passing validation. Never
	 * `true` while `invalid` is `true` — a control that reads both should
	 * still treat them as mutually exclusive, but this is the authority on
	 * that, not an assumption a control has to make itself.
	 *
	 * Optional, not required: this was added after four other builders had
	 * already coded their own controls, harnesses and hand-built
	 * `FieldContext` object literals against the original five-field shape.
	 * Making it required would have been a breaking change to a contract
	 * that was frozen out from under them — every one of those literals
	 * would fail to type-check the moment this file changed, with none of
	 * their own files touched to explain why. Optional keeps every existing
	 * literal valid as-is; `createFieldState`'s own output always populates
	 * it, so `FormField` itself never has to treat it as absent — only a
	 * hand-built context that predates this field does, and `undefined`
	 * there reads the same as `false` to a `field?.valid ?? false` consumer.
	 */
	readonly valid?: boolean;
	readonly required: boolean;
	readonly disabled: boolean;
}

/** Returns the surrounding FormField's context, or undefined when there is none. */
export function getField(): FieldContext | undefined {
	return getContext<FieldContext | undefined>(FIELD_KEY);
}

/**
 * Reactive inputs `createFieldState` builds a `FieldContext` from. Every
 * entry is a getter rather than a plain value so the returned context stays
 * live as `FormField`'s own props change, without this module needing its
 * own `$state` mirror of them.
 */
export interface FieldStateOptions {
	/** The id to publish as `controlId`. */
	controlId: () => string;
	/** The id to publish as `labelId`, or undefined while no label is rendered. */
	labelId: () => string | undefined;
	/** The id the help paragraph carries while it is rendered. */
	descriptionId: () => string;
	/** The id the error paragraph carries while it is rendered. */
	errorId: () => string;
	/** Whether the help paragraph is currently rendered. */
	hasDescription: () => boolean;
	/** Whether the error paragraph is currently rendered. */
	hasError: () => boolean;
	/** Whether the field is explicitly marked valid. The caller decides how this interacts with `hasError` — see `valid`'s own doc comment on `FieldContext`. */
	valid: () => boolean;
	required: () => boolean;
	disabled: () => boolean;
}

/**
 * Builds the object `FormField` publishes via `setContext(FIELD_KEY, ...)`.
 *
 * `describedBy` is read, not stored: every access re-derives it from
 * `hasDescription()`/`hasError()`, the same two flags `FormField`'s own
 * `{#if}` blocks gate the help/error paragraphs on. That is what keeps the
 * id list honest — a described-by id only ever appears while the element it
 * points at is actually in the DOM, because both are driven by the exact
 * same read, in the exact same reactive pass. A separate mount/unmount
 * registration written into `$state` would add a step between "the
 * paragraph is in the DOM" and "the id is in the list" — and that step runs
 * inside `$effect`, which never fires during SSR, so the very first paint
 * would carry the paragraph without the attribute pointing at it. Deriving
 * directly avoids that entirely: `describedBy` is exactly as correct on the
 * server-rendered HTML as it is after hydration.
 */
export function createFieldState(options: FieldStateOptions): FieldContext {
	return {
		get controlId() {
			return options.controlId();
		},
		get labelId() {
			return options.labelId();
		},
		get describedBy() {
			const ids: string[] = [];
			if (options.hasDescription()) ids.push(options.descriptionId());
			if (options.hasError()) ids.push(options.errorId());
			return ids.length > 0 ? ids.join(" ") : undefined;
		},
		get invalid() {
			return options.hasError();
		},
		get valid() {
			// Enforced here, not trusted from the caller: `hasError` always wins,
			// so a control reading `field.valid` never has to also check
			// `field.invalid` itself to get the "error still wins" rule right.
			return options.valid() && !options.hasError();
		},
		get required() {
			return options.required();
		},
		get disabled() {
			return options.disabled();
		},
	};
}

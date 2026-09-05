/**
 * The contract between a FormField and whatever control it wraps.
 *
 * `FormField` owns the id, the label/help/error wiring and the required/
 * disabled flags; every control in this wave (Input, Textarea, Checkbox, ...)
 * reads all of that through `useField()` instead of a caller threading ids
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

import { createContext, createElement, useContext } from "react";
import type { ReactNode } from "react";

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

/**
 * Inputs `createFieldState` builds a `FieldContext` from. Every entry is a
 * plain value, where the Svelte source takes a getter: React re-renders
 * `FormField` when any of these nine change, and the rebuilt context object
 * is what makes the controls below it re-render. A getter would buy nothing
 * here and would defeat the `useMemo` dependency array documented on
 * `createFieldState`.
 */
export interface FieldStateOptions {
	/** The id to publish as `controlId`. */
	controlId: string;
	/** The id to publish as `labelId`, or undefined while no label is rendered. */
	labelId: string | undefined;
	/** The id the help paragraph carries while it is rendered. */
	descriptionId: string;
	/** The id the error paragraph carries while it is rendered. */
	errorId: string;
	/** Whether the help paragraph is currently rendered. */
	hasDescription: boolean;
	/** Whether the error paragraph is currently rendered. */
	hasError: boolean;
	/** Whether the field is explicitly marked valid. The caller decides how this interacts with `hasError` — see `valid`'s own doc comment on `FieldContext`. */
	valid: boolean;
	required: boolean;
	disabled: boolean;
}

/**
 * Builds the object `FormField` publishes through `<FieldProvider value={...}>`.
 *
 * `describedBy` is derived, not registered: it is computed from
 * `hasDescription`/`hasError`, the same two flags `FormField`'s own
 * conditionals gate the help/error paragraphs on. That is what keeps the id
 * list honest — a described-by id only ever appears while the element it
 * points at is actually in the DOM, because both are driven by the exact
 * same read, in the exact same render pass. A separate mount/unmount
 * registration written into state would add a step between "the paragraph is
 * in the DOM" and "the id is in the list" — and that step runs inside
 * `useEffect`, which never fires during SSR, so the very first paint would
 * carry the paragraph without the attribute pointing at it. Deriving
 * directly avoids that entirely: `describedBy` is exactly as correct on the
 * server-rendered HTML as it is after hydration.
 *
 * Pure and framework-free, so `FormField` calls it from a `useMemo` keyed on
 * the nine scalars — a field-by-field dependency array, never the options
 * object, so the identity is stable across unrelated parent re-renders and
 * changes exactly when a consumer must re-render:
 *
 * ```ts
 * const field = useMemo(
 *   () => createFieldState({ controlId, labelId, descriptionId, errorId,
 *     hasDescription, hasError, valid, required, disabled }),
 *   [controlId, labelId, descriptionId, errorId, hasDescription, hasError, valid, required, disabled]
 * );
 * ```
 */
export function createFieldState(options: FieldStateOptions): FieldContext {
	const ids: string[] = [];
	if (options.hasDescription) ids.push(options.descriptionId);
	if (options.hasError) ids.push(options.errorId);

	return {
		controlId: options.controlId,
		labelId: options.labelId,
		describedBy: ids.length > 0 ? ids.join(" ") : undefined,
		invalid: options.hasError,
		// Enforced here, not trusted from the caller: `hasError` always wins,
		// so a control reading `field.valid` never has to also check
		// `field.invalid` itself to get the "error still wins" rule right.
		valid: options.valid && !options.hasError,
		required: options.required,
		disabled: options.disabled,
	};
}

/**
 * The context `FormField` publishes under. Consumers read it only via
 * `useField()`.
 *
 * Its default is `undefined`, which is the whole "no FormField above me"
 * case: a control outside a provider reads back exactly what a provider that
 * published `undefined` would have given it.
 */
export const FieldReactContext = createContext<FieldContext | undefined>(undefined);
FieldReactContext.displayName = "FieldContext";

export interface FieldProviderProps {
	/** The context object, built by `createFieldState`. */
	value: FieldContext;
	children?: ReactNode;
}

/** Publishes a `FieldContext` to every control rendered beneath it. */
export function FieldProvider({ value, children }: FieldProviderProps): ReactNode {
	return createElement(FieldReactContext.Provider, { value }, children);
}

/** Returns the surrounding FormField's context, or undefined when there is none. */
export function useField(): FieldContext | undefined {
	return useContext(FieldReactContext);
}

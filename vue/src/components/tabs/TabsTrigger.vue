<script lang="ts">
import type { HTMLAttributes } from "vue";

export interface TabsTriggerProps {
	/** This trigger's value — which `TabsContent` it activates. */
	value: string;
	/** Disables just this trigger. A disabled trigger is skipped by the arrows and Home/End. */
	disabled?: boolean;
	/** Additional CSS classes. */
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, useTemplateRef, watch } from "vue";
import { cn } from "../../utils.js";
import { TABS_KEY } from "./types.js";

defineOptions({ name: "TabsTrigger", inheritAttrs: false });

const { value, disabled = false, class: className } = defineProps<TabsTriggerProps>();

defineSlots<{ default?(): unknown }>();

const el = useTemplateRef<HTMLButtonElement>("el");
defineExpose({ ref: el });

// Undefined outside a Tabs root: the trigger then has no selection or
// roving order to take part in, and renders as a plain, always-tabbable,
// permanently-unselected button rather than throwing — same degradation
// as ToggleGroupItem/RadioGroupItem.
const context = TABS_KEY.useOptional();

const isDisabled = computed(() => disabled);
const isSelected = computed(() => context?.isSelected(value) ?? false);
const variant = computed(() => context?.variant ?? "underline");
const orientation = computed(() => context?.orientation ?? "horizontal");
// `undefined` outside a Tabs root leaves the native default (a plain
// button is already in the tab order on its own); inside one, exactly
// the trigger holding the roving position gets 0 and every other gets -1.
const tabIndexAttr = computed(() =>
	context ? (context.focusedValue === value ? 0 : -1) : undefined
);

// Geometry, not just colour, branches on variant: the mockup gives the
// segmented pill a tighter box than the underline tab — 6px/12px versus
// 8px/13px — not merely a different background.
//
// Neither branch paints the selection's *shape* any more: the segmented
// pill's fill and the underline bar are both drawn by `TabsList`'s single
// sliding indicator, which can travel between triggers in a way a
// per-trigger background never could. What stays here is the part a
// screen reader and a forced-colors user rely on — `aria-selected` below,
// and the selected trigger's own foreground colour.
//
// `ft-tabs-trigger-selected` carries no rules of its own now. It stays in
// the class string because it is a published styling hook, and dropping it
// would silently break any consumer targeting it.
const classes = computed(() =>
	cn(
		"ft-tabs-trigger inline-flex shrink-0 cursor-pointer items-center justify-center whitespace-nowrap px-[14px] font-medium transition-colors",
		"focus-visible:outline-none",
		"disabled:pointer-events-none disabled:opacity-50",
		variant.value === "segmented"
			? cn(
					"rounded-md py-[6px] text-[12px]",
					isSelected.value
						? "text-accent-foreground"
						: "text-muted-foreground hover:text-foreground"
				)
			: cn(
					"py-2 text-[13px]",
					isSelected.value
						? "ft-tabs-trigger-selected text-foreground"
						: "text-muted-foreground hover:text-foreground"
				),
		className
	)
);

// Tracks the disabled transition across re-runs so the lifecycle below can
// tell "just became disabled" apart from "already was" or "just became
// enabled". A plain variable, not reactive state — only these two passes
// ever read or write it, and nothing needs to react to it changing.
let wasDisabled = false;
// Set by the pre-flush capture below, consumed by the registration pass
// below it. Also a plain variable — see the same reasoning.
let hadFocusBeforeDisabling = false;

// Bridges the pre-flush capture to the `post` registration pass below. A
// `flush: "pre"` watcher runs before Vue patches this component's DOM for
// the flush, so `document.activeElement` here still reflects last render's
// focus. A `post` watcher can be too late to observe that: in a real
// browser, setting the native `disabled` attribute on a focused control
// forces an immediate blur, as part of applying that same DOM patch, before
// any post-flush callback gets to run — jsdom does not reproduce that
// forced blur, but this capture-before/act-after split is correct either
// way: it does not depend on *when* the blur happens, or whether it happens
// at all.
function captureFocusBeforeDisabling(): void {
	const nowDisabled = isDisabled.value;
	const justDisabled = nowDisabled && !wasDisabled;
	wasDisabled = nowDisabled;
	hadFocusBeforeDisabling =
		justDisabled && el.value !== null && document.activeElement === el.value;
}

// Joins the roving-focus order whenever this trigger is enabled, and
// leaves it in every other case: disabled from the start, or going
// disabled mid-session. `leaveRovingOrder` — run on unmount, and again
// before each re-run when `value` or `isDisabled` changes — unregisters
// the value the previous run added.
let releaseRegistration: (() => void) | null = null;

function leaveRovingOrder(): void {
	releaseRegistration?.();
	releaseRegistration = null;
}

function joinRovingOrder(): void {
	if (!context) return;
	if (isDisabled.value) {
		// This trigger just became disabled. If it held real DOM focus
		// right before this flush's DOM patch landed — captured above,
		// since jsdom leaves focus on a disabled control and a real
		// browser force-blurs it to <body>, and by the time *this* pass
		// runs either has already happened — hand focus to whichever
		// trigger inherits the roving position, guarded so a trigger that
		// never had focus can never steal it from wherever the user
		// actually is. `focusedValue` here reads the roving registry
		// *after* `leaveRovingOrder` above removed this value from it —
		// nothing in this branch writes that registry itself.
		if (hadFocusBeforeDisabling) {
			hadFocusBeforeDisabling = false;
			const next = context.focusedValue;
			if (next !== null) context.focusElement(next);
		}
		return;
	}
	// Captured locally: `value` inside the release closure would otherwise
	// read whatever the prop is *when the registration is next torn down*,
	// not what it was when this run registered.
	const registeredValue = value;
	context.register(registeredValue);
	releaseRegistration = () => context.unregister(registeredValue);
}

// `onMounted`, not an `immediate` watcher: Svelte's `$effect` never runs on
// the server and its first client run lands after the DOM exists, and an
// immediate watcher has neither property — it fires during SSR setup, where
// `document` does not exist and the registry write would be undone before
// the server renders a single trigger. `onBeforeUnmount` mirrors the
// effect's cleanup on teardown.
onMounted(() => {
	captureFocusBeforeDisabling();
	joinRovingOrder();
});
onBeforeUnmount(leaveRovingOrder);

// The pre-flush half of Svelte's `$effect.pre`: props are updated and this
// runs before the render that writes `disabled` to the DOM.
watch(() => isDisabled.value, captureFocusBeforeDisabling, { flush: "pre" });

// The registration effect's *re-run* path: `value` or `isDisabled` changing
// mid-session tears the previous registration down and puts the new one up,
// exactly as the Svelte effect's cleanup-then-body does. Not `immediate` —
// the first registration is `onMounted`'s above — and `post` so it lands in
// the same flush a Svelte effect would.
watch(
	() => [value, isDisabled.value] as const,
	() => {
		leaveRovingOrder();
		joinRovingOrder();
	},
	{ flush: "post" }
);

// The native `disabled` attribute below is the real gate, but a
// synthetic click fired straight at the element — as a test does —
// walks straight past it, so the handler repeats the guard itself.
function handleClick() {
	if (isDisabled.value) return;
	context?.select(value);
	// A native <button> is only guaranteed to take focus on click in
	// some browsers (macOS Safari notably does not, by default), so the
	// roving tab stop is moved here explicitly rather than left to an
	// incidental focus event — the same reasoning as ToggleGroupItem's
	// click handler.
	context?.focus(value);
	el.value?.focus();
}

// Keeps the roving tabindex following real DOM focus even when focus
// arrives some other way than this trigger's own click/keydown handlers
// below — Shift+Tab back out of the panel, for instance.
function handleFocus() {
	if (isDisabled.value) return;
	context?.focus(value);
}

function handleKeydown(event: KeyboardEvent) {
	if (!context || isDisabled.value) return;
	const horizontal = context.orientation === "horizontal";
	switch (event.key) {
		case "ArrowRight":
			if (!horizontal) return;
			event.preventDefault();
			context.move(value, 1);
			break;
		case "ArrowLeft":
			if (!horizontal) return;
			event.preventDefault();
			context.move(value, -1);
			break;
		case "ArrowDown":
			if (horizontal) return;
			event.preventDefault();
			context.move(value, 1);
			break;
		case "ArrowUp":
			if (horizontal) return;
			event.preventDefault();
			context.move(value, -1);
			break;
		case "Home":
			event.preventDefault();
			context.moveToEdge("first");
			break;
		case "End":
			event.preventDefault();
			context.moveToEdge("last");
			break;
		// Enter/Space need no case here: a native <button> already fires a
		// click for both, and handleClick selects — in both activation
		// modes, since manual activation only withholds selection from
		// the *arrow* keys, not from an explicit activation key.
	}
}
</script>

<template>
	<button
		ref="el"
		type="button"
		role="tab"
		data-ft-tabs-trigger=""
		:data-value="value"
		:data-orientation="orientation"
		:data-variant="variant"
		:id="context?.triggerId(value)"
		:class="classes"
		:disabled="isDisabled"
		:aria-selected="isSelected"
		:aria-controls="context?.panelId(value)"
		:tabindex="tabIndexAttr"
		@click="handleClick"
		@focus="handleFocus"
		@keydown="handleKeydown"
	>
		<slot />
	</button>
</template>

<style scoped>
/*
 * Lifts every trigger above `TabsList`'s indicator, which sits at
 * `z-index: 0` in the same stacking context. Only the segmented variant
 * actually overlaps — the pill is painted under the label it belongs to —
 * but the rule is unconditional so a consumer restyling the underline
 * variant into something that overlaps cannot fall through the floor.
 */
.ft-tabs-trigger {
	position: relative;
	z-index: 1;
}

/*
 * The only `box-shadow` left on this element. It used to have to be
 * composited with an `inset` accent bar, because two `box-shadow` rules on
 * one element cannot both apply — the more specific simply wins and the
 * other disappears. The bar now lives on `TabsList`'s indicator, so the
 * focus ring stands alone and is never part of any transition: R13, no
 * animated focus.
 */
.ft-tabs-trigger:focus-visible {
	box-shadow: 0 0 0 3px color-mix(in oklab, var(--ft-nav-accent) 35%, transparent);
}

/*
 * The segmented variant's selection is now painted by `TabsList`'s
 * indicator, which repaints as `Highlight` in a forced-colors palette and
 * sits *under* this label — whose own colour that same palette forces
 * independently, to `ButtonText`. `HighlightText` is the partner the
 * palette guarantees contrast against, and a system-colour keyword
 * declared inside the query is honoured rather than re-forced, which is
 * what makes re-stating it work at all (same mechanism as the indicator's
 * own fill, and as `Skeleton`/`TextRoll` elsewhere in the library).
 *
 * The underline variant needs nothing here: its bar sits on the list's
 * edge, not under the label, so the forced `ButtonText` stays legible.
 */
@media (forced-colors: active) {
	.ft-tabs-trigger[data-variant="segmented"][aria-selected="true"] {
		color: HighlightText;
	}
}
</style>

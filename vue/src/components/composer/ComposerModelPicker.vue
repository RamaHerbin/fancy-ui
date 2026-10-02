<!--
	The model switcher that lives on the composer's bottom rail.

	Props
	-----
	- `models: ModelOptionData[]` — required; an empty list leaves the control inert.
	- `value?: string`            — id of the selected model, two-way through
	                                `v-model:value`; defaults to the first one.
	- `onChange?: (id: string) => void` — a *change* of model, so re-picking the current one is silent.
	- `label?: string`            — accessible name for the control and its menu. Defaults to `Model`.
	- `class?: string`            — merged onto the trigger button.

	Focus lives on the listbox while the menu is open — the element carrying
	`aria-activedescendant` has to be the one holding focus — and returns to the
	trigger when the menu closes on Escape or on a pick. The menu is only in the
	DOM while it is open, and the one document listener it needs is added on open
	and taken back on close.
-->
<script lang="ts">
import type { HTMLAttributes } from "vue";

import type { ModelOptionData } from "../../internals/ai-types.js";

/**
 * Props for ComposerModelPicker
 */
export interface ComposerModelPickerProps {
	/** The models on offer. An empty list leaves the picker inert. */
	models: ModelOptionData[];
	/** The selected model's id, two-way through `v-model:value`. Falls back to the first model. */
	value?: string;
	/** Called with the id of a newly picked model. Silent when the pick changes nothing. */
	onChange?: (id: string) => void;
	/** Accessible name for the control and its menu. */
	label?: string;
	/** Additional CSS classes */
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { computed, inject, ref, useTemplateRef, watch } from "vue";

import { cn } from "../../utils.js";
import { useFancyId } from "../../internals/use-id.js";
import { useFloat } from "../../internals/use-float.js";
import { useSoundCue } from "../../sound/use-sound.js";
import { COMPOSER_CONTEXT_KEY, type ComposerContext } from "./types.js";

defineOptions({ name: "ComposerModelPicker", inheritAttrs: false });

const {
	models,
	onChange,
	label = "Model",
	class: className,
} = defineProps<ComposerModelPickerProps>();

const value = defineModel<string | undefined>("value");

// Undefined when the picker is used outside a Composer: it then behaves as a
// standalone select rather than throwing, and nothing switches it off.
const composer = inject<ComposerContext | undefined>(COMPOSER_CONTEXT_KEY, undefined);

// A no-op while the composer is silent, and the preference is read inside the
// returned function rather than in a render path.
const playCue = useSoundCue(() => composer?.sound);

const uid = useFancyId();
const menuId = `${uid}-menu`;
// Ids are built from the position, not from the model's own id: two entries
// arriving with the same id — a duplicated tier, a badly deduplicated list —
// would otherwise both answer to the same `aria-activedescendant`.
const optionId = (index: number) => `${uid}-option-${index}`;

const open = ref(false);
const activeIndex = ref(0);
const triggerEl = useTemplateRef<HTMLButtonElement>("triggerEl");
const menuEl = useTemplateRef<HTMLDivElement>("menuEl");

// An unset `value` means "whichever model comes first", so the picker can be
// dropped in without the consumer having to seed the binding.
const selectedId = computed(() => value.value ?? models[0]?.id);
// Deliberately not falling back to the first model: a `value` naming something
// that is not on offer shows the bare label instead of quietly claiming a
// model the consumer never selected.
const selected = computed(() => models.find((model) => model.id === selectedId.value));
const activeId = computed(() =>
	models[activeIndex.value] ? optionId(activeIndex.value) : undefined
);
// Nothing to choose from is as inert as a composer that is switched off.
const isDisabled = computed(() => (composer?.disabled ?? false) || models.length === 0);

useFloat(menuEl, () => ({
	anchor: () => triggerEl.value?.getBoundingClientRect() ?? null,
	placement: "top-start" as const,
	offset: 6,
}));

function openMenu() {
	if (isDisabled.value || open.value) return;
	// The menu opens on the model in force, so Enter without touching an arrow
	// is a no-op rather than a silent switch to whatever sits at the top.
	const current = models.findIndex((model) => model.id === selectedId.value);
	activeIndex.value = current >= 0 ? current : 0;
	open.value = true;
	playCue("open");
}

// `reason` distinguishes a commit-flavoured close (a model was just picked)
// from a plain dismiss (Escape, Tab, an outside press, or the trigger
// toggling the menu shut). Only a dismiss plays `close` — a commit already
// played `select` inside `select()` below, and the contract is one cue per
// interaction, never both.
function closeMenu(returnFocus: boolean, reason: "commit" | "dismiss" = "dismiss") {
	if (!open.value) return;
	open.value = false;
	if (reason === "dismiss") playCue("close");
	// Focus was moved into the listbox on open; leaving it there would drop the
	// keyboard user at the top of the document when the listbox disappears.
	if (returnFocus) triggerEl.value?.focus();
}

function move(delta: number) {
	if (models.length === 0) return;
	// Wraps: the list is short, and a menu that dead-ends at its last entry
	// makes the reader reverse direction to reach the option one step past it.
	activeIndex.value = (activeIndex.value + delta + models.length) % models.length;
}

function select(index: number) {
	const model = models[index];
	if (!model || isDisabled.value) return;
	const changed = model.id !== selectedId.value;
	value.value = model.id;
	// Re-picking the model already in force plays no `select` — same as
	// `onChange` below — and the menu closes as a dismissal instead, with
	// `close`, rather than in silence (RadioGroup/Select parity).
	if (changed) playCue("select");
	closeMenu(true, changed ? "commit" : "dismiss");
	// `onChange` reports a change, not an interaction: re-picking the model
	// already in force has nothing to announce.
	if (changed) onChange?.(model.id);
}

function handleTriggerKeydown(event: KeyboardEvent) {
	if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
	// Both arrows open. The menu sits above the composer, which is where "up"
	// expects to find it, and "down" is the habit every native select taught.
	event.preventDefault();
	openMenu();
}

function handleMenuKeydown(event: KeyboardEvent) {
	switch (event.key) {
		case "ArrowDown":
			event.preventDefault();
			move(1);
			break;
		case "ArrowUp":
			event.preventDefault();
			move(-1);
			break;
		case "Enter":
		case " ":
			// preventDefault also stops the browser turning the key into a click on
			// the option button that is about to be removed.
			event.preventDefault();
			select(activeIndex.value);
			break;
		case "Escape":
			event.preventDefault();
			closeMenu(true);
			break;
		case "Tab":
			// Focus is leaving of its own accord: the menu steps aside and puts
			// focus back on the trigger, so the browser's own Tab — left to run —
			// continues from the picker rather than from the top of the document.
			closeMenu(true);
			break;
	}
}

watch(
	open,
	(isOpen, _prev, onCleanup) => {
		if (!isOpen) return;
		// mousedown rather than click: the menu has to be gone before the press
		// lands, or a press that starts outside and finishes on the trigger closes
		// and reopens in one gesture.
		const onPointerDown = (event: MouseEvent) => {
			const target = event.target as Node | null;
			if (target && (menuEl.value?.contains(target) || triggerEl.value?.contains(target))) return;
			// No focus return: the press is already moving focus somewhere else.
			closeMenu(false);
		};
		// Capture, so a surface that swallows mousedown on the way up cannot pin the
		// menu open. Registered only while open, and retracted the moment it closes.
		document.addEventListener("mousedown", onPointerDown, true);
		onCleanup(() => document.removeEventListener("mousedown", onPointerDown, true));
	},
	{ flush: "post" }
);

watch(
	open,
	(isOpen) => {
		if (!isOpen) return;
		// Focus moves into the listbox instead of staying on the trigger: the
		// element pointing at the active option with `aria-activedescendant` must be
		// the element that actually holds focus.
		menuEl.value?.focus();
	},
	{ flush: "post" }
);

// Reads the switch, writes only the menu: a composer that goes dark mid-pick
// takes its menu down with it.
watch(
	isDisabled,
	(disabled) => {
		if (disabled) open.value = false;
	},
	{ flush: "post" }
);
</script>

<template>
	<button
		ref="triggerEl"
		type="button"
		:class="
			cn(
				'ft-composer-model text-foreground/70 hover:bg-muted hover:text-foreground inline-flex max-w-full cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 font-mono text-xs transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40',
				className
			)
		"
		:disabled="isDisabled"
		:data-open="open ? '' : undefined"
		aria-haspopup="listbox"
		:aria-expanded="open"
		:aria-controls="open ? menuId : undefined"
		:aria-label="selected ? `${label}: ${selected.label}` : label"
		@click="open ? closeMenu(true) : openMenu()"
		@keydown="handleTriggerKeydown"
	>
		<span class="truncate">{{ selected?.label ?? label }}</span>
		<span
			v-if="selected?.badge"
			class="ft-composer-model-badge shrink-0 rounded px-1 py-px text-[0.625rem] tracking-wide"
		>
			{{ selected.badge }}
		</span>
		<svg
			class="ft-composer-model-chevron size-3 shrink-0"
			viewBox="0 0 16 16"
			fill="none"
			stroke="currentColor"
			stroke-width="1.5"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<path d="m4 6 4 4 4-4" />
		</svg>
	</button>

	<!--
		In the DOM only while it is on screen. A permanently mounted menu is a list
		of every model on offer that every reader of the page has to step past to
		reach the composer, once per composer.

		The anchor is read through a getter so the float core re-measures the
		trigger on each scroll and resize tick instead of holding a rect that went
		stale the moment the page moved.
	-->
	<div
		v-if="open"
		ref="menuEl"
		:id="menuId"
		role="listbox"
		tabindex="-1"
		:aria-label="label"
		:aria-activedescendant="activeId"
		class="ft-composer-model-menu z-50 max-h-64 min-w-52 overflow-y-auto rounded-lg border p-1 shadow-lg outline-none"
		@keydown="handleMenuKeydown"
	>
		<!--
			A button carrying `role="option"`: the row has to be clickable and it has
			to be an option, and starting from a button is what keeps the press,
			the pointer cursor and the disabled semantics native. `tabindex="-1"`
			keeps it out of the tab order, where the listbox does the walking.
		-->
		<button
			v-for="(model, index) in models"
			:key="`${model.id}#${index}`"
			type="button"
			role="option"
			tabindex="-1"
			:id="optionId(index)"
			:aria-selected="model.id === selectedId"
			:data-active="index === activeIndex ? '' : undefined"
			class="ft-composer-model-option flex w-full cursor-pointer flex-col items-start gap-0.5 rounded-md px-2 py-1.5 text-left"
			@click="select(index)"
			@mouseenter="activeIndex = index"
		>
			<span class="flex w-full items-center gap-1.5">
				<span class="truncate text-xs font-medium">{{ model.label }}</span>
				<span
					v-if="model.badge"
					class="ft-composer-model-badge shrink-0 rounded px-1 py-px text-[0.625rem] tracking-wide"
				>
					{{ model.badge }}
				</span>
				<svg
					v-if="model.id === selectedId"
					class="ml-auto size-3 shrink-0"
					viewBox="0 0 16 16"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<path d="m3 8.5 3.5 3.5L13 5" />
				</svg>
			</span>
			<span
				v-if="model.description"
				class="ft-composer-model-description text-[0.6875rem] leading-snug"
			>
				{{ model.description }}
			</span>
		</button>
	</div>
</template>

<style scoped>
/*
 * The floating surface reads its colours at the point of use with a fallback
 * rather than declaring them on a root, so a value set anywhere up the tree —
 * a wrapper's `style`, a theme class, `:root` — wins without having to
 * out-specify these scoped rules.
 */
/*
 * The rail's controls sit on the composer's own tinted surface, not on the
 * page, so the ring has to be read against that surface rather than against
 * white. Fifty-five percent of the row's colour lands at #828282 on the light
 * composer (3.5:1) and #9E9E9E on the dark one (5.1:1); a 1px ring in the
 * theme's `--ring` token measured 2.4:1 there, under the 3:1 a control's focus
 * indicator owes. Two pixels rather than one for the same reason a thin ring
 * disappears against a tint: the ring is the only thing saying where focus is.
 */
.ft-composer-model:focus-visible {
	box-shadow: 0 0 0 2px
		var(--ft-composer-control-ring, color-mix(in oklab, currentColor 55%, transparent));
}

.ft-composer-model-menu {
	max-width: min(20rem, calc(100vw - 1rem));
	background: var(--ft-composer-menu-bg, var(--color-popover, canvas));
	border-color: var(--ft-composer-menu-border, var(--color-border, currentColor));
	color: var(--ft-composer-menu-fg, var(--color-popover-foreground, inherit));
}

/*
 * One highlight for both roads into a row — the arrow keys and the pointer —
 * so the option Enter is about to take is the option under the cursor.
 */
.ft-composer-model-option[data-active] {
	background: var(
		--ft-composer-option-active-bg,
		color-mix(in oklab, currentColor 10%, transparent)
	);
}

.ft-composer-model-description {
	color: var(--ft-composer-menu-muted, color-mix(in oklab, currentColor 60%, transparent));
}

/* Mixed from currentColor, so retinting the picker retints its pills with it. */
.ft-composer-model-badge {
	background: var(--ft-composer-badge-bg, color-mix(in oklab, currentColor 14%, transparent));
	text-transform: uppercase;
}

.ft-composer-model[data-open] .ft-composer-model-chevron {
	transform: rotate(180deg);
}

/*
 * Both movements live entirely inside `no-preference`, so reduced motion is
 * not a second variant to keep in sync: the chevron flips and the menu appears,
 * already placed.
 */
@media (prefers-reduced-motion: no-preference) {
	.ft-composer-model-chevron {
		transition: transform 150ms ease;
	}

	.ft-composer-model-menu {
		animation: ft-composer-menu-in 120ms cubic-bezier(0.4, 0, 0.2, 1);
	}
}

@keyframes ft-composer-menu-in {
	from {
		opacity: 0;
		transform: translateY(4px);
	}
	to {
		opacity: 1;
		transform: none;
	}
}
</style>

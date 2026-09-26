<script lang="ts">
import type { HTMLAttributes } from "vue";

import type { CommandItemData } from "../../internals/ai-types.js";

/**
 * Props for ComposerCommandMenu
 */
export interface ComposerCommandMenuProps {
	/** The character that opens the menu — `/` for commands, `@` for mentions. */
	trigger: string;
	/** Everything the menu can offer, before filtering. */
	items: CommandItemData[];
	/**
	 * Handles a picked item. Defaults to completing the trigger token with the
	 * item's label. `query` is what had been typed after the trigger.
	 */
	onSelect?: (
		item: CommandItemData,
		ctx: { insertText: (text: string, replaceTriggerToken?: boolean) => void; query: string }
	) => void;
	/** Decides which items survive the query. Defaults to a case-insensitive label/description match. */
	filter?: (item: CommandItemData, query: string) => boolean;
	/** How many matches the menu shows at once. */
	maxItems?: number;
	/** What this menu offers: its accessible name, and the noun it is counted in. */
	label?: string;
	/** Additional CSS classes */
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { computed, inject, onScopeDispose, ref, useTemplateRef, watch } from "vue";

import { cn } from "../../utils.js";
import { useFancyId } from "../../internals/use-id.js";
import { float, type FloatOptions, type FloatRect } from "../../internals/float.js";
import { useSoundCue } from "../../sound/use-sound.js";
import { findTriggerToken, measureCaretRect } from "./caret.js";
import { COMPOSER_CONTEXT_KEY, type ComposerContext } from "./types.js";

defineOptions({ name: "ComposerCommandMenu", inheritAttrs: false });

const {
	trigger,
	items,
	onSelect,
	filter,
	maxItems = 8,
	label = "Commands",
	class: className,
} = defineProps<ComposerCommandMenuProps>();

defineSlots<{
	/** Shown in place of the rows when nothing matches. */
	empty?(): unknown;
}>();

const el = useTemplateRef<HTMLDivElement>("el");
defineExpose({ ref: el });

// Undefined outside a Composer: the menu then has no textarea to watch and
// renders nothing at all, rather than throwing on a missing provider.
const composer = inject<ComposerContext | undefined>(COMPOSER_CONTEXT_KEY, undefined);

// A no-op while the composer is silent, and the preference is read inside the
// returned function rather than in a render path.
const playCue = useSoundCue(() => composer?.sound);

const uid = useFancyId();
const listId = `${uid}-list`;

/** Anchors the float before the caret has ever been measured. */
const ORIGIN: FloatRect = { x: 0, y: 0, width: 0, height: 0 };

const textarea = computed(() => composer?.textareaRef.current ?? null);
// A composer that is off or streaming takes no dictation: completing into it
// would write through a textarea the reader cannot type in.
const inert = computed(() => (composer?.disabled ?? false) || (composer?.streaming ?? false));

const open = ref(false);
const query = ref("");
/** Where the open token starts, or -1. This is what "the same token" means. */
const tokenStart = ref(-1);
/** The token Escape dismissed, so it does not spring back on the next keystroke. */
const dismissedStart = ref(-1);
const activeIndex = ref(0);

const matches = computed(() =>
	items.filter((item) => (filter ?? defaultFilter)(item, query.value))
);
const visible = computed(() => matches.value.slice(0, Math.max(0, maxItems)));
// The stored index is a wish; this is what it can actually be once the query
// has shortened the list under it.
const active = computed(() =>
	visible.value.length === 0 ? -1 : Math.min(activeIndex.value, visible.value.length - 1)
);
// A getter, not a rect measured once when the token opened: the float core
// re-reads its anchor on every scroll and resize, and a frozen rect would send
// it repositioning against where the caret used to be. The closure is REBUILT
// whenever the textarea or the token start changes, exactly as the source's
// `$derived.by` rebuilds it: that fresh identity is what tells the binding
// below to re-position a menu that stays open while `sync()` moves it onto
// another trigger token.
const anchor = computed(() => {
	const node = textarea.value;
	const start = tokenStart.value;
	return (): FloatRect => (node && start >= 0 ? measureCaretRect(node, start) : ORIGIN);
});

const floatOptions = computed<FloatOptions>(() => ({
	anchor: anchor.value,
	placement: "top-start",
	offset: 6,
}));

/*
 * FOUNDATION GAP — `useFloat` cannot express this binding, so the action's two
 * effects are spelled out here over the same verbatim `float` core.
 *
 * Svelte compiles `use:float={{ anchor, … }}` into an effect that calls the
 * action's `update()` whenever the parameter changes, and here the parameter
 * changes with the anchor: a `tokenStart` that moves to another token must
 * re-run `position()`. Nothing else would — the draft, the rows and the box
 * can all be unchanged, so neither the scroll/resize listeners nor the core's
 * `ResizeObserver` (which never observes a getter anchor) schedules a
 * recompute, and the menu would hang over the previous caret. `useFloat`
 * deliberately keeps `anchor` out of its re-sync sources and exposes no
 * handle, and `internals/use-float.ts` is out of scope for this unit.
 *
 * One watcher attaches and destroys, one re-syncs on a changed parameter —
 * the same split, same `flush: "post"`. `applied` keeps the pair idempotent:
 * opening the menu changes the node and the options in a single flush, and the
 * core should position once, not twice.
 */
let handle: ReturnType<typeof float> | null = null;
let applied: FloatOptions | null = null;

watch(
	el,
	(node, _prev, onCleanup) => {
		if (!node) return;
		applied = floatOptions.value;
		handle = float(node, applied);
		onCleanup(() => {
			handle?.destroy?.();
			handle = null;
			applied = null;
		});
	},
	{ flush: "post", immediate: true }
);

watch(
	floatOptions,
	(options) => {
		if (!handle || options === applied) return;
		applied = options;
		handle.update?.(options);
	},
	{ flush: "post" }
);

onScopeDispose(() => {
	handle?.destroy?.();
	handle = null;
});

/**
 * The menu never takes focus — the reader is typing, and a completion list that
 * steals the caret would break the very sentence it is completing. That rules
 * out the usual combobox wiring, which needs `role`, `aria-expanded`,
 * `aria-controls` and `aria-activedescendant` on the input itself, and this
 * component is in no position to put them there: the textarea belongs to
 * `ComposerInput`, and reaching across to rewrite another component's
 * attributes from a sibling is exactly the kind of spooky action a compound
 * component should not do (it would also fight that component's own renders).
 *
 * So the announcement is made out loud instead, through a live region that is
 * always in the DOM — a region inserted at the same moment as its text usually
 * goes unread. The tradeoff is real: a screen-reader user hears how many
 * matches there are and that the arrows do something, but cannot hear each row
 * as it becomes active. Pointer and sighted-keyboard users lose nothing.
 *
 * The rows still carry stable ids, so a consumer who owns their own input part
 * — and may therefore write to it — can read the menu through the exposed
 * `ref`, point `aria-activedescendant` at the selected row, and have the full
 * pattern.
 */
const announcement = computed(() => {
	if (!open.value) return "";
	const noun = label.toLowerCase();
	const word = visible.value.length === 1 && noun.endsWith("s") ? noun.slice(0, -1) : noun;
	return `${visible.value.length} ${word} available, use the arrow keys`;
});

function defaultFilter(item: CommandItemData, text: string): boolean {
	if (text === "") return true;
	const needle = text.toLowerCase();
	return (
		item.label.toLowerCase().includes(needle) ||
		(item.description?.toLowerCase().includes(needle) ?? false)
	);
}

function close() {
	open.value = false;
	tokenStart.value = -1;
}

/**
 * Re-read the draft and decide whether the menu belongs on screen.
 *
 * Called from the textarea's own events rather than from a watcher: the caret
 * is not reactive state, so nothing would wake a watcher when it moves.
 */
function sync() {
	const node = textarea.value;
	if (!node || inert.value) {
		close();
		return;
	}
	const end = node.selectionEnd ?? node.value.length;
	// Mid-selection there is no caret to complete at, only a range.
	if ((node.selectionStart ?? end) !== end) {
		close();
		return;
	}

	const token = findTriggerToken(node.value, end, trigger);
	if (!token) {
		// Outside any token, a dismissal has nothing left to apply to: coming
		// back to the same spot should open the menu again.
		dismissedStart.value = -1;
		close();
		return;
	}
	if (token.start === dismissedStart.value) {
		open.value = false;
		return;
	}
	// A different token, or a different query within it, starts the list again
	// from the top — the row that was active may not even be in it any more.
	if (token.start !== tokenStart.value || token.query !== query.value) activeIndex.value = 0;
	// Anchored to the trigger character, not to the caret: the menu then holds
	// still while the query is typed instead of crawling along with it. The
	// anchor getter above reads this position live.
	tokenStart.value = token.start;
	query.value = token.query;
	open.value = true;
}

/**
 * Take the key away from everything else.
 *
 * `preventDefault` alone is not enough: the input's Enter-to-send handler never
 * asks whether the event was already handled, so the event has to stop
 * travelling. The source gets that for free — its input part's handler is a
 * delegated root listener, further up the tree than this one. Here every
 * listener sits on the textarea itself, and the input part's was attached
 * first, so stopping the event mid-bubble would be too late: the keydown
 * listener below is registered for the CAPTURE phase, which runs before the
 * element's own handlers and is what makes `stopPropagation` reach them.
 */
function consume(event: KeyboardEvent) {
	event.preventDefault();
	event.stopPropagation();
}

function move(delta: number) {
	const count = visible.value.length;
	if (count === 0) return;
	const from = active.value < 0 ? 0 : active.value;
	activeIndex.value = (from + delta + count) % count;
}

function select(item: CommandItemData | undefined) {
	if (!item) return;
	// The menu's own open/close stay silent — it opens from keystrokes and
	// closes on blur/Escape, not a dismissal the reader triggered — so a pick
	// is the only cue this component ever plays.
	playCue("select");
	const insertText = (text: string, replaceTriggerToken?: boolean) =>
		composer?.insertText(text, replaceTriggerToken);
	if (onSelect) onSelect(item, { insertText, query: query.value });
	// The trailing space is part of the completion: it closes the token, which
	// is also what stops the menu from immediately reopening on it.
	else insertText(`${item.label} `, true);
	dismissedStart.value = -1;
	close();
}

function handleKeydown(event: KeyboardEvent) {
	if (!open.value) return;
	// Mid-composition these keys belong to the IME, which is picking a candidate
	// of its own.
	if (event.isComposing) return;

	if (event.key === "Escape") {
		// Dismissed for this token only. Typing on in it keeps the menu away;
		// starting another one brings it back.
		dismissedStart.value = tokenStart.value;
		close();
		consume(event);
		return;
	}
	if (event.key === "ArrowDown") {
		move(1);
		consume(event);
		return;
	}
	if (event.key === "ArrowUp") {
		move(-1);
		consume(event);
		return;
	}
	if (event.key === "Enter" || event.key === "Tab") {
		// Nothing to complete: Enter goes back to meaning send.
		if (active.value < 0) return;
		select(visible.value[active.value]);
		consume(event);
	}
}

function handleBlur() {
	close();
}

// Wired here rather than with `@` handlers because the element belongs to
// another component: this part only ever gets handed the node through the
// context, and it must let go of it just as cleanly. `immediate` because the
// textarea may already be registered by the time this part initialises; the
// body returns early on `null`, which is what a server render always hands it.
watch(
	textarea,
	(node, _prev, onCleanup) => {
		if (!node) {
			open.value = false;
			return;
		}
		const doc = node.ownerDocument;
		const handleSelectionChange = () => {
			// `selectionchange` only fires on the document, for every selection on the
			// page: the guard is what makes it mean "the caret moved in *our* input",
			// and it is the only way to notice arrow keys and clicks that move the
			// caret without changing a character.
			if (doc.activeElement === node) sync();
		};

		node.addEventListener("input", sync);
		node.addEventListener("keydown", handleKeydown, true);
		node.addEventListener("blur", handleBlur);
		doc.addEventListener("selectionchange", handleSelectionChange);
		onCleanup(() => {
			node.removeEventListener("input", sync);
			node.removeEventListener("keydown", handleKeydown, true);
			node.removeEventListener("blur", handleBlur);
			doc.removeEventListener("selectionchange", handleSelectionChange);
		});
	},
	{ flush: "post", immediate: true }
);

// Reads the switches, writes only the menu: a composer that goes dark or
// starts streaming mid-query takes the open menu down with it.
watch(
	inert,
	(value) => {
		if (value) close();
	},
	{ flush: "post" }
);

// The draft can also change under the menu without a keystroke — a submit
// clearing it, a consumer restoring one — and neither fires `input`. Reading
// the draft here is what wakes the token search on those writes; `open` is read
// in the callback body, which is untracked by construction, so this answers to
// the draft alone and never to the state `sync` itself sets.
watch(
	() => composer?.value.current,
	() => {
		if (open.value) sync();
	},
	{ flush: "post" }
);
</script>

<template>
	<template v-if="textarea">
		<!--
			Only in the DOM while it is open: a closed completion list is not a hidden
			one, it does not exist, and neither its rows nor its live geometry should
			cost anything while the reader is just typing.
		-->
		<div
			v-if="open"
			ref="el"
			:id="listId"
			role="listbox"
			:aria-label="label"
			:class="cn('ft-composer-command-menu flex flex-col text-sm', className)"
		>
			<template v-if="visible.length > 0">
				<!-- Suffixed with the index: two items may arrive carrying the same id. -->
				<button
					v-for="(item, index) in visible"
					:key="`${item.id}#${index}`"
					type="button"
					role="option"
					:id="`${listId}-${index}`"
					tabindex="-1"
					:aria-selected="index === active"
					:class="[
						'ft-composer-command flex w-full items-baseline gap-2 rounded-md px-2 py-1.5 text-left',
						{ 'ft-active': index === active },
					]"
					@mousedown="(event: MouseEvent) => event.preventDefault()"
					@click="select(item)"
				>
					<span class="ft-composer-command-label min-w-0 truncate font-medium">{{
						item.label
					}}</span>
					<!--
						`text-foreground/70` rather than `text-muted-foreground`: this text
						sits on the menu's own opaque surface, and on the tinted active row
						above it, where the muted token drops under 4.5:1. See the note on
						`.ft-active` for the arithmetic.
					-->
					<span v-if="item.description" class="text-foreground/70 min-w-0 flex-1 truncate text-xs">
						{{ item.description }}
					</span>
					<span v-if="item.hint" class="text-foreground/70 ml-auto flex-none font-mono text-xs">
						{{ item.hint }}
					</span>
				</button>
			</template>
			<slot v-else-if="$slots.empty" name="empty" />
			<p v-else class="text-foreground/70 px-2 py-1.5 text-xs italic">No matches.</p>
		</div>

		<!-- Mounted whether or not the menu is: see the note on `announcement`. -->
		<div class="sr-only" role="status" aria-live="polite">{{ announcement }}</div>
	</template>
</template>

<style scoped>
.ft-composer-command-menu {
	z-index: var(--ft-composer-menu-z, 50);
	min-width: var(--ft-composer-menu-min-width, 14rem);
	max-width: min(var(--ft-composer-menu-max-width, 24rem), calc(100vw - 1rem));
	max-height: var(--ft-composer-menu-max-height, 15rem);
	overflow-y: auto;
	gap: 0.0625rem;
	border-radius: var(--ft-composer-menu-radius, 0.625rem);
	border: 1px solid
		var(--ft-composer-menu-border, color-mix(in oklab, currentColor 14%, transparent));
	/* Opaque on purpose: the menu covers the draft it is completing, and a
	   translucent one would leave the reader deciphering two texts at once. */
	background: var(--ft-composer-menu-bg, light-dark(oklch(1 0 0), oklch(0.21 0.01 264)));
	box-shadow: var(--ft-composer-menu-shadow, 0 10px 30px -12px rgb(0 0 0 / 0.45));
	padding: 0.25rem;
	scrollbar-width: thin;
}

/*
 * The active row is the one Enter would take, and it is set by the arrow keys
 * rather than by the pointer — so it is painted, not left to `:hover`. Hover
 * gets the same tint at half strength so the pointer still has a target.
 */
.ft-composer-command {
	color: var(--ft-composer-menu-color, inherit);
}

.ft-composer-command:hover {
	background: var(--ft-composer-menu-hover, color-mix(in oklab, currentColor 6%, transparent));
}

/*
 * Eleven percent of the row's own colour is the strongest tint the secondary
 * text can still be read on. The description and the hint are `foreground/70`,
 * which lands at #5F5F5F over the tinted row on a light menu (4.5:1 needs
 * #767676 or darker there) and at #C2C2C2 on a dark one — 5.2:1 and 5.8:1,
 * both clear of the 4.5:1 a 12px caption owes. Pushing the tint further, or
 * putting the muted token back on these two spans, drops the description under
 * the threshold on exactly the row the reader is about to take.
 */
.ft-composer-command.ft-active {
	background: var(--ft-composer-menu-active, color-mix(in oklab, currentColor 11%, transparent));
}

@media (prefers-reduced-motion: no-preference) {
	.ft-composer-command {
		transition: background-color 120ms ease;
	}
}
</style>

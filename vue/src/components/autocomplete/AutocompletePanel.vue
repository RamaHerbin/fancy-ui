<script setup lang="ts">
import { computed, shallowRef, watch } from "vue";

import { cn } from "../../utils.js";
import Portal from "../../internals/Portal.vue";
import { composeRefs } from "../../internals/dom/compose-refs.js";
import { useAnchorPosition } from "../../internals/use-anchor-position.js";
import { useDismissable } from "../../internals/use-dismissable.js";
import { anchored, originFor } from "../../internals/motion/anchored.js";
import { usePresence } from "../../internals/motion/presence.js";
import { getMatchRange } from "./match.js";
import { AUTOCOMPLETE_CONTEXT } from "./types.js";

/**
 * The floating suggestions list.
 *
 * `Autocomplete` renders this unconditionally and it gates itself on
 * `ctx.open`, where the source mounts it inside its own `{#if open}` — so the
 * context is always present, and the rows are never drawn before there is at
 * least one suggestion to show.
 *
 * A `<div role="listbox">`, not a `<ul>` — see Combobox's identical panel for
 * why (its rows are real buttons, not a permitted child of `<ul>`).
 *
 * No focus trap: focus never leaves the input (`aria-activedescendant` tracks
 * the active row instead). Each row is a real button, kept out of the tab
 * sequence with `tabindex="-1"`, with a `mousedown` handler calling
 * `preventDefault()` so clicking one never blurs the input a beat before its
 * own `click` commits the suggestion.
 *
 * ONE bidirectional leg, never a split enter/exit pair: the presence clock owns
 * both directions, so a list reopened mid-exit is handed the in-flight leg as
 * its counterpart and continues from where it is instead of snapping to
 * invisible first. That matters more here than anywhere else in the family,
 * because a suggestion list closes and reopens on keystrokes — a query that
 * stops matching closes it, and the next character that matches again reverses
 * the exit already in flight. `entering` is what tells the leg which way it is
 * going, and it arrives from the presence handle rather than being guessed
 * from a direction a single bidirectional transition reports as "both".
 *
 * `data-state` is an ORDINARY binding carrying the surface vocabulary's TWO
 * values: the source writes it imperatively from a transition event because
 * its scheduler skips effects inside a closing branch, and a presence-mounted
 * subtree here stays reactive for the whole exit. `inert` is never written by
 * hand either — the presence clock sets the attribute on the registered node
 * for the whole exit, which is what stops a row taking a click on its way out.
 */
defineOptions({ name: "AutocompletePanel", inheritAttrs: false });

// `Autocomplete` only ever renders this component beneath its own provider, so
// the context is always present by the time this runs.
const ctx = AUTOCOMPLETE_CONTEXT.useRequired();

// A plain sink rather than `useTemplateRef`: the element arrives through the
// composed function ref below, and a `useTemplateRef` handle is read-only in a
// development build. The panel is created by `presence.mounted`, so this is
// `null` in `setup` and every consumer of it is a post-flush watcher (C-1).
const panel = shallowRef<HTMLDivElement | null>(null);

const presence = usePresence(() => ctx.open);

// The side and alignment the panel was ACTUALLY placed on. This panel always
// asks for `"bottom"` / `"start"`, but an input sitting low in the viewport
// flips the side to `"top"`, and near a viewport edge clamping slides the panel
// along the cross axis — the entrance origin has to follow both, or it grows
// from the far corner. Seeded with the requested values, so the un-flipped case
// never depends on a placement callback having fired first. The composable
// returns what the source kept in two `$state` locals fed by `onPlacement`.
const placement = useAnchorPosition(panel, () => ({
	anchor: () => ctx.inputRef,
	side: "bottom",
	align: "start",
	offset: 4,
}));

// `active` stays a GETTER (C-2). The layer stays ON the stack for its whole
// exit and stops being TOP of it the instant `open` flips, so a second Escape
// during the fade falls through to whatever is underneath instead of being
// swallowed by a panel that is already leaving.
useDismissable(panel, () => ({
	onDismiss: ctx.close,
	exclude: () => [ctx.inputRef],
	active: () => ctx.open,
}));

// Built ONCE in `setup`: the identity must not change between patches, or Vue
// detaches and reattaches the node and throws the in-flight leg away.
const panelRef = composeRefs<HTMLDivElement>(
	panel,
	presence.register(anchored, (entering) => ({ side: placement.value.side, entering }))
);

/**
 * What the rows render from, frozen for the length of the exit.
 *
 * The source destroys the `{#if open}` branch that owns this component and
 * marks it INERT before playing the outro — its scheduler skips inert effects,
 * so the rows on screen during the exit are frozen at whatever they were the
 * instant the close began. A presence-mounted subtree stays reactive, so the
 * freeze is explicit here: without it a list that closed BECAUSE its query
 * stopped matching would empty itself to a bare box halfway through its own
 * fade, which is the single most common way this particular panel closes.
 */
interface PanelView {
	suggestions: string[];
	query: string;
	activeIndex: number;
}

const view = shallowRef<PanelView>({
	suggestions: ctx.suggestions,
	query: ctx.query,
	activeIndex: ctx.activeIndex,
});

watch(
	() =>
		ctx.open
			? { suggestions: ctx.suggestions, query: ctx.query, activeIndex: ctx.activeIndex }
			: null,
	(next) => {
		if (next) view.value = next;
	},
	{ flush: "post" }
);

/**
 * One row's pre-sliced text, so the highlighted span is three adjacent
 * interpolations in the template rather than three calls to `getMatchRange`
 * from inside it.
 */
interface Row {
	suggestion: string;
	matched: boolean;
	before: string;
	match: string;
	after: string;
	active: boolean;
}

const rows = computed<Row[]>(() =>
	view.value.suggestions.map((suggestion, index) => {
		const range = getMatchRange(suggestion, view.value.query);
		return {
			suggestion,
			matched: range !== null,
			before: range ? suggestion.slice(0, range.start) : "",
			match: range ? suggestion.slice(range.start, range.end) : "",
			after: range ? suggestion.slice(range.end) : "",
			active: index === view.value.activeIndex,
		};
	})
);

function rowClasses(active: boolean): string {
	return cn(
		"ft-autocomplete-option flex w-full cursor-pointer items-center justify-between gap-2 rounded-[6px] px-[10px] py-[7px] text-left",
		active && "bg-accent text-accent-foreground"
	);
}

// Defends against a real browser's focus-follows-mousedown default action
// stealing focus onto a row before its own `click` commits — without it, that
// focus shift blurs the input first, which closes the panel (unmounting the
// row) before the click already in flight can land. jsdom implements no such
// default action to suppress, so no test in this repo can watch this guard
// prevent that outcome — only that the call happens (the suite's "the row's
// mousedown handler calls preventDefault" dispatches a bare `mousedown` and
// checks `event.defaultPrevented`). Do not delete this as dead code on the
// strength of a green suite.
function preventFocusSteal(event: MouseEvent): void {
	event.preventDefault();
}
</script>

<template>
	<!--
		The mounted gate is OUTERMOST and the portal sits INSIDE it (D-V6): the
		teleport resolves its target during the patch that creates its children,
		so the panel is always connected to the document by the time the anchoring
		and dismiss watchers run. A closed list emits nothing at all, on the
		server included.
	-->
	<template v-if="presence.mounted">
		<Portal>
			<div
				:ref="panelRef"
				:id="ctx.panelId"
				role="listbox"
				class="ft-autocomplete-panel border-border bg-popover text-popover-foreground flex max-h-[260px] w-max min-w-[220px] flex-col gap-[1px] overflow-auto rounded-[10px] border p-[5px] text-[13px] shadow-lg outline-none"
				:data-state="presence.surfaceState"
				:data-side="placement.side"
				data-align="start"
				:style="{ transformOrigin: originFor(placement.side, placement.align) }"
			>
				<button
					v-for="(row, index) in rows"
					:key="row.suggestion"
					type="button"
					:id="ctx.optionId(index)"
					role="option"
					tabindex="-1"
					:aria-selected="row.active"
					:class="rowClasses(row.active)"
					@mousedown="preventFocusSteal"
					@click="ctx.select(row.suggestion)"
				>
					<span v-if="row.matched"
						>{{ row.before }}<strong>{{ row.match }}</strong
						>{{ row.after }}</span
					>
					<span v-else>{{ row.suggestion }}</span>
					<kbd
						v-if="row.active"
						aria-hidden="true"
						class="text-muted-foreground font-mono text-[10px]"
						>⏎</kbd
					>
				</button>
			</div>
		</Portal>
	</template>
</template>

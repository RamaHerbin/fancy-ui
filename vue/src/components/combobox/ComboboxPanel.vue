<script setup lang="ts">
import { computed, inject, shallowRef, watch } from "vue";

import { cn } from "../../utils.js";
import Portal from "../../internals/Portal.vue";
import { composeRefs } from "../../internals/dom/compose-refs.js";
import { useAnchorPosition } from "../../internals/use-anchor-position.js";
import { useDismissable } from "../../internals/use-dismissable.js";
import { anchored, originFor } from "../../internals/motion/anchored.js";
import { usePresence } from "../../internals/motion/presence.js";
import { getMatchRange } from "./match.js";
import { COMBOBOX_KEY, type ComboboxContext, type ComboboxOption } from "./types.js";

/**
 * `Combobox`'s portalled listbox.
 *
 * A `<div role="listbox">`, not a `<ul>` — its rows are real `<button>`s
 * (role="option" overrides the native semantics for assistive tech), and a
 * `<button>` is not a permitted child of `<ul>`.
 *
 * No focus trap: focus never leaves the input for this pattern
 * (`aria-activedescendant` tracks the active row instead), so there is
 * nothing to move focus into or return it from. Each row is a real button so
 * it stays natively keyboard-operable and the a11y linter is right to ask for
 * one, but `tabindex="-1"` keeps it out of the tab sequence — the input is the
 * only stop — and `preventFocusSteal` below cancels the pointer's own
 * focus-on-mousedown so it never fires before the row's own click handler
 * runs: without it, clicking a row would blur the input a beat before
 * selecting anything.
 *
 * It arrives and leaves on ONE bidirectional leg, never a split enter/exit
 * pair: the presence clock owns both directions, so a panel reopened mid-exit
 * continues from where it is instead of snapping to invisible first.
 * `entering` is what tells the transition which way it is going, and it
 * arrives from the presence handle rather than being guessed from a direction
 * a single bidirectional transition reports as "both".
 *
 * `Combobox` renders this component unconditionally and the mount gate lives
 * here — this package's shape of the source's `{#if open}` one level up, which
 * is also why `open` still has to arrive through the context. `data-state` is
 * an ORDINARY binding: the source writes it imperatively from a transition
 * event because its scheduler skips effects inside a closing branch, and a
 * presence-mounted subtree here stays reactive for the whole exit. `inert` is
 * never written by hand either — the presence clock sets the attribute on the
 * registered node for the whole exit, which is exactly what a closing listbox
 * wants: the rows stop taking clicks the instant the panel starts leaving.
 */
defineOptions({ name: "ComboboxPanel", inheritAttrs: false });

// `Combobox` only ever renders this component beneath its own provider, so the
// context is always present by the time this runs — no standalone-usage
// fallback to design for.
const ctx = inject(COMBOBOX_KEY) as ComboboxContext;

// A plain sink rather than `useTemplateRef`: the element arrives through the
// composed function ref below, and a `useTemplateRef` handle is read-only in a
// development build. The panel is created by `presence.mounted`, so this is
// `null` in `setup` and every consumer of it is a post-flush watcher (C-1).
const panel = shallowRef<HTMLDivElement | null>(null);

// The side and cross-axis alignment the panel was ACTUALLY placed on. This
// panel always asks for `bottom`/`start`, but a combobox sitting low in the
// viewport flips to `top` routinely, and clamping near a viewport edge slides
// it along the cross axis — the entrance origin has to follow both, or the
// panel grows out of a corner that is no longer the one touching the input.
// The composable seeds the ref with the request, so the common never-flipped
// case never depends on a first placement callback having fired: a wrong seed
// would be a one-frame origin jump on every open.
const placement = useAnchorPosition(panel, () => ({
	anchor: () => ctx.inputRef,
	side: "bottom",
	align: "start",
	offset: 4,
}));

const presence = usePresence(() => ctx.open);

// `active` stays a GETTER (C-2). The layer stays ON the stack for its whole
// exit and stops being TOP of it the instant `open` flips, so a second Escape
// during the fade falls through to whatever is underneath.
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
 * The source destroys the branch that owns this component and marks it INERT
 * before playing the outro — its scheduler skips inert effects, so the rows on
 * screen during the exit are frozen at whatever they were the instant the
 * close began. A presence-mounted subtree stays reactive, so the freeze is
 * explicit here. It is load-bearing rather than cosmetic: `close()` resolves
 * the query back to the selected option's label in the very turn it flips
 * `open`, and a query equal to the selection's own label is exactly the case
 * that filters nothing out — so without the snapshot a panel that closed while
 * showing "No results" would repopulate with the whole option list halfway
 * through its own fade.
 *
 * `flush: "post"` like every other watcher in the package. The guard is what
 * freezes, not the phase: a close never writes, so the rows keep the snapshot
 * they had whichever side of the patch the callback runs on.
 *
 * It is also why the rows below compare indices against this snapshot instead
 * of calling the context's own `isActive`: that one reads the live state,
 * which is exactly what must not be read during the exit. It stays on the
 * context interface — it is copied from the source — but this panel, its only
 * consumer, no longer calls it.
 */
interface PanelView {
	options: ComboboxOption[];
	query: string;
	activeIndex: number;
}

const view = shallowRef<PanelView>({
	options: ctx.options,
	query: ctx.query,
	activeIndex: ctx.activeIndex,
});

watch(
	() =>
		ctx.open ? { options: ctx.options, query: ctx.query, activeIndex: ctx.activeIndex } : null,
	(next) => {
		if (next) view.value = next;
	},
	{ flush: "post" }
);

/**
 * One row's worth of render input, with the highlighted span already sliced
 * out of the label — the template's stand-in for the source's inline `@const`.
 *
 * The span comes from an independent case-insensitive substring search over
 * the label, never from whatever logic a custom `filter` used to select the
 * option, so a match with no literal occurrence renders the label plain rather
 * than highlighting a span that would misrepresent it.
 */
const rows = computed(() =>
	view.value.options.map((option, index) => {
		const range = getMatchRange(option.label, view.value.query);
		return {
			option,
			index,
			highlighted: range !== null,
			before: range ? option.label.slice(0, range.start) : "",
			hit: range ? option.label.slice(range.start, range.end) : "",
			after: range ? option.label.slice(range.end) : "",
		};
	})
);

function rowClasses(index: number, option: ComboboxOption): string {
	return cn(
		"ft-combobox-option w-full cursor-pointer rounded-[6px] px-[10px] py-[7px] text-left",
		index === view.value.activeIndex && !option.disabled && "bg-accent text-accent-foreground",
		option.disabled && "pointer-events-none opacity-50"
	);
}

// Defends against a real browser's focus-follows-mousedown default action
// stealing focus onto a row before its own click commits — without it, that
// focus shift blurs the input first, which closes the panel (unmounting the
// row) before the click already in flight can land. jsdom implements no such
// default action to suppress, so no test in this repo can watch this guard
// prevent that outcome — only that the call happens (`Combobox.test.ts`'s "the
// row's mousedown handler calls preventDefault" dispatches a bare `mousedown`
// and checks `event.defaultPrevented`). Do not delete this as dead code on the
// strength of a green suite.
function preventFocusSteal(event: MouseEvent): void {
	event.preventDefault();
}
</script>

<template>
	<!--
		The mounted gate is OUTERMOST and the portal sits INSIDE it (D-V6): the
		teleport resolves its target during the patch that creates its children,
		so the panel is always connected to the document by the time the
		anchoring and dismiss watchers run. A closed panel emits nothing at all,
		on the server included.
	-->
	<template v-if="presence.mounted">
		<Portal>
			<div
				:ref="panelRef"
				:id="ctx.panelId"
				role="listbox"
				class="ft-combobox-panel border-border bg-popover text-popover-foreground flex max-h-[260px] w-max min-w-[220px] flex-col gap-[1px] overflow-auto rounded-[10px] border p-[5px] text-[13px] shadow-lg outline-none"
				:data-state="presence.surfaceState"
				:data-side="placement.side"
				data-align="start"
				:style="{ transformOrigin: originFor(placement.side, placement.align) }"
			>
				<div
					v-if="rows.length === 0"
					role="presentation"
					class="ft-combobox-empty text-muted-foreground rounded-[6px] px-[10px] py-[7px]"
				>
					{{ ctx.emptyMessage }}
				</div>
				<template v-else>
					<button
						v-for="row in rows"
						:key="row.option.value"
						type="button"
						:id="ctx.optionId(row.index)"
						role="option"
						tabindex="-1"
						:disabled="row.option.disabled"
						:aria-selected="row.index === view.activeIndex"
						:aria-disabled="row.option.disabled ? 'true' : undefined"
						:class="rowClasses(row.index, row.option)"
						@mousedown="preventFocusSteal"
						@click="ctx.selectOption(row.option)"
					>
						<template v-if="row.highlighted"
							>{{ row.before }}<strong>{{ row.hit }}</strong
							>{{ row.after }}</template
						>
						<template v-else>{{ row.option.label }}</template>
					</button>
				</template>
			</div>
		</Portal>
	</template>
</template>

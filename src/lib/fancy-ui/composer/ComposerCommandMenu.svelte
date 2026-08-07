<script lang="ts" module>
	import type { Snippet } from "svelte";
	import type { CommandItemData } from "../_internals/ai-types.js";

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
		/** Shown in place of the rows when nothing matches. */
		empty?: Snippet;
		/** How many matches the menu shows at once. */
		maxItems?: number;
		/** What this menu offers: its accessible name, and the noun it is counted in. */
		label?: string;
		/** Additional CSS classes */
		class?: string;
		/** The menu element, bindable. Null whenever the menu is closed — it is not rendered then. */
		ref?: HTMLDivElement | null;
	}
</script>

<script lang="ts">
	import { getContext, untrack } from "svelte";
	import { cn } from "$lib/utils.js";
	import { float, type FloatRect } from "../_internals/float.js";
	import { findTriggerToken, measureCaretRect } from "./caret.js";
	import { COMPOSER_CONTEXT_KEY, type ComposerContext } from "./types.js";

	let {
		trigger,
		items,
		onSelect,
		filter,
		empty,
		maxItems = 8,
		label = "Commands",
		class: className,
		ref = $bindable(null),
	}: ComposerCommandMenuProps = $props();

	// Undefined outside a Composer: the menu then has no textarea to watch and
	// renders nothing at all, rather than throwing on a missing provider.
	const composer = getContext<ComposerContext | undefined>(COMPOSER_CONTEXT_KEY);

	const uid = $props.id();
	const listId = `${uid}-list`;

	/** Anchors the float before the caret has ever been measured. */
	const ORIGIN: FloatRect = { x: 0, y: 0, width: 0, height: 0 };

	const textarea = $derived(composer?.textareaRef.current ?? null);
	// A composer that is off or streaming takes no dictation: completing into it
	// would write through a textarea the reader cannot type in.
	const inert = $derived((composer?.disabled ?? false) || (composer?.streaming ?? false));

	let open = $state(false);
	let query = $state("");
	/** Where the open token starts, or -1. This is what "the same token" means. */
	let tokenStart = $state(-1);
	/** The token Escape dismissed, so it does not spring back on the next keystroke. */
	let dismissedStart = $state(-1);
	let activeIndex = $state(0);

	const matches = $derived(items.filter((item) => (filter ?? defaultFilter)(item, query)));
	const visible = $derived(matches.slice(0, Math.max(0, maxItems)));
	// The stored index is a wish; this is what it can actually be once the query
	// has shortened the list under it.
	const active = $derived(visible.length === 0 ? -1 : Math.min(activeIndex, visible.length - 1));
	// A getter, not a rect measured once when the token opened: the float action
	// re-reads its anchor on every scroll and resize, and a frozen rect would send
	// it repositioning against where the caret used to be.
	const anchor = $derived.by(() => {
		const el = textarea;
		const start = tokenStart;
		return (): FloatRect => (el && start >= 0 ? measureCaretRect(el, start) : ORIGIN);
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
	 * — and may therefore write to it — can read the menu through `ref`, point
	 * `aria-activedescendant` at the selected row, and have the full pattern.
	 */
	const announcement = $derived.by(() => {
		if (!open) return "";
		const noun = label.toLowerCase();
		const word = visible.length === 1 && noun.endsWith("s") ? noun.slice(0, -1) : noun;
		return `${visible.length} ${word} available, use the arrow keys`;
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
		open = false;
		tokenStart = -1;
	}

	/**
	 * Re-read the draft and decide whether the menu belongs on screen.
	 *
	 * Called from the textarea's own events rather than from an effect: the caret
	 * is not reactive state, so nothing would wake an effect when it moves.
	 */
	function sync() {
		const el = textarea;
		if (!el || inert) {
			close();
			return;
		}
		const end = el.selectionEnd ?? el.value.length;
		// Mid-selection there is no caret to complete at, only a range.
		if ((el.selectionStart ?? end) !== end) {
			close();
			return;
		}

		const token = findTriggerToken(el.value, end, trigger);
		if (!token) {
			// Outside any token, a dismissal has nothing left to apply to: coming
			// back to the same spot should open the menu again.
			dismissedStart = -1;
			close();
			return;
		}
		if (token.start === dismissedStart) {
			open = false;
			return;
		}
		// A different token, or a different query within it, starts the list again
		// from the top — the row that was active may not even be in it any more.
		if (token.start !== tokenStart || token.query !== query) activeIndex = 0;
		// Anchored to the trigger character, not to the caret: the menu then holds
		// still while the query is typed instead of crawling along with it. The
		// anchor getter above reads this position live.
		tokenStart = token.start;
		query = token.query;
		open = true;
	}

	/**
	 * Take the key away from everything else.
	 *
	 * `preventDefault` alone is not enough: the input's Enter-to-send handler never
	 * asks whether the event was already handled, and it is registered further up
	 * the tree, so the event has to stop travelling.
	 */
	function consume(event: KeyboardEvent) {
		event.preventDefault();
		event.stopPropagation();
	}

	function move(delta: number) {
		const count = visible.length;
		if (count === 0) return;
		const from = active < 0 ? 0 : active;
		activeIndex = (from + delta + count) % count;
	}

	function select(item: CommandItemData | undefined) {
		if (!item) return;
		const insertText = (text: string, replaceTriggerToken?: boolean) =>
			composer?.insertText(text, replaceTriggerToken);
		if (onSelect) onSelect(item, { insertText, query });
		// The trailing space is part of the completion: it closes the token, which
		// is also what stops the menu from immediately reopening on it.
		else insertText(`${item.label} `, true);
		dismissedStart = -1;
		close();
	}

	function handleKeydown(event: KeyboardEvent) {
		if (!open) return;
		// Mid-composition these keys belong to the IME, which is picking a candidate
		// of its own.
		if (event.isComposing) return;

		if (event.key === "Escape") {
			// Dismissed for this token only. Typing on in it keeps the menu away;
			// starting another one brings it back.
			dismissedStart = tokenStart;
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
			if (active < 0) return;
			select(visible[active]);
			consume(event);
		}
	}

	function handleBlur() {
		close();
	}

	// Wired here rather than with `on*` attributes because the element belongs to
	// another component: this part only ever gets handed the node through the
	// context, and it must let go of it just as cleanly.
	$effect(() => {
		const el = textarea;
		if (!el) {
			open = false;
			return;
		}
		const doc = el.ownerDocument;
		const handleSelectionChange = () => {
			// `selectionchange` only fires on the document, for every selection on the
			// page: the guard is what makes it mean "the caret moved in *our* input",
			// and it is the only way to notice arrow keys and clicks that move the
			// caret without changing a character.
			if (doc.activeElement === el) sync();
		};

		el.addEventListener("input", sync);
		el.addEventListener("keydown", handleKeydown);
		el.addEventListener("blur", handleBlur);
		doc.addEventListener("selectionchange", handleSelectionChange);
		return () => {
			el.removeEventListener("input", sync);
			el.removeEventListener("keydown", handleKeydown);
			el.removeEventListener("blur", handleBlur);
			doc.removeEventListener("selectionchange", handleSelectionChange);
		};
	});

	// Reads the switches, writes only the menu: a composer that goes dark or
	// starts streaming mid-query takes the open menu down with it.
	$effect(() => {
		if (inert) close();
	});

	// The draft can also change under the menu without a keystroke — a submit
	// clearing it, a consumer restoring one — and neither fires `input`. Reading
	// the draft here is what wakes the token search on those writes; `open` is
	// read untracked, so the effect answers to the draft alone and never to the
	// state `sync` itself sets.
	$effect(() => {
		void composer?.value.current;
		if (untrack(() => open)) sync();
	});
</script>

{#if textarea}
	{#if open}
		<!--
			Only in the DOM while it is open: a closed completion list is not a hidden
			one, it does not exist, and neither its rows nor its live geometry should
			cost anything while the reader is just typing.
		-->
		<div
			bind:this={ref}
			id={listId}
			role="listbox"
			aria-label={label}
			class={cn("ft-composer-command-menu flex flex-col text-sm", className)}
			use:float={{ anchor, placement: "top-start", offset: 6 }}
		>
			{#if visible.length > 0}
				<!-- Suffixed with the index: two items may arrive carrying the same id. -->
				{#each visible as item, index (`${item.id}#${index}`)}
					<button
						type="button"
						role="option"
						id={`${listId}-${index}`}
						tabindex="-1"
						aria-selected={index === active}
						class="ft-composer-command flex w-full items-baseline gap-2 rounded-md px-2 py-1.5 text-left"
						class:ft-active={index === active}
						onmousedown={(event) => event.preventDefault()}
						onclick={() => select(item)}
					>
						<span class="ft-composer-command-label min-w-0 truncate font-medium">{item.label}</span>
						{#if item.description}
							<!--
								`text-foreground/70` rather than `text-muted-foreground`: this text
								sits on the menu's own opaque surface, and on the tinted active row
								above it, where the muted token drops under 4.5:1. See the note on
								`.ft-active` for the arithmetic.
							-->
							<span class="text-foreground/70 min-w-0 flex-1 truncate text-xs">
								{item.description}
							</span>
						{/if}
						{#if item.hint}
							<span class="text-foreground/70 ml-auto flex-none font-mono text-xs">
								{item.hint}
							</span>
						{/if}
					</button>
				{/each}
			{:else if empty}
				{@render empty()}
			{:else}
				<p class="text-foreground/70 px-2 py-1.5 text-xs italic">No matches.</p>
			{/if}
		</div>
	{/if}

	<!-- Mounted whether or not the menu is: see the note on `announcement`. -->
	<div class="sr-only" role="status" aria-live="polite">{announcement}</div>
{/if}

<style>
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

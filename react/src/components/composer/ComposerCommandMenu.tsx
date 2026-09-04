import { forwardRef, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { cn } from "../../utils.js";
import { useComposedRefs } from "../../internals/dom/use-composed-refs.js";
import { useElementRef } from "../../internals/dom/use-element-ref.js";
import { useEventCallback } from "../../internals/dom/use-event-callback.js";
import { useLiveRef } from "../../internals/dom/use-live-ref.js";
import { useFancyId } from "../../internals/use-id.js";
import { useSoundCue } from "../../sound/use-sound.js";
import { useFloat } from "../../internals/use-float.js";
import type { FloatRect } from "../../internals/float.js";
import type { CommandItemData } from "../../internals/ai-types.js";
import { findTriggerToken, measureCaretRect } from "./caret.js";
import { COMPOSER_CONTEXT_KEY } from "./types.js";
import "./composer-command-menu.css";

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
	empty?: ReactNode;
	/** How many matches the menu shows at once. */
	maxItems?: number;
	/** What this menu offers: its accessible name, and the noun it is counted in. */
	label?: string;
	/** Additional CSS classes */
	className?: string;
}

/** Anchors the float before the caret has ever been measured. */
const ORIGIN: FloatRect = { x: 0, y: 0, width: 0, height: 0 };

function defaultFilter(item: CommandItemData, text: string): boolean {
	if (text === "") return true;
	const needle = text.toLowerCase();
	return (
		item.label.toLowerCase().includes(needle) ||
		(item.description?.toLowerCase().includes(needle) ?? false)
	);
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

/**
 * A completion list that opens on a trigger token in the composer's draft.
 *
 * The menu element arrives through the ref channel rather than a `ref` prop,
 * per PORTING.md — the source declares `ref = $bindable(null)`. It is null
 * whenever the menu is closed, because it is not rendered then.
 */
export const ComposerCommandMenu = forwardRef<HTMLDivElement, ComposerCommandMenuProps>(
	function ComposerCommandMenu(
		{ trigger, items, onSelect, filter, empty, maxItems = 8, label = "Commands", className },
		forwardedRef
	) {
		// Undefined outside a Composer: the menu then has no textarea to watch and
		// renders nothing at all, rather than throwing on a missing provider.
		const composer = useContext(COMPOSER_CONTEXT_KEY);
		const playCue = useSoundCue(composer?.sound);

		const uid = useFancyId();
		const listId = `${uid}-list`;

		const textarea = composer?.textareaRef.current ?? null;
		// A composer that is off or streaming takes no dictation: completing into it
		// would write through a textarea the reader cannot type in.
		const inert = (composer?.disabled ?? false) || (composer?.streaming ?? false);

		const [open, setOpen] = useState(false);
		const [query, setQuery] = useState("");
		/** Where the open token starts, or -1. This is what "the same token" means. */
		const [tokenStart, setTokenStart] = useState(-1);
		/** The token Escape dismissed, so it does not spring back on the next keystroke. */
		const [dismissedStart, setDismissedStart] = useState(-1);
		const [activeIndex, setActiveIndex] = useState(0);

		// The node, not a ref: the float below is keyed on it, and the menu only
		// exists while it is open — exactly the conditional node a `[]`-deps effect
		// reading a ref would miss (convention C-1). Composed above the early
		// return, never inside the JSX after it (convention C-2).
		const [menuEl, menuRef] = useElementRef<HTMLDivElement>();
		const ref = useComposedRefs(forwardedRef, menuRef);

		const matches = items.filter((item) => (filter ?? defaultFilter)(item, query));
		const visible = matches.slice(0, Math.max(0, maxItems));
		// The stored index is a wish; this is what it can actually be once the query
		// has shortened the list under it.
		const active = visible.length === 0 ? -1 : Math.min(activeIndex, visible.length - 1);

		// A getter, not a rect measured once when the token opened: the float
		// re-reads its anchor on every scroll and resize, and a frozen rect would
		// send it repositioning against where the caret used to be.
		const anchor = useMemo(() => {
			const el = textarea;
			const start = tokenStart;
			return (): FloatRect => (el && start >= 0 ? measureCaretRect(el, start) : ORIGIN);
		}, [textarea, tokenStart]);
		useFloat(menuEl, { anchor, placement: "top-start", offset: 6 });

		/**
		 * The menu never takes focus — the reader is typing, and a completion list
		 * that steals the caret would break the very sentence it is completing. That
		 * rules out the usual combobox wiring, which needs `role`, `aria-expanded`,
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
		const announcement = (() => {
			if (!open) return "";
			const noun = label.toLowerCase();
			const word = visible.length === 1 && noun.endsWith("s") ? noun.slice(0, -1) : noun;
			return `${visible.length} ${word} available, use the arrow keys`;
		})();

		const close = useEventCallback(() => {
			setOpen(false);
			setTokenStart(-1);
		});

		/**
		 * Re-read the draft and decide whether the menu belongs on screen.
		 *
		 * Called from the textarea's own events rather than from an effect: the caret
		 * is not reactive state, so nothing would wake an effect when it moves.
		 */
		const sync = useEventCallback(() => {
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
				setDismissedStart(-1);
				close();
				return;
			}
			if (token.start === dismissedStart) {
				setOpen(false);
				return;
			}
			// A different token, or a different query within it, starts the list again
			// from the top — the row that was active may not even be in it any more.
			if (token.start !== tokenStart || token.query !== query) setActiveIndex(0);
			// Anchored to the trigger character, not to the caret: the menu then holds
			// still while the query is typed instead of crawling along with it. The
			// anchor getter above reads this position live.
			setTokenStart(token.start);
			setQuery(token.query);
			setOpen(true);
		});

		const move = useEventCallback((delta: number) => {
			const count = visible.length;
			if (count === 0) return;
			const from = active < 0 ? 0 : active;
			setActiveIndex((from + delta + count) % count);
		});

		const select = useEventCallback((item: CommandItemData | undefined) => {
			if (!item) return;
			// The menu's own open/close stay silent — it opens from keystrokes and
			// closes on blur/Escape, not a dismissal the reader triggered — so a pick
			// is the only cue this component ever plays.
			playCue("select");
			const insertText = (text: string, replaceTriggerToken?: boolean) =>
				composer?.insertText(text, replaceTriggerToken);
			if (onSelect) onSelect(item, { insertText, query });
			// The trailing space is part of the completion: it closes the token, which
			// is also what stops the menu from immediately reopening on it.
			else insertText(`${item.label} `, true);
			setDismissedStart(-1);
			close();
		});

		const handleKeydown = useEventCallback((event: KeyboardEvent) => {
			if (!open) return;
			// Mid-composition these keys belong to the IME, which is picking a candidate
			// of its own.
			if (event.isComposing) return;

			if (event.key === "Escape") {
				// Dismissed for this token only. Typing on in it keeps the menu away;
				// starting another one brings it back.
				setDismissedStart(tokenStart);
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
		});

		const handleBlur = useEventCallback(() => {
			close();
		});

		// Wired here rather than with `on*` props because the element belongs to
		// another component: this part only ever gets handed the node through the
		// context, and it must let go of it just as cleanly. Every handler is
		// identity-stable, so the list of deps is the node and nothing else — one
		// registration per element, whatever the menu's own state does.
		useEffect(() => {
			const el = textarea;
			if (!el) {
				setOpen(false);
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
		}, [textarea, sync, handleKeydown, handleBlur]);

		// Reads the switches, writes only the menu: a composer that goes dark or
		// starts streaming mid-query takes the open menu down with it.
		useEffect(() => {
			if (inert) close();
		}, [inert, close]);

		// The draft can also change under the menu without a keystroke — a submit
		// clearing it, a consumer restoring one — and neither fires `input`. Reading
		// the draft here is what wakes the token search on those writes; `open` is
		// read off a live ref rather than a dependency, so the effect answers to the
		// draft alone and never to the state `sync` itself sets.
		const openLive = useLiveRef(open);
		const draft = composer?.value.current;
		useEffect(() => {
			void draft;
			if (openLive.current) sync();
		}, [draft, openLive, sync]);

		if (!textarea) return null;

		return (
			<>
				{/*
					Only in the DOM while it is open: a closed completion list is not a
					hidden one, it does not exist, and neither its rows nor its live
					geometry should cost anything while the reader is just typing.
				*/}
				{open ? (
					<div
						ref={ref}
						id={listId}
						role="listbox"
						aria-label={label}
						className={cn("ft-composer-command-menu flex flex-col text-sm", className)}
					>
						{visible.length > 0 ? (
							/* Suffixed with the index: two items may arrive carrying the same id. */
							visible.map((item, index) => (
								<button
									key={`${item.id}#${index}`}
									type="button"
									role="option"
									id={`${listId}-${index}`}
									tabIndex={-1}
									aria-selected={index === active}
									className={cn(
										"ft-composer-command flex w-full items-baseline gap-2 rounded-md px-2 py-1.5 text-left",
										index === active && "ft-active"
									)}
									onMouseDown={(event) => event.preventDefault()}
									onClick={() => select(item)}
								>
									<span className="ft-composer-command-label min-w-0 truncate font-medium">
										{item.label}
									</span>
									{item.description ? (
										/*
											`text-foreground/70` rather than `text-muted-foreground`: this
											text sits on the menu's own opaque surface, and on the tinted
											active row above it, where the muted token drops under 4.5:1.
											See the note on `.ft-active` for the arithmetic.
										*/
										<span className="text-foreground/70 min-w-0 flex-1 truncate text-xs">
											{item.description}
										</span>
									) : null}
									{item.hint ? (
										<span className="text-foreground/70 ml-auto flex-none font-mono text-xs">
											{item.hint}
										</span>
									) : null}
								</button>
							))
						) : empty ? (
							empty
						) : (
							<p className="text-foreground/70 px-2 py-1.5 text-xs italic">No matches.</p>
						)}
					</div>
				) : null}

				{/* Mounted whether or not the menu is: see the note on `announcement`. */}
				<div className="sr-only" role="status" aria-live="polite">
					{announcement}
				</div>
			</>
		);
	}
);

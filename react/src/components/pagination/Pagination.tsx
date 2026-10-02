import { forwardRef, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "../../utils.js";
import { buildPageRange } from "./pagination-range.js";
import { useSoundCue } from "../../sound/use-sound.js";
import { useComposedRefs } from "../../internals/dom/use-composed-refs.js";
import { useIsomorphicLayoutEffect } from "../../internals/dom/ssr.js";
import { useReducedMotion } from "../../internals/motion/media-query.js";
import { DURATIONS, EASINGS } from "../../internals/motion/tokens.js";
import "./pagination.css";

export interface PaginationProps {
	/**
	 * The current page, 1-based. Pass it to control the component from
	 * outside; omit it entirely to let the control own its own page and
	 * report every change through `onPageChange`.
	 */
	page?: number;
	/** Total number of pages. */
	count: number;
	/** Called with the new page whenever it changes, however the change happened. */
	onPageChange?: (page: number) => void;
	/** Pages shown on each side of the current page. Defaults to `1`. */
	siblingCount?: number;
	/** Pages always shown at each end of the run. Defaults to `1`. */
	boundaryCount?: number;
	/** Shows First/Last jump buttons alongside Previous/Next. Defaults to `false`. */
	showEdges?: boolean;
	/** Disables every control in the nav. */
	disabled?: boolean;
	/** Accessible name for the `<nav>` landmark. Defaults to `"Pagination"`. */
	label?: string;
	/** Overrides the Previous button's content. */
	previousLabel?: ReactNode;
	/** Overrides the Next button's content. */
	nextLabel?: ReactNode;
	/** Additional CSS classes */
	className?: string;
	/**
	 * Plays the select cue through the sound controller. Off by default;
	 * only audible once the user has enabled sound.
	 */
	sound?: boolean;
}

const SLIDE_MS = DURATIONS.base;

const pageButtonBase =
	"inline-flex size-8 shrink-0 items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50";
const navButtonBase =
	"inline-flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50";

/**
 * The nav element arrives through the ref channel rather than a `ref` prop,
 * per PORTING.md — the Svelte source declares `ref = $bindable(null)`.
 *
 * Rest props are not spread: the Svelte source reads only these props off
 * `$props()` and has no `...restProps`, so the port carries no wider
 * attribute surface than the component it mirrors.
 */
export const Pagination = forwardRef<HTMLElement, PaginationProps>(
	(
		{
			page: pageProp,
			count,
			onPageChange,
			siblingCount = 1,
			boundaryCount = 1,
			showEdges = false,
			disabled = false,
			label = "Pagination",
			previousLabel,
			nextLabel,
			className,
			sound = false,
		},
		forwardedRef
	) => {
		const playCue = useSoundCue(sound);
		// The Svelte source's `page` is `$bindable(1)`: a consumer can bind it,
		// or leave it alone and let the component keep writing its own copy.
		// React has no such channel, so the prop is controlled when it is
		// passed and this local copy takes over when it is not. Either way
		// `onPageChange` fires with the same value.
		const [uncontrolledPage, setUncontrolledPage] = useState(1);
		const isControlled = pageProp !== undefined;
		const page = isControlled ? pageProp : uncontrolledPage;

		const items = buildPageRange(page, count, siblingCount, boundaryCount);

		// Floored, not just clamped, and used everywhere this component reasons
		// about "which page" rather than trusting the raw props: `count` can
		// arrive fractional (`totalItems / pageSize` without `Math.ceil`).
		// Without a floored value here, `handleLast` would call `goTo(count)`
		// and set `page` itself to that same fractional value —
		// `buildPageRange`'s own flooring would still save the *rendered*
		// sequence, but `item === page` in the markup below would compare an
		// integer against a value that can now never match again, so
		// `aria-current` and the pill styling would stay wrong for the rest of
		// the session. See `pagination-range.ts` for why the pure function
		// floors independently of this — both layers guard the same invariant
		// on purpose, the same redundancy the boundary buttons already rely on
		// below.
		const safeCount = Math.max(0, Math.floor(count));
		const safePage = Math.min(Math.max(Math.floor(page), 1), Math.max(safeCount, 1));

		const isFirst = safePage <= 1;
		const isLast = safePage >= safeCount;

		// The current-page pill slides from the old page to the new one — but it
		// must not fly in on first paint, from wherever an unplaced box sits. So
		// the slide is armed only once the page has really moved, and the flag is
		// a `data-*` attribute the CSS selects on rather than a class (nothing
		// else keys off it, and it stays out of the merged class string).
		//
		// Armed off `safePage`, not from inside `goTo()`: a controlled
		// `Pagination` whose `page` prop is changed from outside never calls
		// `goTo`, and its pill should slide just the same. The ref seeds the
		// baseline with the page the component started on.
		const [popArmed, setPopArmed] = useState(false);
		const armedRef = useRef(false);
		const lastPageRef = useRef(safePage);

		/*
		 * ---------------------------------------------------------------------
		 * The sliding pill
		 * ---------------------------------------------------------------------
		 *
		 * One `aria-hidden` box under the numbers, moved with `translate()` alone
		 * to the current page's button (every page button is the same size, so
		 * position is all it needs). When the run of numbers itself shifts — a new
		 * window after a jump, an ellipsis moving — the numbers glide to their new
		 * places (a FLIP on the same duration), so the pill and its number arrive
		 * together.
		 *
		 * A progressive enhancement, never the only signal: the current button
		 * keeps `aria-current="page"` and its own `bg-accent`, which the CSS only
		 * hides once the pill has actually been placed (`data-indicator`). A
		 * JS-off render, a forced-colors user and a screen reader all still get it.
		 */
		const reduced = useReducedMotion();
		const flipDuration = reduced ? 0 : SLIDE_MS;

		const navRef = useRef<HTMLElement | null>(null);
		const composedRef = useComposedRefs(navRef, forwardedRef);
		const indicatorRef = useRef<HTMLSpanElement | null>(null);
		const [indicatorPlaced, setIndicatorPlaced] = useState(false);

		function placeIndicator(animate: boolean) {
			const el = indicatorRef.current;
			const nav = navRef.current;
			const current = nav?.querySelector<HTMLElement>('button[aria-current="page"]');
			if (!el || !current || current.offsetWidth === 0) {
				setIndicatorPlaced(false);
				return;
			}
			// Sum offsets up to the nav rather than trusting `offsetLeft` alone:
			// while the numbers glide, each `<li>` carries a transform, which
			// makes it the button's `offsetParent` (offset ≈ 0). Offsets ignore
			// transforms, so the sum is the button's final place — where the pill
			// must land, together with the number gliding there.
			let x = 0;
			let y = 0;
			for (let n: HTMLElement | null = current; n && n !== nav; ) {
				x += n.offsetLeft;
				y += n.offsetTop;
				n = n.offsetParent as HTMLElement | null;
			}
			const transform = `translate(${x}px, ${y}px)`;
			el.style.width = `${current.offsetWidth}px`;
			el.style.height = `${current.offsetHeight}px`;
			if (el.style.transform === transform) {
				setIndicatorPlaced(true);
				return;
			}
			if (animate && el.style.transform) {
				el.style.transform = transform;
			} else {
				// Snap: suspend the transition, write, force a reflow, restore.
				const previous = el.style.transition;
				el.style.transition = "none";
				el.style.transform = transform;
				void el.offsetWidth;
				el.style.transition = previous;
			}
			setIndicatorPlaced(true);
		}

		// The numbers' glide. Each `<li>` registers itself by its key; after
		// every commit the run is re-measured, and an item that moved is played
		// back from where it was last seen, while an item that just appeared
		// fades in a beat later. Nothing animates on the first commit.
		//
		// Positions are kept relative to the nav, not the viewport: they are
		// stored at one commit and compared at the next, and a page scroll in
		// between must not read as every number having moved.
		const itemEls = useRef(new Map<string, HTMLLIElement>());
		const itemRects = useRef(new Map<string, { left: number; top: number }>());
		const itemAnims = useRef(new Map<string, Animation>());
		const mountedRef = useRef(false);

		function measureItems() {
			const nav = navRef.current;
			const origin = nav?.getBoundingClientRect();
			const rects = new Map<string, { left: number; top: number }>();
			for (const [key, el] of itemEls.current) {
				const rect = el.getBoundingClientRect();
				rects.set(key, {
					left: rect.left - (origin?.left ?? 0),
					top: rect.top - (origin?.top ?? 0),
				});
			}
			return rects;
		}

		const itemsKey = items.join(",");

		// Arm, glide, then re-place the pill once the DOM has the new buttons.
		// Slides once armed; the first placement snaps.
		useIsomorphicLayoutEffect(() => {
			const nav = navRef.current;
			if (safePage !== lastPageRef.current) {
				lastPageRef.current = safePage;
				armedRef.current = true;
				// Written straight onto the nav as well as into state: the pill is
				// moved below, in this same pass, and its CSS transition only
				// applies once `data-armed` is on the element. Waiting for the
				// re-render would make the very first page change snap.
				nav?.setAttribute("data-armed", "true");
				setPopArmed(true);
			}

			const firstCommit = !mountedRef.current;
			mountedRef.current = true;
			const origin = nav?.getBoundingClientRect();
			const nextRects = new Map<string, { left: number; top: number }>();
			for (const [key, el] of itemEls.current) {
				// An item still mid-glide starts its next glide from where it is
				// on screen right now, not from where the last glide was heading:
				// the running animation's current offset is read before cancelling.
				const running = itemAnims.current.get(key);
				let driftX = 0;
				let driftY = 0;
				if (running) {
					const live = el.getBoundingClientRect();
					running.cancel();
					const settled = el.getBoundingClientRect();
					driftX = live.left - settled.left;
					driftY = live.top - settled.top;
				}
				itemAnims.current.delete(key);
				const rect = el.getBoundingClientRect();
				const left = rect.left - (origin?.left ?? 0);
				const top = rect.top - (origin?.top ?? 0);
				nextRects.set(key, { left, top });
				if (firstCommit || !flipDuration || typeof el.animate !== "function") continue;
				const prev = itemRects.current.get(key);
				if (prev) {
					const dx = prev.left + driftX - left;
					const dy = prev.top + driftY - top;
					if (!dx && !dy) continue;
					itemAnims.current.set(
						key,
						el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }], {
							duration: flipDuration,
							easing: EASINGS.out,
						})
					);
				} else {
					itemAnims.current.set(
						key,
						el.animate([{ opacity: 0 }, { opacity: 1 }], {
							duration: DURATIONS.fast,
							delay: 60,
							easing: "linear",
							fill: "backwards",
						})
					);
				}
			}
			itemRects.current = nextRects;

			placeIndicator(armedRef.current);
			// eslint-disable-next-line react-hooks/exhaustive-deps -- placeIndicator reads refs only
		}, [safePage, itemsKey, flipDuration]);

		// Resizes, font loads and zoom move the buttons without a page change:
		// follow them with a snap, never a slide, and re-baseline the numbers so
		// the next glide does not start from a stale layout.
		useEffect(() => {
			const nav = navRef.current;
			if (!nav || typeof ResizeObserver === "undefined") return;
			const ro = new ResizeObserver(() => {
				const gliding = [...itemAnims.current.values()].some((a) => a.playState === "running");
				if (!gliding) itemRects.current = measureItems();
				placeIndicator(false);
			});
			ro.observe(nav);
			return () => ro.disconnect();
			// eslint-disable-next-line react-hooks/exhaustive-deps -- placeIndicator and measureItems read refs only
		}, []);

		function registerItem(key: string) {
			return (el: HTMLLIElement | null) => {
				if (el) itemEls.current.set(key, el);
				else itemEls.current.delete(key);
			};
		}

		function goTo(next: number) {
			if (disabled) return;
			const clamped = Math.max(1, Math.min(Math.floor(next), Math.max(safeCount, 1)));
			if (clamped === page) return;
			if (!isControlled) setUncontrolledPage(clamped);
			playCue("select");
			onPageChange?.(clamped);
		}

		// Each handler re-checks the boundary itself rather than trusting the
		// `disabled` attribute below — a synthetic click bypasses the native
		// guard, as does `fireEvent.click` in tests.
		function handlePrevious() {
			if (disabled || isFirst) return;
			goTo(safePage - 1);
		}
		function handleNext() {
			if (disabled || isLast) return;
			goTo(safePage + 1);
		}
		function handleFirst() {
			if (disabled || isFirst) return;
			goTo(1);
		}
		function handleLast() {
			if (disabled || isLast) return;
			goTo(safeCount);
		}

		return (
			<nav
				ref={composedRef}
				aria-label={label}
				data-armed={popArmed ? "true" : undefined}
				data-indicator={indicatorPlaced ? "" : undefined}
				className={cn("ft-pagination", className)}
			>
				<ul className="flex items-center gap-1">
					{showEdges && (
						<li>
							<button
								type="button"
								className={navButtonBase}
								disabled={disabled || isFirst}
								aria-label="First page"
								title="First page"
								onClick={handleFirst}
							>
								« First
							</button>
						</li>
					)}

					<li>
						<button
							type="button"
							className={navButtonBase}
							disabled={disabled || isFirst}
							aria-label="Previous page"
							title="Previous page"
							onClick={handlePrevious}
						>
							{previousLabel ?? "‹ Previous"}
						</button>
					</li>

					{items.map((item, i) => {
						const key = item === "ellipsis" ? `ellipsis-${i}` : `page-${item}`;
						return (
							<li key={key} ref={registerItem(key)}>
								{item === "ellipsis" ? (
									// Decorative only: it stands for a run of hidden pages, not a
									// control, so it must not take focus or be reachable by Tab.
									<span
										aria-hidden="true"
										className="text-muted-foreground flex size-8 items-center justify-center select-none"
									>
										…
									</span>
								) : (
									<button
										type="button"
										className={cn(
											pageButtonBase,
											item === safePage
												? "bg-accent text-accent-foreground"
												: "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
										)}
										disabled={disabled}
										aria-current={item === safePage ? "page" : undefined}
										aria-label={`Go to page ${item}`}
										title={`Go to page ${item}`}
										onClick={() => goTo(item)}
									>
										{item}
									</button>
								)}
							</li>
						);
					})}

					<li>
						<button
							type="button"
							className={navButtonBase}
							disabled={disabled || isLast}
							aria-label="Next page"
							title="Next page"
							onClick={handleNext}
						>
							{nextLabel ?? "Next ›"}
						</button>
					</li>

					{showEdges && (
						<li>
							<button
								type="button"
								className={navButtonBase}
								disabled={disabled || isLast}
								aria-label="Last page"
								title="Last page"
								onClick={handleLast}
							>
								Last »
							</button>
						</li>
					)}
				</ul>

				<span ref={indicatorRef} className="ft-pagination-indicator" aria-hidden="true"></span>
			</nav>
		);
	}
);

Pagination.displayName = "Pagination";

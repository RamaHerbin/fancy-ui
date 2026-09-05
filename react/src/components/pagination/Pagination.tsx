import { forwardRef, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "../../utils.js";
import { buildPageRange } from "./pagination-range.js";
import { useSoundCue } from "../../sound/use-sound.js";
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

		// The current-page pill pops when the page changes — but a bare
		// `[aria-current="page"] { animation: … }` also fires on first paint,
		// for whichever page happens to already be current. That reads as a
		// glitch on load, so the animation is armed only once the page has
		// really moved, and the flag is a `data-*` attribute the CSS selects on
		// rather than a class (nothing else keys off it, and it stays out of
		// the merged class string).
		//
		// Armed off `safePage`, not from inside `goTo()`: a controlled
		// `Pagination` whose `page` prop is changed from outside never calls
		// `goTo`, and its pill should pop just the same. The ref seeds the
		// baseline with the page the component started on.
		const [popArmed, setPopArmed] = useState(false);
		const lastPageRef = useRef(safePage);
		useEffect(() => {
			if (safePage === lastPageRef.current) return;
			lastPageRef.current = safePage;
			setPopArmed(true);
		}, [safePage]);

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
				ref={forwardedRef}
				aria-label={label}
				data-armed={popArmed ? "true" : undefined}
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

					{items.map((item, i) => (
						<li key={item === "ellipsis" ? `ellipsis-${i}` : `page-${item}`}>
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
					))}

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
			</nav>
		);
	}
);

Pagination.displayName = "Pagination";

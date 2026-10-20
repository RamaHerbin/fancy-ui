import { useEffect, useRef, useState } from "react";
import type { CSSProperties, MouseEvent as ReactMouseEvent, ReactNode } from "react";
import { cn } from "../../utils.js";
import { sound as soundFx } from "../../sound/sound.js";
import { useMediaQuery, useReducedMotion } from "../../internals/motion/media-query.js";
import { useElementRef } from "../../internals/dom/use-element-ref.js";
import { useLiveRef } from "../../internals/dom/use-live-ref.js";
import type { TickNavItem } from "./types.js";
import "./tick-nav.css";

export interface TickNavProps {
	/** The rows, top to bottom. */
	items: TickNavItem[];
	/** Id of the current item. */
	value?: string;
	/** Called with the id of an item that is activated and not already current. */
	onValueChange?: (id: string) => void;
	/**
	 * Content of the floating card shown beside the row under the pointer (or
	 * keyboard focus). Leave it out and no card is rendered.
	 */
	preview?: (item: TickNavItem) => ReactNode;
	/** How many rows away from the pointer the bars still react. */
	reach?: number;
	/** Extra length, in px, a bar gains right under the pointer. Labels slide by the same amount. */
	maxExtend?: number;
	/** Short ruler ticks drawn between two rows. */
	minorTicks?: number;
	/** Accessible name of the `<nav>` landmark. */
	ariaLabel?: string;
	/**
	 * Plays the `tick` cue each time a mouse or pen moves onto a new row and
	 * `select` when an item that is not already current is activated. Off by
	 * default; only audible once the user has enabled sound.
	 */
	sound?: boolean;
	/** Additional CSS classes on the `<nav>`. */
	className?: string;
}

function smoothstep(x: number): number {
	const t = Math.min(1, Math.max(0, x));
	return t * t * (3 - 2 * t);
}

/**
 * A navigation list on a ruler of tick marks. The proximity field is eased in
 * a rAF loop and written straight to `--tn-e` / `--tn-e-next` on each row; no
 * per-frame value goes through React state.
 */
export function TickNav({
	items,
	value: valueProp,
	onValueChange,
	preview,
	reach = 3,
	maxExtend = 32,
	minorTicks = 3,
	ariaLabel = "Navigation",
	sound = false,
	className,
}: TickNavProps) {
	// `value` mirrors the Svelte side's `$bindable()`: the prop seeds internal
	// state, activation writes that state, and a re-passed NEW prop value resyncs it.
	const [value, setValue] = useState(valueProp);
	const [seededFrom, setSeededFrom] = useState(valueProp);
	if (valueProp !== seededFrom) {
		setSeededFrom(valueProp);
		setValue(valueProp);
	}

	const [list, listRef] = useElementRef<HTMLUListElement>();
	/** Row under the pointer or keyboard focus; -1 when none. */
	const [active, setActiveState] = useState(-1);
	/** Centre of the active row, in list-local px, for the preview card. */
	const [activeY, setActiveY] = useState(0);

	const reduced = useReducedMotion();
	// `any-hover: none` only when NO attached device can hover (see Dock): a
	// hybrid with a mouse still gets the effect; touch is filtered by pointerType.
	const coarse = useMediaQuery("(any-hover: none)");

	const ticks = Math.max(0, Math.round(minorTicks));
	const activeItem = active >= 0 ? items[active] : undefined;

	const live = useLiveRef({ items, reach, sound, reduced, coarse });
	const api = useRef<{ refresh: () => void } | null>(null);

	// Proximity field + input handlers. All per-frame state lives in this
	// closure, never in React state.
	useEffect(() => {
		if (!list) return;
		let centers: number[] = [];
		let rowHeight = 0;
		let current: number[] = [];
		let target: number[] = [];
		let pointerY: number | null = null;
		let inside = false;
		let frame = 0;
		let lastT = 0;
		let activeIdx = -1;

		const rows = (): HTMLLIElement[] =>
			Array.from(list.querySelectorAll<HTMLLIElement>(":scope > li"));

		function measure(): void {
			const els = rows();
			centers = els.map((el) => el.offsetTop + el.offsetHeight / 2);
			rowHeight = els[0]?.offsetHeight ?? 0;
			if (current.length !== els.length) {
				current = els.map((_, i) => current[i] ?? 0);
				target = els.map((_, i) => target[i] ?? 0);
			}
		}

		function retarget(): void {
			const span = Math.max(1, live.current.reach) * rowHeight;
			for (let i = 0; i < centers.length; i++) {
				target[i] =
					pointerY === null || span === 0
						? 0
						: smoothstep(1 - Math.abs(pointerY - centers[i]!) / span);
			}
		}

		function paint(): void {
			const els = rows();
			for (let i = 0; i < els.length; i++) {
				const e = current[i] ?? 0;
				const next = current[i + 1] ?? e;
				els[i]!.style.setProperty("--tn-e", e.toFixed(4));
				els[i]!.style.setProperty("--tn-e-next", next.toFixed(4));
			}
		}

		function step(t: number): void {
			const dt = lastT ? Math.min(64, t - lastT) : 16;
			lastT = t;
			let moving = false;
			for (let i = 0; i < current.length; i++) {
				const goal = target[i] ?? 0;
				const from = current[i] ?? 0;
				// Rise quickly toward the pointer, relax slowly behind it: the bars
				// leave a fading trail where the pointer has just been.
				const tau = goal > from ? 70 : 260;
				const next = live.current.reduced ? goal : goal + (from - goal) * Math.exp(-dt / tau);
				current[i] = Math.abs(next - goal) < 0.002 ? goal : next;
				if (current[i] !== goal) moving = true;
			}
			paint();
			frame = moving ? requestAnimationFrame(step) : 0;
			if (!moving) lastT = 0;
		}

		function kick(): void {
			retarget();
			if (!frame) frame = requestAnimationFrame(step);
		}

		function indexAt(y: number): number {
			const half = rowHeight / 2;
			for (let i = 0; i < centers.length; i++) {
				if (Math.abs(y - centers[i]!) <= half) return i;
			}
			return -1;
		}

		function setActive(i: number, fromPointer: boolean): void {
			if (i === activeIdx) return;
			activeIdx = i;
			setActiveState(i);
			if (i >= 0) setActiveY(centers[i] ?? 0);
			if (i >= 0 && fromPointer && live.current.sound && !live.current.items[i]?.disabled) {
				soundFx.play("tick");
			}
		}

		function onPointerMove(event: PointerEvent): void {
			if (event.pointerType === "touch" || !event.isPrimary) return;
			// Re-measure once per visit: cheap, and catches layout shifts (fonts,
			// a parent that scrolled or reflowed) that never resized the list itself.
			if (!inside) {
				measure();
				inside = true;
			}
			const y = event.clientY - list!.getBoundingClientRect().top;
			setActive(indexAt(y), true);
			if (live.current.coarse) return;
			pointerY = y;
			kick();
		}

		function onPointerLeave(event: PointerEvent): void {
			if (event.pointerType === "touch") return;
			inside = false;
			pointerY = null;
			setActive(-1, false);
			kick();
		}

		// Keyboard focus drives the same field, so the effect is not mouse-only.
		function onFocusIn(event: FocusEvent): void {
			const el = event.target as HTMLElement | null;
			const li = el?.closest("li");
			if (!li || li.parentElement !== list) return;
			if (!el?.matches(":focus-visible")) return;
			measure();
			const i = rows().indexOf(li as HTMLLIElement);
			setActive(i, false);
			pointerY = centers[i] ?? null;
			kick();
		}

		function onFocusOut(event: FocusEvent): void {
			const next = event.relatedTarget as Node | null;
			if (next && list!.contains(next)) return;
			if (pointerY !== null && activeIdx >= 0) {
				pointerY = null;
				setActive(-1, false);
				kick();
			}
		}

		// Re-measure when rows are added/removed or resized; repaint so a restored
		// list does not keep stale extensions.
		function refresh(): void {
			measure();
			paint();
		}
		api.current = { refresh };
		refresh();
		const ro = new ResizeObserver(() => {
			measure();
			retarget();
			paint();
		});
		ro.observe(list);

		list.addEventListener("pointermove", onPointerMove);
		list.addEventListener("pointerleave", onPointerLeave);
		list.addEventListener("focusin", onFocusIn);
		list.addEventListener("focusout", onFocusOut);
		return () => {
			list.removeEventListener("pointermove", onPointerMove);
			list.removeEventListener("pointerleave", onPointerLeave);
			list.removeEventListener("focusin", onFocusIn);
			list.removeEventListener("focusout", onFocusOut);
			ro.disconnect();
			api.current = null;
			if (frame) cancelAnimationFrame(frame);
			frame = 0;
		};
	}, [list, live]);

	useEffect(() => {
		api.current?.refresh();
	}, [items.length]);

	function activate(item: TickNavItem, event: ReactMouseEvent): void {
		if (item.disabled) {
			event.preventDefault();
			return;
		}
		if (item.id === value) return;
		if (sound) soundFx.play("select");
		setValue(item.id);
		onValueChange?.(item.id);
	}

	return (
		<nav
			aria-label={ariaLabel}
			className={cn("tn-root relative", className)}
			style={{ "--tn-max": `${maxExtend}px` } as CSSProperties}
			data-reduced={reduced ? "" : undefined}
		>
			<ul ref={listRef} className="tn-list">
				{items.map((item, i) => {
					const isCurrent = item.id === value;
					const label = (
						<>
							<span className="tn-label">{item.label}</span>
							{item.badge ? <span className="tn-badge">{item.badge}</span> : null}
						</>
					);
					return (
						<li
							key={item.id}
							className="tn-row"
							data-current={isCurrent ? "" : undefined}
							data-active={i === active ? "" : undefined}
							data-disabled={item.disabled ? "" : undefined}
						>
							<span className="tn-rail" aria-hidden="true">
								<span className="tn-bar">
									<svg className="tn-wave" preserveAspectRatio="none" viewBox="0 0 64 8">
										<path d="M0 4 Q2 0 4 4 T8 4 T12 4 T16 4 T20 4 T24 4 T28 4 T32 4 T36 4 T40 4 T44 4 T48 4 T52 4 T56 4 T60 4 T64 4 T68 4 T72 4" />
									</svg>
								</span>
								{i < items.length - 1 &&
									Array.from({ length: ticks }, (_, k) => (
										<span
											key={k}
											className="tn-minor"
											style={{ "--tn-f": (k + 1) / (ticks + 1) } as CSSProperties}
										/>
									))}
							</span>
							{item.href && !item.disabled ? (
								<a
									className="tn-link"
									href={item.href}
									aria-current={isCurrent ? "page" : undefined}
									onClick={(e) => activate(item, e)}
								>
									{label}
								</a>
							) : (
								<button
									type="button"
									className="tn-link"
									disabled={item.disabled}
									aria-current={isCurrent ? "page" : undefined}
									onClick={(e) => activate(item, e)}
								>
									{label}
								</button>
							)}
						</li>
					);
				})}
			</ul>

			{preview ? (
				<div
					className="tn-preview"
					aria-hidden="true"
					data-open={activeItem ? "" : undefined}
					style={{ "--tn-py": `${activeY}px` } as CSSProperties}
				>
					{activeItem ? preview(activeItem) : null}
				</div>
			) : null}
		</nav>
	);
}

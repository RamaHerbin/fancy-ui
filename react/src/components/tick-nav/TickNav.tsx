import { useEffect, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent, ReactNode } from "react";
import { cn } from "../../utils.js";
import { sound as soundFx } from "../../sound/sound.js";
import { useReducedMotion } from "../../internals/motion/media-query.js";
import { useElementRef } from "../../internals/dom/use-element-ref.js";
import { useLiveRef } from "../../internals/dom/use-live-ref.js";
import { createTickNavCore, TICK_NAV_DEFAULTS, TICK_NAV_FLAT_PATH } from "./tick-nav-core.js";
import type { TickNavCore } from "./tick-nav-core.js";
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
	 * Content of the card that follows the pointer while a row is hovered (or
	 * sits beside a keyboard-focused row). Leave it out and no card is rendered.
	 */
	preview?: (item: TickNavItem) => ReactNode;
	/** Rows over which the neighbours of the hovered row still react. */
	reach?: number;
	/** Ruler ticks drawn between two rows. */
	minorTicks?: number;
	/** Accessible name of the `<nav>` landmark. */
	ariaLabel?: string;
	/**
	 * Plays a cue each time a mouse or pen plucks a line: `hover` for an
	 * item's line, a softer `tick` for a ruler tick. Off by default; only
	 * audible once the user has enabled sound.
	 */
	sound?: boolean;
	/**
	 * `"neon"` turns the lines into glowing tubes: proximity raises the glow,
	 * a hot beam of light rides every pluck, labels glow on hover, and the
	 * current line breathes. Made for dark surfaces.
	 */
	variant?: "default" | "neon";
	/** Additional CSS classes on the `<nav>`. */
	className?: string;
}

/**
 * A navigation list on a ruler of tick marks. All motion lives in the shared
 * core, which owns the pointer listeners and writes its CSS variables straight
 * to the DOM; React only tracks which row is hovered.
 */
export function TickNav({
	items,
	value: valueProp,
	onValueChange,
	preview,
	reach = TICK_NAV_DEFAULTS.reach,
	minorTicks = 2,
	ariaLabel = "Navigation",
	sound = false,
	variant = "default",
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

	const [root, rootRef] = useElementRef<HTMLElement>();
	const [list, listRef] = useElementRef<HTMLUListElement>();
	/** Row under the pointer or keyboard focus; -1 when none. */
	const [active, setActive] = useState(-1);
	const coreRef = useRef<TickNavCore | null>(null);

	const reduced = useReducedMotion();

	const ticks = Math.max(0, Math.round(minorTicks));
	const currentIndex = items.findIndex((item) => item.id === value);
	const activeItem = active >= 0 ? items[active] : undefined;

	const live = useLiveRef({ reach, currentIndex, reduced, sound });

	useEffect(() => {
		if (!root || !list) return;
		const { reach, currentIndex, reduced } = live.current;
		const instance = createTickNavCore(root, list, {
			reach,
			current: currentIndex,
			reducedMotion: reduced,
			onActiveChange(index) {
				setActive(index);
			},
			onPluck(kind) {
				if (!live.current.sound) return;
				if (kind === "row") soundFx.play("hover");
				else soundFx.play("tick", { volume: 0.6 });
			},
		});
		coreRef.current = instance;
		return () => {
			instance.destroy();
			coreRef.current = null;
			setActive(-1);
		};
	}, [root, list, live]);

	useEffect(() => {
		coreRef.current?.update({ reach, current: currentIndex, reducedMotion: reduced });
	}, [root, list, reach, currentIndex, reduced]);

	// Rows were added, removed or reordered: the core re-reads them after the DOM update.
	const idKey = items.map((item) => item.id).join("\u0000");
	useEffect(() => {
		coreRef.current?.refresh();
	}, [root, list, idKey]);

	function activate(item: TickNavItem, event: ReactMouseEvent): void {
		if (item.disabled) {
			event.preventDefault();
			return;
		}
		if (item.id === value) return;
		setValue(item.id);
		onValueChange?.(item.id);
	}

	return (
		<nav
			ref={rootRef}
			aria-label={ariaLabel}
			className={cn("tn-root", className)}
			data-variant={variant === "neon" ? "neon" : undefined}
		>
			<ul ref={listRef} className="tn-list">
				{items.map((item, i) => {
					const isCurrent = item.id === value;
					const inner = (
						<>
							<svg
								className="tn-bar"
								viewBox="0 0 54 8"
								preserveAspectRatio="none"
								aria-hidden="true"
							>
								<path className="tn-path" d={TICK_NAV_FLAT_PATH} />
								{variant === "neon" ? (
									<path className="tn-beam" d={TICK_NAV_FLAT_PATH} pathLength={100} />
								) : null}
							</svg>
							<span className="tn-label">
								{item.label}
								{item.badge ? <span className="tn-badge">{item.badge}</span> : null}
							</span>
						</>
					);
					return (
						<li
							key={item.id}
							className="tn-item"
							data-current={isCurrent ? "" : undefined}
							data-active={i === active ? "" : undefined}
							data-disabled={item.disabled ? "" : undefined}
						>
							{item.href && !item.disabled ? (
								<a
									className="tn-link"
									href={item.href}
									aria-current={isCurrent ? "page" : undefined}
									onClick={(e) => activate(item, e)}
								>
									{inner}
								</a>
							) : (
								<button
									type="button"
									className="tn-link"
									disabled={item.disabled}
									aria-current={isCurrent ? "page" : undefined}
									onClick={(e) => activate(item, e)}
								>
									{inner}
								</button>
							)}
							{ticks > 0 && i < items.length - 1 ? (
								<span className="tn-ticks" aria-hidden="true">
									{Array.from({ length: ticks }, (_, k) => (
										<span key={k} className="tn-tick">
											<svg viewBox="0 0 54 8" preserveAspectRatio="none">
												<path className="tn-tick-path" d={TICK_NAV_FLAT_PATH} />
												{variant === "neon" ? (
													<path className="tn-beam" d={TICK_NAV_FLAT_PATH} pathLength={100} />
												) : null}
											</svg>
										</span>
									))}
								</span>
							) : null}
						</li>
					);
				})}
			</ul>

			{preview && activeItem ? (
				<div className="tn-preview" aria-hidden="true">
					{preview(activeItem)}
				</div>
			) : null}
		</nav>
	);
}

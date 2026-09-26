<script lang="ts" module>
	import type { Snippet } from "svelte";

	export type FlipCardTrigger = "hover" | "click";

	export interface FlipCardProps {
		/** Axis of rotation */
		rotate?: "x" | "y";
		/**
		 * What flips the card. `hover` (default) flips on pointer hover and on
		 * keyboard focus; `click` makes the card a toggle button (click, tap,
		 * Enter or Space).
		 */
		trigger?: FlipCardTrigger;
		/** Whether the back is showing. Bindable. */
		flipped?: boolean;
		/** Called with the new state after every flip, however it happened. */
		onflip?: (flipped: boolean) => void;
		/** Length of one flip in milliseconds */
		duration?: number;
		/** Light the faces as they turn: a sheen sweeping across and shading edge-on */
		glare?: boolean;
		/** Accessible name for the card (announced in click mode) */
		label?: string;
		/** Additional CSS classes on the card */
		class?: string;
		/** Front face content */
		children?: Snippet;
		/** Back face content */
		back?: Snippet;
	}

	/** Whether an accumulated angle (a whole number of half turns) shows the back. */
	export function showsBack(angle: number): boolean {
		return Math.abs(Math.round(angle / 180)) % 2 === 1;
	}

	/**
	 * Which way to turn, from where the pointer crosses the card's edge: the
	 * card turns the way the pointer travels, so it seems pushed by it.
	 * `entering` is true on enter, false on leave.
	 */
	export function flipDirection(
		rect: { left: number; top: number; width: number; height: number },
		point: { x: number; y: number },
		axis: "x" | "y",
		entering: boolean
	): 1 | -1 {
		const along =
			axis === "y" ? point.x - rect.left - rect.width / 2 : point.y - rect.top - rect.height / 2;
		// Entering from the start side, or leaving through the end side, is
		// travelling toward the end: turn positive.
		const towardEnd = entering ? along < 0 : along >= 0;
		const sign = towardEnd ? 1 : -1;
		// rotateX turns the top away for positive angles: flip the sign so a
		// pointer moving down tips the card down.
		return (axis === "y" ? sign : -sign) as 1 | -1;
	}
</script>

<script lang="ts">
	import { untrack } from "svelte";
	import { cn } from "$lib/utils";
	import { createReducedMotion } from "../_internals/motion/media-query.svelte.js";

	let {
		rotate = "y",
		trigger = "hover",
		flipped = $bindable(false),
		onflip,
		duration = 700,
		glare = true,
		label,
		class: className = "",
		children,
		back,
	}: FlipCardProps = $props();

	const reduced = createReducedMotion();
	$effect(() => reduced.start());

	/** Accumulated angle: every flip adds a half turn, so it never rewinds. */
	let angle = $state(untrack(() => (flipped ? 180 : 0)));
	const showingBack = $derived(showsBack(angle));

	let rootEl: HTMLDivElement | null = $state(null);
	let liftEl: HTMLDivElement | null = $state(null);
	let shadowEl: HTMLDivElement | null = $state(null);

	function turn(direction: 1 | -1) {
		angle += 180 * direction;
		const next = showsBack(angle);
		flipped = next;
		onflip?.(next);
		lift();
	}

	/** The card rises through the middle of the flip and settles; its shadow spreads, then gathers. */
	function lift() {
		if (reduced.current) return;
		const opts = { duration, easing: "cubic-bezier(0.33, 1, 0.68, 1)" };
		liftEl?.animate?.(
			[
				{ transform: "translateZ(0) scale(1)" },
				{ transform: "translateZ(40px) scale(1.05)", offset: 0.45 },
				{ transform: "translateZ(0) scale(1)" },
			],
			opts
		);
		shadowEl?.animate?.(
			[
				{ opacity: 0.35, transform: "translateY(10px) scale(0.92)", filter: "blur(14px)" },
				{
					opacity: 0.18,
					transform: "translateY(26px) scale(0.85)",
					filter: "blur(26px)",
					offset: 0.45,
				},
				{ opacity: 0.35, transform: "translateY(10px) scale(0.92)", filter: "blur(14px)" },
			],
			opts
		);
	}

	// A `flipped` changed from outside turns the card the rest of the way.
	$effect(() => {
		const want = flipped;
		untrack(() => {
			if (want !== showsBack(angle)) {
				angle += 180;
				onflip?.(want);
				lift();
			}
		});
	});

	// ---- hover mode --------------------------------------------------------

	function pointerCross(event: PointerEvent, entering: boolean) {
		if (trigger !== "hover" || event.pointerType === "touch" || !rootEl) return;
		const wantBack = entering;
		if (showsBack(angle) === wantBack) return;
		const dir = flipDirection(
			rootEl.getBoundingClientRect(),
			{ x: event.clientX, y: event.clientY },
			rotate,
			entering
		);
		turn(dir);
	}

	// Keyboard users reach the back by focusing the card, in hover mode too.
	function handleFocus(event: FocusEvent) {
		if (trigger !== "hover" || showsBack(angle)) return;
		if (event.target === rootEl) turn(1);
	}
	function handleBlur(event: FocusEvent) {
		if (trigger !== "hover" || !showsBack(angle)) return;
		if (rootEl && event.relatedTarget instanceof Node && rootEl.contains(event.relatedTarget))
			return;
		turn(1);
	}

	// ---- click mode / touch --------------------------------------------------

	const INTERACTIVE =
		"a, button, input, select, textarea, label, [role='button'], [contenteditable='true']";

	/** A click on a link or button inside a face is that control's, not the card's. */
	function isInnerControl(target: EventTarget | null): boolean {
		if (!(target instanceof Element) || !rootEl) return false;
		const control = target.closest(INTERACTIVE);
		return control !== null && control !== rootEl && rootEl.contains(control);
	}

	function handleClick(event: MouseEvent) {
		// A tap flips a hover card too: touch has no hover to reveal the back.
		const touchOnHover = trigger === "hover" && (event as PointerEvent).pointerType === "touch";
		if (trigger !== "click" && !touchOnHover) return;
		if (isInnerControl(event.target)) return;
		turn(1);
	}

	function handleKeydown(event: KeyboardEvent) {
		if (trigger !== "click" || event.target !== rootEl) return;
		if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			turn(1);
		}
	}
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
	bind:this={rootEl}
	class={cn("group ft-flip-card relative h-72 w-56 [perspective:1000px]", className)}
	data-axis={rotate}
	data-flipped={showingBack ? "" : undefined}
	data-trigger={trigger}
	style="--fc-duration: {duration}ms; --fc-target: {angle}deg"
	role={trigger === "click" ? "button" : "group"}
	tabindex="0"
	aria-pressed={trigger === "click" ? showingBack : undefined}
	aria-label={label}
	aria-roledescription="flip card"
	onpointerenter={(e) => pointerCross(e, true)}
	onpointerleave={(e) => pointerCross(e, false)}
	onfocus={handleFocus}
	onblur={handleBlur}
	onclick={handleClick}
	onkeydown={handleKeydown}
>
	<div bind:this={shadowEl} class="ft-flip-card__shadow" aria-hidden="true"></div>

	<div bind:this={liftEl} class="ft-flip-card__lift size-full [transform-style:preserve-3d]">
		<div class="ft-flip-card__inner relative size-full rounded-2xl [transform-style:preserve-3d]">
			<!-- Front -->
			<div
				class="ft-flip-card__face ft-flip-card__front bg-card text-card-foreground absolute size-full overflow-hidden rounded-2xl border [backface-visibility:hidden]"
				aria-hidden={showingBack ? "true" : undefined}
				inert={showingBack}
			>
				{#if children}
					{@render children()}
				{/if}
				{#if glare}<span class="ft-flip-card__light" aria-hidden="true"></span>{/if}
			</div>

			<!-- Back -->
			<div
				class="ft-flip-card__face ft-flip-card__back bg-card text-card-foreground absolute size-full overflow-hidden rounded-2xl border p-4 [backface-visibility:hidden]"
				aria-hidden={showingBack ? undefined : "true"}
				inert={!showingBack}
			>
				{#if back}
					{@render back()}
				{/if}
				{#if glare}<span class="ft-flip-card__light" aria-hidden="true"></span>{/if}
			</div>
		</div>
	</div>
</div>

<style>
	/* The one number everything turns on: the card's rotation. Registered so
	   it can transition, and inherited so the faces can light themselves
	   from it. */
	@property --fc-angle {
		syntax: "<angle>";
		inherits: true;
		initial-value: 0deg;
	}

	.ft-flip-card {
		--fc-angle: var(--fc-target);
		outline: none;
		-webkit-tap-highlight-color: transparent;
	}

	.ft-flip-card:focus-visible .ft-flip-card__inner {
		box-shadow: 0 0 0 3px color-mix(in oklab, var(--color-ring, #888) 60%, transparent);
	}

	.ft-flip-card[data-trigger="click"] {
		cursor: pointer;
	}

	.ft-flip-card__lift,
	.ft-flip-card__inner {
		position: relative;
	}

	.ft-flip-card[data-axis="y"] .ft-flip-card__inner {
		transform: rotateY(var(--fc-angle));
	}

	.ft-flip-card[data-axis="x"] .ft-flip-card__inner {
		transform: rotateX(var(--fc-angle));
	}

	.ft-flip-card[data-axis="y"] .ft-flip-card__back {
		transform: rotateY(180deg);
	}

	.ft-flip-card[data-axis="x"] .ft-flip-card__back {
		transform: rotateX(180deg);
	}

	/* The shadow on the "table" under the card. */
	.ft-flip-card__shadow {
		position: absolute;
		inset: 8% 6% -4%;
		border-radius: 1.25rem;
		background: rgb(0 0 0 / 0.9);
		opacity: 0.35;
		transform: translateY(10px) scale(0.92);
		filter: blur(14px);
		pointer-events: none;
	}

	/* ---- light: off unless the browser can compute it ---------------------- */

	.ft-flip-card__light {
		display: none;
	}

	@supports (opacity: calc(sin(30deg))) {
		.ft-flip-card__face {
			/* the face's own turn: the back starts half a turn round */
			--fc-face: var(--fc-angle);
			/* |sin| — 0 facing you, 1 edge-on */
			--fc-edge: max(sin(var(--fc-face)), -1 * sin(var(--fc-face)));
		}

		.ft-flip-card__back {
			--fc-face: calc(var(--fc-angle) + 180deg);
		}

		.ft-flip-card__light {
			display: block;
			position: absolute;
			inset: 0;
			pointer-events: none;
			border-radius: inherit;
			/* a sheen that sweeps across as the face turns, over a shade that
			   deepens as the face goes edge-on */
			background:
				linear-gradient(
					var(--fc-sheen-angle, 105deg),
					transparent 38%,
					rgb(255 255 255 / 0.55) 50%,
					transparent 62%
				),
				rgb(0 0 0 / calc(var(--fc-edge) * 0.55));
			background-size:
				300% 300%,
				100% 100%;
			background-repeat: no-repeat;
			background-position:
				calc(50% - sin(var(--fc-face)) * 45%) calc(50% - sin(var(--fc-face)) * 45%),
				0 0;
		}

		/* the sheen is brightest part-way round, never facing you or edge-on */
		.ft-flip-card__light {
			opacity: calc(min(1, var(--fc-edge) * 2.4));
		}

		.ft-flip-card[data-axis="x"] .ft-flip-card__light {
			--fc-sheen-angle: 15deg;
		}
	}

	/* ---- motion ---------------------------------------------------------------- */

	@media (prefers-reduced-motion: no-preference) {
		.ft-flip-card {
			/* a slight overshoot, so the card lands rather than stops */
			transition: --fc-angle var(--fc-duration) cubic-bezier(0.34, 1.25, 0.64, 1);
		}
	}

	/* Reduced motion: no turning at all — the faces cross-fade in place. */
	@media (prefers-reduced-motion: reduce) {
		/* as specific as the axis rules above, and later, so it wins */
		.ft-flip-card[data-axis] .ft-flip-card__inner,
		.ft-flip-card[data-axis] .ft-flip-card__back {
			transform: none;
		}

		.ft-flip-card__face {
			transition: opacity 0.2s ease;
		}

		.ft-flip-card__front,
		.ft-flip-card[data-flipped] .ft-flip-card__back {
			opacity: 1;
		}

		.ft-flip-card__back,
		.ft-flip-card[data-flipped] .ft-flip-card__front {
			opacity: 0;
		}

		.ft-flip-card__light {
			display: none;
		}
	}
</style>

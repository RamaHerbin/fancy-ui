<!--
	IridescentText — the petrol film clipped to real, selectable, server-rendered
	text. One inline span, so a line break inside it keeps ONE continuous field
	(`box-decoration-break: slice`, the default) instead of restarting per line.

	The field (petrol.css) drifts on its own in CSS. JS adds only a ±6 px pointer
	parallax of the field — never the glyphs — and only while it can matter: no
	listener under reduced motion or `paused`, none while the span is off-screen
	or the tab is hidden, and the lerp loop stops as soon as it settles.
-->
<script lang="ts">
	import type { Snippet } from "svelte";
	import { onMount } from "svelte";
	import { inView } from "$lib/fancy-ui/_internals/motion/in-view.js";
	import { rafThrottle } from "$lib/fancy-ui/_internals/motion/raf.js";
	import "./petrol.css";

	interface Props {
		children: Snippet;
		/** Freeze the film on its current frame and drop the pointer listener. */
		paused?: boolean;
		/** Element whose pointer movement drives the parallax. Defaults to the parent. */
		follow?: HTMLElement;
		class?: string;
	}

	let { children, paused = false, follow, class: className = "" }: Props = $props();

	const RANGE = 6;
	const REACH = 400;
	const LERP = 0.08;

	let el: HTMLSpanElement | undefined = $state();
	let onScreen = $state(true);
	let tabHidden = $state(false);
	let reducedMotion = $state(false);

	const idle = $derived(!onScreen || tabHidden);
	const tracking = $derived(!paused && !reducedMotion && !idle);

	onMount(() => {
		const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
		reducedMotion = mq.matches;
		const onMotion = (e: MediaQueryListEvent) => (reducedMotion = e.matches);
		const onVisibility = () => (tabHidden = document.visibilityState === "hidden");
		onVisibility();
		mq.addEventListener("change", onMotion);
		document.addEventListener("visibilitychange", onVisibility);
		return () => {
			mq.removeEventListener("change", onMotion);
			document.removeEventListener("visibilitychange", onVisibility);
		};
	});

	$effect(() => {
		const node = el;
		const target = follow ?? node?.parentElement;
		if (!node || !target || !tracking) return;

		let x = 0;
		let y = 0;
		let tx = 0;
		let ty = 0;
		let frame: number | undefined;

		const write = () => {
			node.style.setProperty("--pf-px", `${x.toFixed(2)}px`);
			node.style.setProperty("--pf-py", `${y.toFixed(2)}px`);
		};
		const step = () => {
			x += (tx - x) * LERP;
			y += (ty - y) * LERP;
			if (Math.abs(tx - x) < 0.05 && Math.abs(ty - y) < 0.05) {
				x = tx;
				y = ty;
				frame = undefined;
			} else {
				frame = requestAnimationFrame(step);
			}
			write();
		};
		const aim = (nx: number, ny: number) => {
			tx = nx;
			ty = ny;
			frame ??= requestAnimationFrame(step);
		};

		const onMove = rafThrottle((cx: number, cy: number) => {
			const r = node.getBoundingClientRect();
			const dx = cx - (r.left + r.width / 2);
			const dy = cy - (r.top + r.height / 2);
			if (Math.hypot(dx, dy) > REACH + Math.max(r.width, r.height) / 2) aim(0, 0);
			else
				aim(
					Math.max(-1, Math.min(1, dx / REACH)) * RANGE,
					Math.max(-1, Math.min(1, dy / REACH)) * RANGE
				);
		});
		const handleMove = (e: PointerEvent) => onMove(e.clientX, e.clientY);
		const handleLeave = () => aim(0, 0);

		target.addEventListener("pointermove", handleMove);
		target.addEventListener("pointerleave", handleLeave);
		return () => {
			target.removeEventListener("pointermove", handleMove);
			target.removeEventListener("pointerleave", handleLeave);
			onMove.cancel();
			if (frame !== undefined) cancelAnimationFrame(frame);
			// Settle where it stopped: a jump back to centre would read as a glitch.
		};
	});
</script>

<span
	bind:this={el}
	class="petrol fx-petrol {className}"
	data-idle={idle || undefined}
	data-paused={paused || undefined}
	use:inView={{ once: false, threshold: 0, onChange: (v) => (onScreen = v) }}
	>{@render children()}</span
>

<style>
	.petrol {
		color: var(--fx-ink, #f2f1ec);
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
		/* Glyph descenders and the serif's italic overhang stay inside the field. */
		padding: 0 0.06em 0.08em 0;
		margin-right: -0.06em;
	}

	@supports not ((background-clip: text) or (-webkit-background-clip: text)) {
		.petrol {
			background: none;
			-webkit-text-fill-color: currentColor;
		}
	}

	.petrol::selection,
	.petrol :global(*::selection) {
		-webkit-text-fill-color: var(--fx-canvas, #09090b);
		background: var(--fx-ink, #f2f1ec);
	}
</style>

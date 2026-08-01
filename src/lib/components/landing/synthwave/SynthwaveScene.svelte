<script lang="ts">
	import { onMount, type Component } from "svelte";
	import { gsap } from "gsap";
	import { cn } from "$lib/utils.js";
	import {
		layerParallaxX,
		layerParallaxY,
		PARALLAX_BLEED_X,
		PARALLAX_BLEED_Y,
		PARALLAX_DURATION,
		PARALLAX_EASE,
		PARALLAX_MAX_X,
		PARALLAX_MAX_Y,
		SCENE_LAYERS,
		setSceneContext,
	} from "./scene-config.js";
	import SkyLayer from "./layers/SkyLayer.svelte";
	import StarsLayer from "./layers/StarsLayer.svelte";
	import SunLayer from "./layers/SunLayer.svelte";
	import MountainsFarLayer from "./layers/MountainsFarLayer.svelte";
	import SkylineLayer from "./layers/SkylineLayer.svelte";
	import WaterLayer from "./layers/WaterLayer.svelte";
	import GridLayer from "./layers/GridLayer.svelte";
	import PalmBackLayer from "./layers/PalmBackLayer.svelte";
	import PalmFrontLayer from "./layers/PalmFrontLayer.svelte";
	import CarLayer from "./layers/CarLayer.svelte";
	import AtmosphereLayer from "./layers/AtmosphereLayer.svelte";

	let { class: className = "" }: { class?: string } = $props();

	/**
	 * Layer id -> component. Landing a real layer is one import plus one entry
	 * here; ids without an entry stay empty wrappers, so stacking and parallax are
	 * testable before any layer exists.
	 */
	const layerComponents: Record<string, Component | undefined> = {
		sky: SkyLayer,
		stars: StarsLayer,
		sun: SunLayer,
		"mountains-far": MountainsFarLayer,
		skyline: SkylineLayer,
		water: WaterLayer,
		grid: GridLayer,
		"palm-back": PalmBackLayer,
		"palm-front": PalmFrontLayer,
		car: CarLayer,
		atmosphere: AtmosphereLayer,
	};

	let rootEl: HTMLDivElement;
	// $state so `bind:this={layerEls[index]}` writes to a reactive property —
	// a plain array warns (binding_property_non_reactive) once per layer in dev.
	let layerEls = $state<HTMLDivElement[]>([]);

	// The timeline itself is not reactive (it is a GSAP instance, not state);
	// `motionEnabled` is the reactive flag that tells layers when to (re)attach.
	let timeline: gsap.core.Timeline | null = null;
	let motionEnabled = $state(false);
	let reducedMotion = $state(false);

	setSceneContext({
		timeline: () => (motionEnabled ? timeline : null),
		reducedMotion: () => reducedMotion,
	});

	onMount(() => {
		// Pointer parallax is driven by the whole section, not just the scene box:
		// the CTA and footer sit on top of it and would otherwise swallow moves.
		const host = rootEl.closest("section") ?? rootEl;
		const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

		type LayerParallax = {
			toX: gsap.QuickToFunc;
			toY: gsap.QuickToFunc;
			ampX: number;
			ampY: number;
		};

		let parallax: LayerParallax[] = [];
		let listening = false;
		let visible = true;

		function nodes(): HTMLDivElement[] {
			return layerEls.filter((el): el is HTMLDivElement => Boolean(el));
		}

		/** Hard reset, for teardown: no tween, no easing, just centre everything. */
		function neutralPose() {
			const els = nodes();
			if (els.length > 0) gsap.set(els, { x: 0, y: 0 });
		}

		/** Soft reset, for when the pointer leaves: glide home on the same ease. */
		function easeToNeutral() {
			for (const layer of parallax) {
				layer.toX(0);
				layer.toY(0);
			}
		}

		function onPointerMove(event: PointerEvent) {
			// A finger dragging the page is scrolling, not leaning through a window:
			// it would lurch the scene sideways and leave it there.
			if (event.pointerType === "touch") return;
			// Off-screen the pointer cannot be looking at the scene, and the master
			// timeline is paused anyway — don't tween what nobody is watching.
			if (!visible) return;

			const rect = host.getBoundingClientRect();
			if (rect.width === 0 || rect.height === 0) return;

			// Clamped because the listener lives on the section: a pointer entering
			// from outside must not push a layer past its amplitude.
			const nx = gsap.utils.clamp(-1, 1, ((event.clientX - rect.left) / rect.width) * 2 - 1);
			const ny = gsap.utils.clamp(-1, 1, ((event.clientY - rect.top) / rect.height) * 2 - 1);

			for (const layer of parallax) {
				// Layers slide against the pointer, so the scene reads as a window the
				// visitor leans through: the further forward a layer sits, the more of
				// that lean it takes (see `layerParallaxX`).
				layer.toX(-nx * layer.ampX);
				layer.toY(-ny * layer.ampY);
			}
		}

		function startMotion() {
			if (motionEnabled) return;

			// Layers attach their own, usually infinitely repeating, tweens at
			// position 0. The master exists purely so one pause()/kill() reaches all
			// of them — its duration and progress are meaningless, never scrub it.
			timeline = gsap.timeline();

			parallax = SCENE_LAYERS.flatMap((layer, index) => {
				const el = layerEls[index];
				if (!el) return [];
				return [
					{
						toX: gsap.quickTo(el, "x", { duration: PARALLAX_DURATION, ease: PARALLAX_EASE }),
						toY: gsap.quickTo(el, "y", { duration: PARALLAX_DURATION, ease: PARALLAX_EASE }),
						ampX: layerParallaxX(layer) * PARALLAX_MAX_X,
						ampY: layerParallaxY(layer) * PARALLAX_MAX_Y,
					},
				];
			});

			host.addEventListener("pointermove", onPointerMove);
			// `pointerleave` (not `pointerout`) so a move onto a child of the section
			// never reads as a departure. `pointercancel` covers the pointer being
			// taken away mid-gesture, which fires no leave of its own.
			host.addEventListener("pointerleave", easeToNeutral);
			host.addEventListener("pointercancel", easeToNeutral);
			listening = true;
			motionEnabled = true;
			if (!visible) timeline.pause();
		}

		function stopMotion({ resetPose }: { resetPose: boolean }) {
			if (listening) {
				host.removeEventListener("pointermove", onPointerMove);
				host.removeEventListener("pointerleave", easeToNeutral);
				host.removeEventListener("pointercancel", easeToNeutral);
				listening = false;
			}
			motionEnabled = false;
			parallax = [];
			timeline?.kill();
			timeline = null;
			// Kills the quickTo tweens, which are not timeline children. One call
			// per element: killTweensOf with an ARRAY only removes tweens whose own
			// target list equals that exact array, and each quickTo targets a single
			// wrapper — the array form silently leaked all of them.
			for (const el of nodes()) gsap.killTweensOf(el);
			if (resetPose) neutralPose();
		}

		// Off-screen the scene costs nothing. The timeline starts playing and is
		// paused by the first observer callback if it turns out to be out of view,
		// which is safer than starting paused and never hearing from the observer.
		const observer =
			typeof IntersectionObserver === "undefined"
				? null
				: new IntersectionObserver(
						(entries) => {
							for (const entry of entries) {
								visible = entry.isIntersecting;
								if (visible) timeline?.play();
								else timeline?.pause();
							}
						},
						{ rootMargin: "10% 0px" }
					);
		observer?.observe(rootEl);

		reducedMotion = motionQuery.matches;
		if (reducedMotion) neutralPose();
		else startMotion();

		function onMotionChange(event: MediaQueryListEvent) {
			reducedMotion = event.matches;
			if (reducedMotion) stopMotion({ resetPose: true });
			else startMotion();
		}

		motionQuery.addEventListener("change", onMotionChange);

		return () => {
			motionQuery.removeEventListener("change", onMotionChange);
			observer?.disconnect();
			stopMotion({ resetPose: false });
		};
	});
</script>

<!--
	Full-bleed backdrop for the CTA + footer section. It carries no z-index of its
	own: the section's `z-10` children stack above it by DOM order, and inside the
	scene the SCENE_LAYERS order is the z-order.

	`overflow-hidden` is what makes the parallax bleed free: a layer element may
	spread past the frame by `--parallax-bleed-*` so parallax never drags its edge
	into view, and the overflow it costs is clipped here.
-->
<div
	bind:this={rootEl}
	class={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
	style={`--parallax-bleed-x: ${PARALLAX_BLEED_X}px; --parallax-bleed-y: ${PARALLAX_BLEED_Y}px;`}
	aria-hidden="true"
>
	{#each SCENE_LAYERS as layer, index (layer.id)}
		{@const Layer = layerComponents[layer.id]}
		<div
			bind:this={layerEls[index]}
			class="absolute inset-0"
			data-layer={layer.id}
			data-depth={layer.depth}
		>
			{#if Layer}
				<Layer />
			{/if}
		</div>
	{/each}
</div>

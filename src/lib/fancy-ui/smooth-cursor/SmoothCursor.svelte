<script lang="ts" module>
	import type { Snippet } from "svelte";

	export interface SpringConfig {
		/** Controls how quickly the animation settles (default: 45) */
		damping?: number;
		/** Controls the spring stiffness (default: 400) */
		stiffness?: number;
		/** Controls the virtual mass of the animated object (default: 1) */
		mass?: number;
	}

	export interface SmoothCursorProps {
		/** Custom cursor snippet to replace the default arrow cursor */
		cursor?: Snippet;
		/** Spring physics configuration */
		springConfig?: SpringConfig;
		/** Additional CSS classes */
		class?: string;
	}
</script>

<script lang="ts">
	import { onMount } from "svelte";
	import { cn } from "$lib/utils.js";

	let { cursor, springConfig = {}, class: className = "" }: SmoothCursorProps = $props();

	const config = $derived({
		damping: springConfig.damping ?? 45,
		stiffness: springConfig.stiffness ?? 400,
		mass: springConfig.mass ?? 1,
	});

	let cursorEl: HTMLDivElement;
	let visible = $state(false);
	let reducedMotion = $state(false);

	// Spring state
	let posX = 0;
	let posY = 0;
	let velX = 0;
	let velY = 0;
	let targetX = 0;
	let targetY = 0;

	// Rotation state
	let rotation = 0;
	let prevX = 0;
	let prevY = 0;

	let rafId: number | null = null;
	let lastTime = 0;

	function startAnimation() {
		if (rafId === null) {
			lastTime = 0;
			rafId = requestAnimationFrame(animate);
		}
	}

	function stopAnimation() {
		if (rafId !== null) {
			cancelAnimationFrame(rafId);
			rafId = null;
		}
	}

	function snapToTarget() {
		posX = targetX;
		posY = targetY;
		velX = 0;
		velY = 0;
		if (cursorEl) {
			cursorEl.style.transform = `translate3d(${posX}px, ${posY}px, 0)`;
		}
	}

	function onMouseMove(e: MouseEvent) {
		targetX = e.clientX;
		targetY = e.clientY;

		if (!visible) {
			posX = targetX;
			posY = targetY;
			prevX = targetX;
			prevY = targetY;
			visible = true;
		}

		if (reducedMotion) {
			snapToTarget();
		} else {
			startAnimation();
		}
	}

	function onMouseLeave() {
		visible = false;
		stopAnimation();
	}

	function onMouseEnter(e: MouseEvent) {
		targetX = e.clientX;
		targetY = e.clientY;
		posX = targetX;
		posY = targetY;
		prevX = targetX;
		prevY = targetY;
		visible = true;

		if (!reducedMotion) {
			startAnimation();
		} else {
			snapToTarget();
		}
	}

	function animate(time: number) {
		if (!visible) {
			rafId = null;
			return;
		}

		rafId = requestAnimationFrame(animate);

		if (lastTime === 0) {
			lastTime = time;
			return;
		}

		const dt = Math.min((time - lastTime) / 1000, 0.064);
		lastTime = time;

		const { stiffness, damping, mass } = config;

		// Spring physics: F = -k * displacement - c * velocity
		const forceX = -stiffness * (posX - targetX) - damping * velX;
		const forceY = -stiffness * (posY - targetY) - damping * velY;

		const accX = forceX / mass;
		const accY = forceY / mass;

		velX += accX * dt;
		velY += accY * dt;

		posX += velX * dt;
		posY += velY * dt;

		// Calculate rotation based on movement direction
		const dx = posX - prevX;
		const dy = posY - prevY;
		const distance = Math.sqrt(dx * dx + dy * dy);

		if (distance > 0.1) {
			const targetRotation = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
			let diff = targetRotation - rotation;
			while (diff > 180) diff -= 360;
			while (diff < -180) diff += 360;
			rotation += diff * 0.3;
		}

		prevX = posX;
		prevY = posY;

		if (cursorEl) {
			cursorEl.style.transform = `translate3d(${posX}px, ${posY}px, 0) rotate(${rotation}deg)`;
		}
	}

	onMount(() => {
		const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
		reducedMotion = motionQuery.matches;

		function onMotionChange(e: MediaQueryListEvent) {
			reducedMotion = e.matches;
			if (reducedMotion) {
				stopAnimation();
				snapToTarget();
			} else if (visible) {
				startAnimation();
			}
		}

		motionQuery.addEventListener("change", onMotionChange);

		document.body.style.cursor = "none";

		document.addEventListener("mousemove", onMouseMove);
		document.documentElement.addEventListener("mouseleave", onMouseLeave);
		document.documentElement.addEventListener("mouseenter", onMouseEnter);

		return () => {
			document.body.style.cursor = "";
			motionQuery.removeEventListener("change", onMotionChange);
			document.removeEventListener("mousemove", onMouseMove);
			document.documentElement.removeEventListener("mouseleave", onMouseLeave);
			document.documentElement.removeEventListener("mouseenter", onMouseEnter);
			stopAnimation();
		};
	});
</script>

<div
	bind:this={cursorEl}
	aria-hidden="true"
	class={cn(
		"pointer-events-none fixed top-0 left-0 z-[9999]",
		visible ? "opacity-100" : "opacity-0",
		className
	)}
	style="will-change: transform; translate: -50% -50%;"
>
	{#if cursor}
		{@render cursor()}
	{:else}
		<!-- Default cursor: arrow SVG -->
		<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" focusable="false">
			<path
				fill="currentColor"
				d="M9.391 2.32C8.42 1.56 7 2.253 7 3.486V28.41c0 1.538 1.966 2.18 2.874.938l6.225-8.523a2 2 0 0 1 1.615-.82h9.69c1.512 0 2.17-1.912.978-2.844z"
			/>
		</svg>
	{/if}
</div>

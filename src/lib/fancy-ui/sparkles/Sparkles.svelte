<script lang="ts">
	import { cn } from "$lib/utils";
	import { onMount } from "svelte";

	interface Props {
		background?: string;
		particleColor?: string;
		minSize?: number;
		maxSize?: number;
		speed?: number;
		particleDensity?: number;
		class?: string;
	}

	let {
		background = "#0d47a1",
		particleColor = "#ffffff",
		minSize = 1,
		maxSize = 3,
		speed = 4,
		particleDensity = 120,
		class: className = "",
	}: Props = $props();

	interface Particle {
		x: number;
		y: number;
		size: number;
		opacity: number;
		vx: number;
		vy: number;
		phase: number;
		phaseSpeed: number;
	}

	let containerRef: HTMLDivElement;
	let canvasRef: HTMLCanvasElement;
	let particles: Particle[] = [];
	let ctx: CanvasRenderingContext2D | null = null;
	let rafId: number;
	let dpr = 1;

	function resizeCanvas() {
		if (!canvasRef || !containerRef) return;
		dpr = window.devicePixelRatio || 1;
		const rect = containerRef.getBoundingClientRect();
		canvasRef.width = rect.width * dpr;
		canvasRef.height = rect.height * dpr;
		ctx = canvasRef.getContext("2d");
		if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	}

	function generateParticles() {
		particles = [];
		for (let i = 0; i < particleDensity; i++) {
			const baseSpeed = 0.05;
			const speedVariance = Math.random() * 0.3 + 0.7;
			particles.push({
				x: Math.random() * 100,
				y: Math.random() * 100,
				size: Math.random() * (maxSize - minSize) + minSize,
				opacity: Math.random() * 0.5 + 0.3,
				vx: (Math.random() - 0.5) * baseSpeed * speedVariance * speed,
				vy: ((Math.random() - 0.5) * baseSpeed - baseSpeed * 0.3) * speedVariance * speed,
				phase: Math.random() * Math.PI * 2,
				phaseSpeed: 0.015,
			});
		}
	}

	function updateAndDraw() {
		if (!ctx || !canvasRef) return;
		ctx.clearRect(0, 0, canvasRef.width, canvasRef.height);

		for (const p of particles) {
			p.x += p.vx;
			p.y += p.vy;
			if (p.x < -2) p.x = 102;
			if (p.x > 102) p.x = -2;
			if (p.y < -2) p.y = 102;
			if (p.y > 102) p.y = -2;
			p.phase = (p.phase + p.phaseSpeed) % (Math.PI * 2);
			const opacity = 0.3 + (Math.sin(p.phase) * 0.3 + 0.3);

			ctx.beginPath();
			// canvasRef.width/height are device pixels while the context already
			// carries the dpr transform, so divide it back out to draw in CSS pixels.
			ctx.arc(
				(p.x * canvasRef.width) / (100 * dpr),
				(p.y * canvasRef.height) / (100 * dpr),
				p.size,
				0,
				Math.PI * 2
			);
			ctx.fillStyle = `${particleColor}${Math.floor(opacity * 255)
				.toString(16)
				.padStart(2, "0")}`;
			ctx.fill();
		}

		rafId = requestAnimationFrame(updateAndDraw);
	}

	onMount(() => {
		ctx = canvasRef.getContext("2d");
		resizeCanvas();
		generateParticles();
		rafId = requestAnimationFrame(updateAndDraw);

		const resizeObserver = new ResizeObserver(resizeCanvas);
		resizeObserver.observe(containerRef);

		return () => {
			cancelAnimationFrame(rafId);
			resizeObserver.disconnect();
		};
	});
</script>

<div
	bind:this={containerRef}
	class={cn("relative size-full overflow-hidden will-change-transform", className)}
	style:background
>
	<canvas bind:this={canvasRef} class="absolute inset-0 size-full" aria-hidden="true"></canvas>
</div>

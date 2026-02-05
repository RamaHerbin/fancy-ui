<script lang="ts" module>
	/**
	 * FlickeringGrid - Canvas-based grid with flickering opacity squares
	 *
	 * Uses ResizeObserver, IntersectionObserver, and requestAnimationFrame
	 * for performant rendering with automatic pause when off-screen.
	 */
	export interface FlickeringGridProps {
		/** Size of each grid square in pixels */
		squareSize?: number;
		/** Gap between squares in pixels */
		gridGap?: number;
		/** Probability of a square changing opacity each second (0-1) */
		flickerChance?: number;
		/** Color of the squares (hex format) */
		color?: string;
		/** Maximum opacity of squares (0-1) */
		maxOpacity?: number;
		/** Fixed width in pixels (defaults to container width) */
		width?: number;
		/** Fixed height in pixels (defaults to container height) */
		height?: number;
		/** Additional CSS classes */
		class?: string;
	}
</script>

<script lang="ts">
	import { cn } from '$lib/utils.js';
	import { onMount } from 'svelte';

	let {
		squareSize = 4,
		gridGap = 6,
		flickerChance = 0.3,
		color = '#000000',
		maxOpacity = 0.3,
		width,
		height,
		class: className
	}: FlickeringGridProps = $props();

	let containerEl: HTMLDivElement;
	let canvasEl: HTMLCanvasElement;

	function hexToRgba(hex: string): string {
		const clean = hex.replace(/^#/, '');
		const bigint = Number.parseInt(clean, 16);
		const r = (bigint >> 16) & 255;
		const g = (bigint >> 8) & 255;
		const b = bigint & 255;
		return `rgba(${r}, ${g}, ${b},`;
	}

	onMount(() => {
		const ctx = canvasEl.getContext('2d');
		if (!ctx) return;

		let isInView = false;
		let animationFrameId: number | undefined;
		let lastTime = 0;
		let cols = 0;
		let rows = 0;
		let squares: Float32Array;
		let dpr = 1;

		function setupCanvas(w: number, h: number) {
			dpr = window.devicePixelRatio || 1;
			canvasEl.width = w * dpr;
			canvasEl.height = h * dpr;
			canvasEl.style.width = `${w}px`;
			canvasEl.style.height = `${h}px`;

			cols = Math.floor(w / (squareSize + gridGap));
			rows = Math.floor(h / (squareSize + gridGap));

			squares = new Float32Array(cols * rows);
			for (let i = 0; i < squares.length; i++) {
				squares[i] = Math.random() * maxOpacity;
			}
		}

		function updateSquares(deltaTime: number) {
			for (let i = 0; i < squares.length; i++) {
				if (Math.random() < flickerChance * deltaTime) {
					squares[i] = Math.random() * maxOpacity;
				}
			}
		}

		function drawGrid() {
			const colorPrefix = hexToRgba(color);
			ctx!.clearRect(0, 0, canvasEl.width, canvasEl.height);
			for (let i = 0; i < cols; i++) {
				for (let j = 0; j < rows; j++) {
					const opacity = squares[i * rows + j];
					ctx!.fillStyle = `${colorPrefix}${opacity})`;
					ctx!.fillRect(
						i * (squareSize + gridGap) * dpr,
						j * (squareSize + gridGap) * dpr,
						squareSize * dpr,
						squareSize * dpr
					);
				}
			}
		}

		function updateCanvasSize() {
			const w = width ?? containerEl.clientWidth;
			const h = height ?? containerEl.clientHeight;
			setupCanvas(w, h);
		}

		function animate(time: number) {
			if (!isInView) return;

			const deltaTime = (time - lastTime) / 1000;
			lastTime = time;

			updateSquares(deltaTime);
			drawGrid();
			animationFrameId = requestAnimationFrame(animate);
		}

		updateCanvasSize();

		const resizeObserver = new ResizeObserver(() => {
			updateCanvasSize();
		});

		const intersectionObserver = new IntersectionObserver(
			([entry]) => {
				isInView = entry.isIntersecting;
				if (isInView) {
					animationFrameId = requestAnimationFrame(animate);
				}
			},
			{ threshold: 0 }
		);

		resizeObserver.observe(containerEl);
		intersectionObserver.observe(canvasEl);

		return () => {
			if (animationFrameId) cancelAnimationFrame(animationFrameId);
			resizeObserver.disconnect();
			intersectionObserver.disconnect();
		};
	});
</script>

<div bind:this={containerEl} class={cn('h-full w-full', className)}>
	<canvas bind:this={canvasEl} class="pointer-events-none"></canvas>
</div>

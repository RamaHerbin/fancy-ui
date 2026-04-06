<script lang="ts" module>
	export interface MatrixRainProps {
		color?: string;
		speed?: number;
		density?: number;
		glyphSize?: number;
		fadeOpacity?: number;
		class?: string;
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";

	let {
		color = "#00ff41",
		speed = 1.0,
		density = 1.0,
		glyphSize = 16,
		fadeOpacity = 0.05,
		class: className,
	}: MatrixRainProps = $props();

	const GLYPHS =
		"アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲンABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&";

	let canvas: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D | null = null;
	let rafId: number;
	let columns: number[] = [];
	let frameCount = 0;
	let canvasW = 0;
	let canvasH = 0;

	function randomGlyph(): string {
		return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
	}

	function init(w: number, h: number) {
		const safeGlyphSize = Math.max(1, glyphSize);
		const safeDensity = Math.max(0.1, density);
		const colCount = Math.max(1, Math.floor(w / (safeGlyphSize * safeDensity)));
		columns = Array.from({ length: colCount }, () =>
			Math.floor(Math.random() * (h / safeGlyphSize))
		);
	}

	function draw() {
		if (!ctx) return;

		const w = canvasW;
		const h = canvasH;

		// Fade trail
		ctx.fillStyle = `rgba(0, 0, 0, ${fadeOpacity})`;
		ctx.fillRect(0, 0, w, h);

		ctx.font = `${glyphSize}px monospace`;
		ctx.shadowBlur = 8;
		ctx.shadowColor = color;

		const rowsPerFrame = Math.max(1, speed);
		frameCount++;

		// Only advance every N frames to control speed below 1x
		const shouldAdvance = speed >= 1 || frameCount % Math.round(1 / speed) === 0;

		if (shouldAdvance) {
			for (let i = 0; i < columns.length; i++) {
				const x = i * glyphSize * density;
				const y = columns[i] * glyphSize;

				// Head character (bright white)
				ctx.fillStyle = "#ffffff";
				ctx.fillText(randomGlyph(), x, y);

				// Body glyph one step behind (dimmer)
				if (columns[i] > 1) {
					ctx.fillStyle = color;
					ctx.fillText(randomGlyph(), x, y - glyphSize);
				}

				// Reset column when it exits bottom, with random delay
				if (y > h && Math.random() > 0.975) {
					columns[i] = 0;
				} else {
					columns[i] += rowsPerFrame;
				}
			}
		}

		ctx.shadowBlur = 0;
		rafId = requestAnimationFrame(draw);
	}

	$effect(() => {
		ctx = canvas.getContext("2d");
		if (!ctx) return;

		// Set canvas size to container size with HiDPI scaling
		const resize = () => {
			const dpr = window.devicePixelRatio || 1;
			canvasW = canvas.clientWidth;
			canvasH = canvas.clientHeight;
			canvas.width = Math.floor(canvasW * dpr);
			canvas.height = Math.floor(canvasH * dpr);
			ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
			ctx!.fillStyle = "black";
			ctx!.fillRect(0, 0, canvasW, canvasH);
			init(canvasW, canvasH);
		};

		resize();

		const observer = new ResizeObserver(resize);
		observer.observe(canvas);

		rafId = requestAnimationFrame(draw);

		return () => {
			cancelAnimationFrame(rafId);
			observer.disconnect();
		};
	});
</script>

<canvas bind:this={canvas} class={cn("block h-full w-full bg-black", className)}></canvas>

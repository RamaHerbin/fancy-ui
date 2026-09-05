import { useEffect } from "react";
import { cn } from "../../utils.js";
import { useElementRef } from "../../internals/dom/use-element-ref.js";
import { useLiveRef } from "../../internals/dom/use-live-ref.js";

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
	className?: string;
	/**
	 * Seed for the flicker stream. The same seed always produces the same
	 * sequence of opacities, which is what makes the effect reproducible in a
	 * test and identical across two mounts of the same instance. Change it to
	 * give two grids on one page different flicker — the default is shared, so
	 * two `<FlickeringGrid />` with no seed light up alike.
	 */
	seed?: number;
}

/**
 * mulberry32 — a tiny deterministic PRNG, standing in for the source's bare
 * `Math.random()`. Seeding costs nothing visually (the same uniform
 * distribution) and buys a grid that can be asserted on frame by frame, which
 * an unseeded canvas loop cannot be.
 */
function mulberry32(seed: number): () => number {
	let state = seed >>> 0;
	return () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function hexToRgba(hex: string): string {
	const clean = hex.replace(/^#/, "");
	const bigint = Number.parseInt(clean, 16);
	const r = (bigint >> 16) & 255;
	const g = (bigint >> 8) & 255;
	const b = bigint & 255;
	return `rgba(${r}, ${g}, ${b},`;
}

export function FlickeringGrid({
	squareSize = 4,
	gridGap = 6,
	flickerChance = 0.3,
	color = "#000000",
	maxOpacity = 0.3,
	width,
	height,
	className,
	seed = 1,
}: FlickeringGridProps) {
	const [container, containerRef] = useElementRef<HTMLDivElement>();
	const [canvas, canvasRef] = useElementRef<HTMLCanvasElement>();

	// Read inside the running loop only, never as effect dependencies. The
	// source runs the whole lifecycle from `onMount`, so nothing it reads is
	// tracked: a new `color` or `flickerChance` lands on the next frame, and a
	// new `squareSize` / `gridGap` / `maxOpacity` / `width` / `height` only
	// takes effect at the next `setupCanvas` — mount or resize. Making any of
	// them a dependency would tear the canvas down and re-seed every square on
	// a colour change, which the source never does.
	const squareSizeRef = useLiveRef(squareSize);
	const gridGapRef = useLiveRef(gridGap);
	const flickerChanceRef = useLiveRef(flickerChance);
	const colorRef = useLiveRef(color);
	const maxOpacityRef = useLiveRef(maxOpacity);
	const widthRef = useLiveRef(width);
	const heightRef = useLiveRef(height);

	// `seed` IS a dependency: it defines the stream from its first value on, so
	// changing it has to restart the grid.
	useEffect(() => {
		if (!container || !canvas) return;

		const context = canvas.getContext("2d");
		if (!context) return;
		// Re-bound with explicit non-null types: the drawing helpers below are
		// hoisted function declarations, and TypeScript does not carry the null
		// checks above into one.
		const ctx: CanvasRenderingContext2D = context;
		const containerEl: HTMLDivElement = container;
		const canvasEl: HTMLCanvasElement = canvas;

		const random = mulberry32(seed);

		let isInView = false;
		let animationFrameId: number | undefined;
		let lastTime = 0;
		let cols = 0;
		let rows = 0;
		let squares = new Float32Array(0);
		let dpr = 1;

		function setupCanvas(w: number, h: number) {
			const squareSize = squareSizeRef.current;
			const gridGap = gridGapRef.current;
			const maxOpacity = maxOpacityRef.current;

			dpr = window.devicePixelRatio || 1;
			canvasEl.width = w * dpr;
			canvasEl.height = h * dpr;
			canvasEl.style.width = `${w}px`;
			canvasEl.style.height = `${h}px`;

			cols = Math.floor(w / (squareSize + gridGap));
			rows = Math.floor(h / (squareSize + gridGap));

			squares = new Float32Array(cols * rows);
			for (let i = 0; i < squares.length; i++) {
				squares[i] = random() * maxOpacity;
			}
		}

		function updateSquares(deltaTime: number) {
			const flickerChance = flickerChanceRef.current;
			const maxOpacity = maxOpacityRef.current;

			for (let i = 0; i < squares.length; i++) {
				if (random() < flickerChance * deltaTime) {
					squares[i] = random() * maxOpacity;
				}
			}
		}

		function drawGrid() {
			const squareSize = squareSizeRef.current;
			const gridGap = gridGapRef.current;

			const colorPrefix = hexToRgba(colorRef.current);
			ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
			for (let i = 0; i < cols; i++) {
				for (let j = 0; j < rows; j++) {
					const opacity = squares[i * rows + j];
					ctx.fillStyle = `${colorPrefix}${opacity})`;
					ctx.fillRect(
						i * (squareSize + gridGap) * dpr,
						j * (squareSize + gridGap) * dpr,
						squareSize * dpr,
						squareSize * dpr
					);
				}
			}
		}

		function updateCanvasSize() {
			const w = widthRef.current ?? containerEl.clientWidth;
			const h = heightRef.current ?? containerEl.clientHeight;
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
			(entries) => {
				// `([entry]) =>` in the source; split in two under
				// `noUncheckedIndexedAccess`, which types the first element as
				// possibly absent. The callback never fires with an empty list.
				const entry = entries[0];
				if (!entry) return;

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
	}, [
		container,
		canvas,
		seed,
		squareSizeRef,
		gridGapRef,
		flickerChanceRef,
		colorRef,
		maxOpacityRef,
		widthRef,
		heightRef,
	]);

	return (
		<div ref={containerRef} className={cn("h-full w-full", className)}>
			<canvas ref={canvasRef} className="pointer-events-none" />
		</div>
	);
}

<script lang="ts">
	import { onDestroy } from "svelte";

	const CELL = 22;
	const COLORS = ["#ECD77F", "#B5DCB2", "#F0BFA8", "#B9CBE8"];
	const OFFSETS = [
		[0, 0],
		[1, 0],
		[0, 1],
		[-1, 0],
		[0, -1],
		[1, 1],
		[-1, 1],
	];

	type Blob = {
		id: number;
		x: number;
		y: number;
		size: number;
		bg: string;
		dur: string;
		delay: string;
	};

	let blobs = $state<Blob[]>([]);

	let n = 0;
	let uid = 0;
	let lastGx = Number.NaN;
	let lastGy = Number.NaN;
	const timeouts = new Set<ReturnType<typeof setTimeout>>();

	function handlePointerMove(
		event: PointerEvent & { currentTarget: EventTarget & HTMLDivElement }
	) {
		const rect = event.currentTarget.getBoundingClientRect();
		const gx = Math.floor((event.clientX - rect.left) / CELL);
		const gy = Math.floor((event.clientY - rect.top) / CELL);
		if (gx === lastGx && gy === lastGy) return;
		lastGx = gx;
		lastGy = gy;

		n += 1;
		const base = COLORS[n % 4];
		const count = 3 + Math.floor(Math.random() * 3);
		const items: Blob[] = [];
		for (let i = 0; i < count; i += 1) {
			const [ox, oy] = OFFSETS[i];
			const blob: Blob = {
				id: uid++,
				x: (gx + ox) * CELL,
				y: (gy + oy) * CELL,
				size: i === 0 ? CELL * 2 : CELL,
				bg: i === 0 ? base : COLORS[(n + i) % 4],
				dur: (0.7 + Math.random() * 0.5).toFixed(2),
				delay: (i * 0.05).toFixed(2),
			};
			items.push(blob);

			const removeId = blob.id;
			const timeout = setTimeout(() => {
				blobs = blobs.filter((b) => b.id !== removeId);
				timeouts.delete(timeout);
			}, 1400);
			timeouts.add(timeout);
		}
		blobs = [...blobs, ...items].slice(-40);
	}

	onDestroy(() => {
		for (const timeout of timeouts) clearTimeout(timeout);
		timeouts.clear();
	});
</script>

<div
	role="presentation"
	style="position: relative; height: 340px; width: 100%; overflow: hidden; cursor: crosshair; background-color: #191308; background-image: linear-gradient(rgba(250, 245, 230, 0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(250, 245, 230, 0.04) 1px, transparent 1px); background-size: 22px 22px;"
	onpointermove={handlePointerMove}
>
	<span
		style="position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); font-family: var(--skin-font-pixel, ui-monospace, monospace); font-size: 10px; letter-spacing: 1px; color: #5C5340; pointer-events: none; z-index: 1;"
	>
		MOVE THE CURSOR HERE
	</span>

	{#each blobs as b (b.id)}
		<span
			class="blob"
			style="left: {b.x}px; top: {b.y}px; width: {b.size}px; height: {b.size}px; background: {b.bg}; animation-duration: {b.dur}s; animation-delay: {b.delay}s"
		></span>
	{/each}
</div>

<style>
	.blob {
		position: absolute;
		pointer-events: none;
		animation-name: pixelBloom;
		animation-timing-function: steps(5, end);
		animation-fill-mode: forwards;
	}

	@keyframes pixelBloom {
		0% {
			transform: scale(1);
			opacity: 0.95;
		}
		100% {
			transform: scale(0.25);
			opacity: 0;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.blob {
			animation: none;
			opacity: 0.4;
		}
	}
</style>

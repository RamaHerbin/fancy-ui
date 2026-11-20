<script lang="ts">
	import type { PlaygroundValues } from "$lib/inspiration/types.js";
	import { SmoothCursor } from "$lib/fancy-ui/smooth-cursor";

	let { values }: { values: PlaygroundValues } = $props();

	// The cursor covers the whole page, so it only exists while the pointer is
	// on the stage. It is moved to <body> so no transformed ancestor can offset
	// its fixed layer.
	let inside = $state(false);

	function portal(node: HTMLElement) {
		document.body.appendChild(node);
		return { destroy: () => node.remove() };
	}

	// Two teammates already on the canvas: static markup, only yours is live.
	const peers = [
		{ name: "Mara", color: "#7c6cf2", x: "47%", y: "74%" },
		{ name: "Theo", color: "#e0822b", x: "78%", y: "14%" },
	];
</script>

{#snippet peerCursor(name: string, color: string, x: string, y: string)}
	<div class="pointer-events-none absolute" style:left={x} style:top={y} aria-hidden="true">
		<svg
			width="20"
			height="20"
			viewBox="0 0 24 24"
			class="-translate-x-[3px] -translate-y-[2px] overflow-visible drop-shadow-[0_1px_1.25px_rgba(0,0,0,0.3)]"
		>
			<path
				d="M4 3 L19.6 13.9 L10.2 12.7 L7.3 21.7 Z"
				fill={color}
				stroke="#fff"
				stroke-width="3"
				stroke-linejoin="round"
				paint-order="stroke fill"
			/>
		</svg>
		<span
			class="absolute top-[14px] left-[11px] flex h-[20px] items-center rounded-[3px_10px_10px_10px] px-[8px] text-[11px] leading-none font-medium whitespace-nowrap text-white shadow-[0_0_0_1px_rgba(255,255,255,0.92),0_1px_2px_rgba(0,0,0,0.28)]"
			style:background={color}
		>
			{name}
		</span>
	</div>
{/snippet}

<div
	role="presentation"
	class="relative h-full w-full cursor-none overflow-hidden bg-[#141416] bg-[radial-gradient(rgba(255,255,255,0.07)_1px,transparent_1px)] [background-size:18px_18px] select-none"
	onpointerenter={() => (inside = true)}
	onpointerleave={() => (inside = false)}
>
	<div class="absolute top-[16%] left-[8%] w-[42%]" aria-hidden="true">
		<p class="mb-1.5 text-[10px] text-neutral-500">Landing / Hero</p>
		<div class="relative rounded-lg border border-white/[0.08] bg-white/[0.03] p-3">
			<div class="h-2 w-2/3 rounded-full bg-white/10"></div>
			<div class="mt-2 h-1.5 w-1/2 rounded-full bg-white/[0.06]"></div>
			<div class="mt-4 flex gap-2">
				<div class="h-5 w-12 rounded-md bg-white/80"></div>
				<div class="h-5 w-10 rounded-md border border-white/10"></div>
			</div>
			<div
				class="pointer-events-none absolute -inset-[5px] rounded-[11px] border-[1.5px] border-[#7c6cf2]"
			></div>
		</div>
	</div>
	<div
		class="absolute top-[66%] left-[7%] w-[34%] -rotate-[1.5deg] rounded-lg border border-white/[0.06] bg-[#2a2217] p-2.5 text-[11px] leading-snug text-[#e8c48f] shadow-sm"
		aria-hidden="true"
	>
		Ship the pricing section before Friday's review.
	</div>
	{#each peers as peer (peer.name)}
		{@render peerCursor(peer.name, peer.color, peer.x, peer.y)}
	{/each}
	{#if !inside}
		<p
			class="absolute bottom-3 left-1/2 -translate-x-1/2 font-mono text-[10.5px] tracking-[0.2em] text-white/45"
		>
			HOVER TO JOIN
		</p>
	{/if}
</div>

{#if inside}
	<div use:portal>
		<SmoothCursor
			label={values.label as string}
			color={values.color as string}
			rotate={values.rotate === true}
		/>
	</div>
{/if}

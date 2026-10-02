<script lang="ts">
	import { SmoothCursor } from "$lib/fancy-ui/smooth-cursor";

	let inside = $state(false);

	// Two teammates already on the canvas. They are static decoration drawn
	// with plain markup — only your own cursor is live.
	const peers = [
		{ name: "Mara", color: "#7c6cf2", x: "31%", y: "63%" },
		{ name: "Theo", color: "#e0822b", x: "76%", y: "24%" },
	];
</script>

{#snippet peerCursor(name: string, color: string, x: string, y: string)}
	<div class="pointer-events-none absolute" style:left={x} style:top={y} aria-hidden="true">
		<svg
			width="24"
			height="24"
			viewBox="0 0 24 24"
			class="-translate-x-[4px] -translate-y-[3px] overflow-visible drop-shadow-[0_1px_1.25px_rgba(0,0,0,0.3)]"
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
			class="absolute top-[17px] left-[13px] flex h-[22px] items-center rounded-[3px_11px_11px_11px] px-[9px] text-[12px] leading-none font-medium whitespace-nowrap text-white shadow-[0_0_0_1px_rgba(255,255,255,0.92),0_1px_2px_rgba(0,0,0,0.28)]"
			style:background={color}
		>
			{name}
		</span>
	</div>
{/snippet}

<div
	class="w-full rounded-2xl border border-black/[0.08] bg-[#f4f4f5] p-1.5 dark:border-white/[0.08] dark:bg-[#0b0b0c]"
>
	<div
		role="presentation"
		class="relative h-80 cursor-none overflow-hidden rounded-xl border border-black/[0.08] bg-[#fafafa] bg-[radial-gradient(rgba(0,0,0,0.09)_1px,transparent_1px)] [background-size:18px_18px] select-none dark:border-white/[0.08] dark:bg-[#141416] dark:bg-[radial-gradient(rgba(255,255,255,0.07)_1px,transparent_1px)]"
		onpointerenter={() => (inside = true)}
		onpointerleave={() => (inside = false)}
	>
		<!-- A frame a teammate has selected -->
		<div class="absolute top-[18%] left-[8%] w-[38%]" aria-hidden="true">
			<p class="mb-1.5 text-[11px] text-neutral-400 dark:text-neutral-500">Landing / Hero</p>
			<div
				class="relative rounded-lg border border-black/[0.08] bg-white p-4 dark:border-white/[0.08] dark:bg-white/[0.03]"
			>
				<div class="h-2.5 w-2/3 rounded-full bg-neutral-200 dark:bg-white/10"></div>
				<div class="mt-2 h-2 w-1/2 rounded-full bg-neutral-100 dark:bg-white/[0.06]"></div>
				<div class="mt-5 flex gap-2">
					<div class="h-6 w-16 rounded-md bg-neutral-900 dark:bg-white/80"></div>
					<div class="h-6 w-14 rounded-md border border-black/[0.08] dark:border-white/10"></div>
				</div>
				<div
					class="pointer-events-none absolute -inset-[5px] rounded-[11px] border-[1.5px] border-[#7c6cf2]"
				>
					{#each ["-top-[4px] -left-[4px]", "-top-[4px] -right-[4px]", "-bottom-[4px] -left-[4px]", "-bottom-[4px] -right-[4px]"] as corner}
						<span
							class="absolute size-[7px] rounded-[2px] border-[1.5px] border-[#7c6cf2] bg-white {corner}"
						></span>
					{/each}
				</div>
			</div>
		</div>

		<!-- A sticky note another teammate is reading -->
		<div
			class="absolute top-[36%] right-[9%] w-[30%] rotate-[1.5deg] rounded-lg border border-black/[0.06] bg-[#fdf3e3] p-3 text-[12px] leading-snug text-[#7a5520] shadow-sm dark:border-white/[0.06] dark:bg-[#2a2217] dark:text-[#e8c48f]"
			aria-hidden="true"
		>
			Ship the pricing section before Friday's review.
		</div>

		{#each peers as peer (peer.name)}
			{@render peerCursor(peer.name, peer.color, peer.x, peer.y)}
		{/each}

		{#if !inside}
			<p
				class="absolute bottom-4 left-1/2 -translate-x-1/2 text-[11px] text-neutral-400 dark:text-neutral-500"
			>
				Hover to join the canvas
			</p>
		{/if}
	</div>
</div>

{#if inside}
	<SmoothCursor label="You" color="#3a7bfd" />
{/if}

<script lang="ts">
	import { FireworksHdr, type FireworksHandle, type ShellKind } from "$lib/fancy-ui/fireworks-hdr";

	let handle = $state<FireworksHandle | null>(null);

	// Any closed figure works: points are y-up around the origin, scale is free.
	// This one is a lightning bolt drawn by hand.
	const BOLT = [
		{ x: 0.1, y: 1 },
		{ x: -0.55, y: 0.05 },
		{ x: -0.1, y: 0.05 },
		{ x: -0.3, y: -1 },
		{ x: 0.5, y: 0.1 },
		{ x: 0.05, y: 0.1 },
	];

	function fire(shell: ShellKind, shapePoints?: { x: number; y: number }[]) {
		handle?.launch({
			apex: { x: 0.3 + Math.random() * 0.4, y: 0.3 },
			shell,
			shapePoints,
		});
	}
</script>

<div class="relative h-80 w-full overflow-hidden rounded-lg border bg-black">
	<FireworksHdr ambientShells={["heart", "star", "peony"]} onReady={(h) => (handle = h)} />
	<div class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3">
		<p class="text-sm text-white/60 select-none">Pattern shells</p>
		<div class="pointer-events-auto flex gap-2">
			{#each [["heart", "Heart"], ["star", "Star"]] as const as [kind, label] (kind)}
				<button
					type="button"
					onclick={() => fire(kind)}
					class="rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-medium text-white backdrop-blur transition hover:bg-white/20"
				>
					{label}
				</button>
			{/each}
			<button
				type="button"
				onclick={() => fire("shape", BOLT)}
				class="rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-medium text-white backdrop-blur transition hover:bg-white/20"
			>
				Custom
			</button>
		</div>
	</div>
</div>

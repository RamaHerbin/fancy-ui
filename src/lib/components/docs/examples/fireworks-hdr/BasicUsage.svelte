<script lang="ts">
	import { FireworksHdr, type FireworksHandle } from "$lib/fancy-ui/fireworks-hdr";

	let handle = $state<FireworksHandle | null>(null);

	function launch() {
		// Fire a shell toward a random point in the upper half of the frame.
		handle?.launch({ apex: { x: 0.3 + Math.random() * 0.4, y: 0.24 + Math.random() * 0.2 } });
	}
</script>

<div class="relative h-80 w-full overflow-hidden rounded-lg border bg-black">
	<FireworksHdr onReady={(h) => (handle = h)} />
	<div
		class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3"
	>
		<p class="text-sm text-white/60 select-none">Tap the sky, or send one up</p>
		<button
			type="button"
			onclick={launch}
			class="pointer-events-auto rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-medium text-white backdrop-blur transition hover:bg-white/20"
		>
			Launch a shell
		</button>
	</div>
</div>

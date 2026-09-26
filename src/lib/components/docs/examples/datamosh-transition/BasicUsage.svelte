<script lang="ts">
	import { DatamoshTransition } from "$lib/fancy-ui/datamosh-transition";

	const pages = [
		{ title: "Page one", body: "Press the button to go to the next page." },
		{ title: "Page two", body: "The page changed while the screen was covered." },
	];

	let transition: ReturnType<typeof DatamoshTransition>;
	let current = $state(0);
	let busy = $state(false);

	async function navigate() {
		if (busy) return;
		busy = true;
		await transition.cover();
		current = (current + 1) % pages.length;
		await transition.reveal();
		busy = false;
	}
</script>

<div
	class="relative flex h-80 w-full flex-col items-center justify-center gap-4 overflow-hidden rounded-2xl border border-white/10 bg-[#14101f] text-center text-white"
>
	<h3 class="text-3xl font-semibold tracking-tight">{pages[current].title}</h3>
	<p class="text-sm text-white/60">{pages[current].body}</p>
	<button
		class="rounded-full bg-white px-4 py-2 text-sm font-medium text-[#14101f] disabled:opacity-60"
		onclick={navigate}
		disabled={busy}
	>
		Next page
	</button>
	<DatamoshTransition bind:this={transition} contained />
</div>

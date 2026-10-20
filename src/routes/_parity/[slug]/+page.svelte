<script lang="ts">
	import DemoRenderer from "$lib/components/docs/DemoRenderer.svelte";
	import type { PageProps } from "./$types";

	let { data }: PageProps = $props();

	// Same random stream in all three stages, whatever the page drew so far
	// (capture.mjs defines the hook; outside a capture it is absent).
	(globalThis as { __parityReseed?: () => void }).__parityReseed?.();

	// The theme comes from the URL so a capture never depends on stored state.
	$effect(() => {
		document.documentElement.classList.toggle("dark", data.theme === "dark");
	});
</script>

<div class="bg-background grid min-h-screen place-items-center">
	<div
		data-parity-stage
		class="bg-background relative flex items-center justify-center overflow-hidden"
		style="width: 800px; height: 500px;"
	>
		<DemoRenderer slug={data.slug} />
	</div>
</div>

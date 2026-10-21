<!-- Parity variant for scripts/parity/states.mjs (toast carrying an action). -->
<script lang="ts">
	import { Button } from "$lib/fancy-ui/button";
	import { Toaster, toast } from "$lib/fancy-ui/toast";

	function show() {
		toast({
			title: "Message archived",
			description: "It left your inbox.",
			variant: "success",
			duration: Infinity,
			action: { label: "Undo", onClick: () => {} },
		});
	}
</script>

<Toaster />
<Button onclick={show}>Show toast</Button>

<style>
	/* the toaster is fixed to the page corner; the stage shot frames it, so it is pinned inside the stage box (not in the phone-width ?frame=fill page) */
	:global(html:not([data-parity-fill]) .ft-toaster-viewport) {
		top: 120px !important;
		left: 120px !important;
		right: auto !important;
		bottom: auto !important;
	}
</style>

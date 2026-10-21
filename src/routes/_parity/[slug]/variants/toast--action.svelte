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

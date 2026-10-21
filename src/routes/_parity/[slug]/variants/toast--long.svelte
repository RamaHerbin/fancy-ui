<!-- Parity variant for scripts/parity/states.mjs (toast with a long description). -->
<script lang="ts">
	import { Button } from "$lib/fancy-ui/button";
	import { Toaster, toast } from "$lib/fancy-ui/toast";

	function show() {
		toast({
			title: "The export of every board in the workspace is ready to download",
			description:
				"The archive holds 48 boards, 1,204 cards and every attachment. The download link stays valid for seven days, and anyone with the link can open it, so share it with care. A new export can be requested from the settings page at any time.",
			variant: "info",
			duration: Infinity,
			action: { label: "Download", onClick: () => {} },
		});
	}
</script>

<Toaster />
<Button onclick={show}>Show toast</Button>

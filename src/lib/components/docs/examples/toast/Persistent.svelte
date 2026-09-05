<script lang="ts">
	import { Button } from "$lib/fancy-ui/button";
	import { Toaster, toast } from "$lib/fancy-ui/toast";

	function show() {
		// duration: Infinity — sticky. Only the toast's own close button (or
		// dismissToast(id)) removes it.
		// `info` toasts stay silent by design — only outcomes chime.
		toast({
			title: "Reviewing your changes",
			description: "This stays until you dismiss it yourself.",
			variant: "info",
			duration: Infinity,
		});
	}
</script>

<Toaster sound />
<Button variant="outline" onclick={show}>Show a persistent toast</Button>

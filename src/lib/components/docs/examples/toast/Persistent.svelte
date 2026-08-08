<script lang="ts">
	import { Button } from "$lib/fancy-ui/button";
	import { Toaster, toast } from "$lib/fancy-ui/toast";

	function show() {
		// duration: Infinity — sticky. Only the toast's own close button (or
		// dismissToast(id)) removes it.
		toast({
			title: "Reviewing your changes",
			description: "This stays until you dismiss it yourself.",
			variant: "info",
			duration: Infinity,
		});
	}
</script>

<Toaster />
<Button variant="outline" onclick={show}>Show a persistent toast</Button>

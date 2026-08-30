<script lang="ts">
	import { Button } from "$lib/fancy-ui/button";
	import { Toaster, toast } from "$lib/fancy-ui/toast";

	function send() {
		toast({
			title: "Failed to send",
			description: "Check your connection.",
			variant: "error",
			action: {
				label: "Retry",
				onClick: send,
			},
		});
	}
</script>

<Toaster sound />
<Button variant="outline" onclick={send}>Simulate a failed request</Button>

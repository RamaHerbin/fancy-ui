<script lang="ts">
	import { Button } from "$lib/fancy-ui/button";
	import { Toaster, toast } from "$lib/fancy-ui/toast";

	function showSuccess() {
		toast({
			title: "Theme saved",
			description: "CSS copied to the clipboard.",
			variant: "success",
		});
	}

	function showError() {
		toast({ title: "Failed to send", description: "Check your connection.", variant: "error" });
	}

	function showInfo() {
		toast({ title: "New version available", variant: "info" });
	}

	function showLoading() {
		toast({ title: "Publishing…", variant: "loading" });
	}
</script>

<Toaster sound />
<div class="flex flex-wrap gap-2">
	<Button variant="outline" onclick={showSuccess}>Success</Button>
	<Button variant="outline" onclick={showError}>Error</Button>
	<Button variant="outline" onclick={showInfo}>Info</Button>
	<Button variant="outline" onclick={showLoading}>Loading</Button>
</div>

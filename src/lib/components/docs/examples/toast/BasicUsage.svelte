<script lang="ts">
	import { Button } from "$lib/fancy-ui/button";
	import { Toaster, toast } from "$lib/fancy-ui/toast";

	function show() {
		toast({
			title: "Theme saved",
			description: "CSS copied to the clipboard.",
			variant: "success",
		});
	}
</script>

<Toaster />
<Button onclick={show}>Show toast</Button>

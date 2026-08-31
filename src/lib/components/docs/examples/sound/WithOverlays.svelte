<script lang="ts">
	import { Dialog } from "$lib/fancy-ui/dialog";
	import { Button } from "$lib/fancy-ui/button";
	import { Toaster, toast } from "$lib/fancy-ui/toast";
	import { SoundToggle } from "$lib/fancy-ui/sound/index.js";

	function showSuccess() {
		toast({ title: "Draft published", description: "Live in every region.", variant: "success" });
	}

	function showError() {
		toast({
			title: "Publish failed",
			description: "The build did not come back.",
			variant: "error",
		});
	}

	function showInfo() {
		// `info` and `loading` toasts stay silent by design — only outcomes chime.
		toast({ title: "New version available", variant: "info" });
	}
</script>

{#snippet trigger()}
	<Button>Open dialog</Button>
{/snippet}

<!-- `sound` lives on <Toaster>, never on toast()'s own options: the page that
     mounts the region decides once whether outcomes chime. -->
<Toaster sound />

<div class="flex flex-col gap-4">
	<div class="flex flex-wrap items-center gap-3">
		<SoundToggle size="sm" showLabel label="Sound for the overlays" />
		<span class="text-muted-foreground text-sm">
			Turn sound on, then open the dialog or fire a toast.
		</span>
	</div>

	<div class="flex flex-wrap items-center gap-3">
		<Dialog
			sound
			{trigger}
			title="Rename the workspace"
			description="Opening plays one cue; closing plays its counterpart."
		>
			<p class="text-muted-foreground text-sm">
				However this dialog is dismissed — the close button, Escape, or the backdrop — it plays the
				same close cue. A parent writing <code>open</code> through <code>bind:open</code> stays silent
				by design; see the sound section of the dialog README.
			</p>
		</Dialog>
		<Button variant="outline" onclick={showSuccess}>Success toast</Button>
		<Button variant="outline" onclick={showError}>Error toast</Button>
		<Button variant="outline" onclick={showInfo}>Info toast</Button>
	</div>
</div>

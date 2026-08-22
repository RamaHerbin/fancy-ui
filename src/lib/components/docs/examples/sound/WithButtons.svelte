<script lang="ts">
	import { Button } from "$lib/fancy-ui/button";
	import { CopyButton } from "$lib/fancy-ui/copy-button";
	import { SoundToggle } from "$lib/fancy-ui/sound/index.js";
</script>

<div class="flex flex-col gap-4">
	<div class="flex flex-wrap items-center gap-3">
		<SoundToggle size="sm" showLabel label="Sound for the button examples" />
		<span class="text-muted-foreground text-sm">Turn sound on, then try the buttons below.</span>
	</div>

	<div class="flex flex-wrap items-center gap-3">
		<Button sound>Save changes</Button>
		<Button sound variant="outline">Continue</Button>
		<Button sound variant="destructive">Delete</Button>
		<CopyButton sound value="npm install fancy-ui-svelte" />
	</div>
</div>

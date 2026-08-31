<script lang="ts">
	import { Sheet } from "$lib/fancy-ui/sheet";
	import { Button } from "$lib/fancy-ui/button";
	import { Switch } from "$lib/fancy-ui/switch";

	let open = $state(false);
	let notifications = $state(true);
	let compactMode = $state(false);
</script>

<Button onclick={() => (open = true)}>Open settings</Button>

<Sheet sound bind:open title="Settings" description="Update your workspace preferences.">
	<div class="flex items-center justify-between">
		<span class="text-muted-foreground text-[13px]">Notifications</span>
		<Switch sound bind:checked={notifications} label="Notifications" />
	</div>
	<div class="flex items-center justify-between">
		<span class="text-muted-foreground text-[13px]">Compact mode</span>
		<Switch sound bind:checked={compactMode} label="Compact mode" />
	</div>
</Sheet>

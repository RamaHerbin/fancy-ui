<script lang="ts">
	import { Switch } from "$lib/fancy-ui/switch";

	let notifications = $state(false);
</script>

<Switch bind:checked={notifications} label="Notifications" />

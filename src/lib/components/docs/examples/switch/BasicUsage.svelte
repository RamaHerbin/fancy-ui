<script lang="ts">
	import { Switch } from "$lib/fancy-ui/switch";

	let notifications = $state(false);
</script>

<Switch sound bind:checked={notifications} label="Notifications" />

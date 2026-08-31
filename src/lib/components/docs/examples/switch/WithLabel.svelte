<script lang="ts">
	import { Switch } from "$lib/fancy-ui/switch";

	let notifications = $state(true);
</script>

<Switch sound bind:checked={notifications}>Notifications</Switch>

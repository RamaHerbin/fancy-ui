<script lang="ts">
	import { RainbowButton } from "fancy-ui-svelte";

	let clicks = $state(0);
</script>

<RainbowButton onclick={() => clicks++}>Clicked {clicks} times</RainbowButton>

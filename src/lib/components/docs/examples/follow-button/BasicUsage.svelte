<script lang="ts">
	import { FollowButton } from "$lib/fancy-ui/follow-button";

	let following = $state(false);
</script>

<FollowButton sound bind:following label="Follow Rama" />

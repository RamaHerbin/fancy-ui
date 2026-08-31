<script lang="ts">
	import { IconButton } from "$lib/fancy-ui/icon-button";

	let liked = $state(false);
</script>

<IconButton
	sound
	label={liked ? "Unlike" : "Like"}
	variant={liked ? "accent" : "outline"}
	shape="circle"
	onclick={() => (liked = !liked)}
>
	<svg
		class="size-4"
		viewBox="0 0 24 24"
		fill={liked ? "currentColor" : "none"}
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		aria-hidden="true"
	>
		<path d="M12 20s-7-4.35-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 5c-2.5 4.65-9.5 9-9.5 9Z" />
	</svg>
</IconButton>

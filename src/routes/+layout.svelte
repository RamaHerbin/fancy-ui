<script lang="ts">
	import "./layout.css";
	import AnimatedFavicon from "$lib/components/AnimatedFavicon.svelte";

	let { children } = $props();
</script>

<AnimatedFavicon />
{@render children()}

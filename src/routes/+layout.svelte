<script lang="ts">
	import "./layout.css";
	import AnimatedFavicon from "$lib/components/AnimatedFavicon.svelte";
	import { injectAnalytics } from "@vercel/analytics/sveltekit";

	injectAnalytics();

	let { children } = $props();
</script>

<AnimatedFavicon />
{@render children()}

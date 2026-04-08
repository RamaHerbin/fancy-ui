<script lang="ts">
	import "./layout.css";
	import AnimatedFavicon from "$lib/components/AnimatedFavicon.svelte";
	import { browser, dev } from "$app/environment";
	import { injectAnalytics } from "@vercel/analytics/sveltekit";

	if (browser && !dev) {
		injectAnalytics();
	}

	let { children } = $props();
</script>

<AnimatedFavicon />
{@render children()}

<script lang="ts">
	import "./layout.css";
	import AnimatedFavicon from "$lib/components/AnimatedFavicon.svelte";
	import EggRuntime from "$lib/components/eggs/EggRuntime.svelte";
	import { browser, dev } from "$app/environment";
	import { injectAnalytics } from "@vercel/analytics/sveltekit";
	import { afterNavigate } from "$app/navigation";
	import { applyForRoute } from "$lib/stores";

	// The analytics script is served by the serverless platform itself; a
	// self-hosted build (VITE_SELF_HOST=1) has no such endpoint to load it from.
	if (browser && !dev && import.meta.env.VITE_SELF_HOST !== "1") {
		injectAnalytics();
	}

	// Apply the locale (lang/dir + ?lang) on docs routes and reset it elsewhere,
	// so the i18n/RTL feature stays scoped to the localized docs surface.
	afterNavigate((nav) => {
		applyForRoute(nav.to?.url.pathname ?? location.pathname);
	});

	let { children } = $props();
</script>

<AnimatedFavicon />
{@render children()}
<EggRuntime />

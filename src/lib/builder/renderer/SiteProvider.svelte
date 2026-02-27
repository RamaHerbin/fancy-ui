<script lang="ts" module>
	import { getContext, setContext } from "svelte";
	import type { SiteConfig } from "../types/site.js";

	const SITE_CONFIG_KEY = "builder:site-config";

	export function getSiteConfig(): SiteConfig | null {
		return getContext<SiteConfig | null>(SITE_CONFIG_KEY);
	}

	export function setSiteConfig(config: SiteConfig | null): void {
		setContext(SITE_CONFIG_KEY, config);
	}
</script>

<script lang="ts">
	import type { Snippet } from "svelte";
	import type { SiteConfig as SC } from "../types/site.js";

	interface Props {
		config: SC | null;
		children?: Snippet;
	}

	let { config, children }: Props = $props();

	setSiteConfig(config);
</script>

{#if children}
	{@render children()}
{/if}

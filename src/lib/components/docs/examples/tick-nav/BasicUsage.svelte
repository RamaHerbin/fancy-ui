<script lang="ts">
	import { TickNav, type TickNavItem } from "$lib/fancy-ui/tick-nav";

	const items: TickNavItem[] = [
		{ id: "overview", label: "00 Overview" },
		{ id: "install", label: "01 Installation" },
		{ id: "theming", label: "02 Theming" },
		{ id: "motion", label: "03 Motion" },
		{ id: "sound", label: "04 Sound", badge: "New" },
		{ id: "a11y", label: "05 Accessibility" },
		{ id: "ssr", label: "06 Server rendering" },
		{ id: "registry", label: "07 Copy into your project" },
		{ id: "llms", label: "08 LLM docs" },
		{ id: "changelog", label: "09 Changelog" },
	];

	let value = $state("overview");
</script>

<div class="flex w-full justify-center py-6 text-sm">
	<TickNav {items} bind:value ariaLabel="Guide" sound />
</div>

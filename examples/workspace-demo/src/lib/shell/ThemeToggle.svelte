<script lang="ts">
	import { onMount } from "svelte";
	import Moon from "@lucide/svelte/icons/moon";
	import Sun from "@lucide/svelte/icons/sun";
	import { IconButton } from "fancy-ui-svelte";
	import { strings } from "$lib/strings.js";

	const STORAGE_KEY = "workspace-demo:theme";

	// The class itself is set before the first paint by the inline script in
	// app.html; this only mirrors it once the app is interactive.
	let dark = $state(false);

	onMount(() => {
		dark = document.documentElement.classList.contains("dark");
	});

	function toggle() {
		dark = !dark;
		const root = document.documentElement;
		root.classList.toggle("dark", dark);
		root.classList.toggle("light", !dark);
		try {
			localStorage.setItem(STORAGE_KEY, dark ? "dark" : "light");
		} catch {
			// Private mode or blocked storage: the choice lasts for this page only.
		}
	}
</script>

<IconButton
	variant="ghost"
	label={dark ? strings.theme.toLight : strings.theme.toDark}
	onclick={toggle}
>
	{#if dark}
		<Sun class="size-4" aria-hidden="true" />
	{:else}
		<Moon class="size-4" aria-hidden="true" />
	{/if}
</IconButton>

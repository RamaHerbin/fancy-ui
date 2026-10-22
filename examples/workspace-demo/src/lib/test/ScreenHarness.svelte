<script lang="ts">
	// Renders one screen next to a Toaster, the way the root layout does, so
	// tests can read and press the toasts a screen raises. `shown` unmounts the
	// screen alone, as navigating away does while the layout's Toaster stays.
	// Used only by the screen tests.
	import type { Component } from "svelte";
	import { Toaster } from "fancy-ui-svelte";
	import type { WorkspaceApi } from "$lib/data/api.js";

	let {
		screen: Screen,
		api,
		shown = true,
	}: { screen: Component<{ api?: WorkspaceApi }>; api: WorkspaceApi; shown?: boolean } = $props();
</script>

{#if shown}
	<Screen {api} />
{/if}
<Toaster position="bottom-center" />

<script lang="ts">
	// Renders one screen next to a Toaster, the way the root layout does, so
	// tests can read and press the toasts a screen raises.
	// Used only by the screen tests.
	import type { Component } from "svelte";
	import { Toaster } from "fancy-ui-svelte";
	import type { WorkspaceApi } from "$lib/data/api.js";

	let { screen: Screen, api }: { screen: Component<{ api?: WorkspaceApi }>; api: WorkspaceApi } =
		$props();
</script>

<Screen {api} />
<Toaster position="bottom-center" />

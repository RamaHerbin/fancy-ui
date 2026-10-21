<script lang="ts">
	import { onMount } from "svelte";
	import EggOverlayHost from "./EggOverlayHost.svelte";
	import { installFancyConsole } from "./console-api.js";
	import { eggRuntime } from "./runtime.svelte.js";

	// The build-time define rather than $lib/site.ts: that module pulls the whole
	// component registry, which the root layout chunk should not carry.
	const version = __PKG_VERSION__;

	onMount(() => {
		const stop = eggRuntime.start();
		installFancyConsole(eggRuntime, { version });
		return stop;
	});
</script>

<EggOverlayHost />

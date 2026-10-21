<script lang="ts">
	import { onMount } from "svelte";
	import { DatamoshTransition } from "$lib/fancy-ui/datamosh-transition/index.js";
	import { setSkin } from "$lib/stores";
	import { EGG_OVERLAY_Z, type EggContext } from "../types.js";
	import { runShutdown } from "./shutdown.js";

	let { ctx }: { ctx: EggContext } = $props();

	let dm: ReturnType<typeof DatamoshTransition> | undefined = $state();

	onMount(() => {
		// Child mounts first, so the curtain instance exists here.
		let alive = true;
		if (dm) void runShutdown(dm, ctx, setSkin, () => alive);
		return () => {
			alive = false;
		};
	});
</script>

<!-- Opaque to the pointer for the whole run: stray clicks must not land on the page. -->
<div class="pointer-events-auto fixed inset-0" data-retro-shutdown>
	<DatamoshTransition bind:this={dm} variant="curtain" zIndex={EGG_OVERLAY_Z + 1} />
</div>

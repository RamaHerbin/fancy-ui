<script lang="ts">
	import { FluidCursor } from "fancy-ui-svelte";
	import { trackLifecycle } from "./lifecycle";

	let { id }: { id: string } = $props();

	trackLifecycle(`fluid:${id}`);
</script>

<div class="relative h-48 overflow-hidden rounded-xl border" data-testid={id}>
	<FluidCursor contained />
</div>

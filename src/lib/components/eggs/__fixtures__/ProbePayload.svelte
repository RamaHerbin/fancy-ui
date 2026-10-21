<script lang="ts">
	import type { EggContext } from "../types.js";

	let { ctx }: { ctx: EggContext } = $props();
</script>

<p data-probe>{ctx.id}:{ctx.reducedMotion ? "still" : "moving"}</p>

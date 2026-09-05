<script lang="ts">
	import { PulseBeam } from "$lib/fancy-ui/pulse-beam";
</script>

<!--
  `outside` keeps the 1px ring and paints a blurred halo *behind* the content,
  so the child must be opaque — otherwise the halo shows through it.
-->
<div class="py-8">
	<PulseBeam variant="outside" radius={16} class="mx-auto w-full max-w-md">
		<div class="bg-card rounded-2xl border p-5">
			<p class="text-sm font-medium">Deploying preview</p>
			<p class="text-muted-foreground mt-1 text-sm">
				Building 3 of 5 routes — the glow bleeds past the card edge.
			</p>
		</div>
	</PulseBeam>
</div>

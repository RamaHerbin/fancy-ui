<script lang="ts">
	import { PulseBeam } from "$lib/fancy-ui/pulse-beam";
</script>

<!-- Small boxes scale the outside halo down automatically. -->
<div class="py-6">
	<PulseBeam variant="outside" radius={999} class="mx-auto w-fit">
		<button class="bg-card rounded-full border px-5 py-2 text-sm font-medium">Subscribe</button>
	</PulseBeam>
</div>

<script lang="ts">
	import { Ripple } from "$lib/fancy-ui/ripple";
</script>

<div class="bg-card relative h-96 overflow-hidden rounded-lg border">
	<Ripple
		circleClass="border-primary/30 bg-primary/5"
		numberOfCircles={5}
		baseCircleSize={150}
		spaceBetweenCircle={90}
	/>
</div>

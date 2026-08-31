<script lang="ts">
	import { RippleButton } from "$lib/fancy-ui/ripple-button";
</script>

<div class="flex flex-wrap justify-center gap-4">
	<RippleButton sound duration={300}>Fast (300ms)</RippleButton>
	<RippleButton sound duration={600}>Default (600ms)</RippleButton>
	<RippleButton sound duration={1000}>Slow (1000ms)</RippleButton>
</div>

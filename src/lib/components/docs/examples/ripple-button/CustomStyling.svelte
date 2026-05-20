<script lang="ts">
	import { RippleButton } from "$lib/fancy-ui/ripple-button";
</script>

<div class="flex flex-wrap justify-center gap-4">
	<RippleButton class="bg-primary text-primary-foreground border-primary" rippleColor="#ffffff">
		Primary
	</RippleButton>
	<RippleButton class="bg-destructive border-destructive text-white" rippleColor="#ffffff">
		Destructive
	</RippleButton>
	<RippleButton class="rounded-full px-6" rippleColor="#9333ea">Rounded</RippleButton>
</div>

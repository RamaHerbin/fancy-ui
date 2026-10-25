<script lang="ts">
	import { MathBubble } from "$lib/fancy-ui/math-bubble";

	const formulas = [
		"E=mc^2",
		"\\int_0^1 x\\,dx=\\frac{1}{2}",
		"\\sqrt{2}\\approx 1.414",
		"\\lim_{n\\to\\infty}(1+\\frac{1}{n})^n=e",
	];
</script>

<div class="text-foreground flex min-h-64 w-full items-center justify-center py-10">
	<MathBubble formula={formulas} loop hold={1500} speed={6} />
</div>

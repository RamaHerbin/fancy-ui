<script lang="ts">
	import { MathBubble } from "$lib/fancy-ui/math-bubble";
</script>

<div class="text-foreground flex w-full flex-wrap items-center justify-center gap-10 py-10">
	<MathBubble
		formula={"\\frac{d}{dx}x^2=2x"}
		bubble="thought"
		tail="left"
		tailOffset={0.6}
		seed={3}
	/>
	<MathBubble
		formula={"\\sum_{n=1}^{\\infty}\\frac{1}{n^2}=\\frac{\\pi^2}{6}"}
		bubble="shout"
		tail="top"
		seed={7}
		size={28}
	/>
	<MathBubble
		formula={"a^2+b^2=c^2"}
		bubble="speech"
		tail="right"
		tailOffset={0.7}
		seed={11}
		ink="var(--primary)"
	/>
</div>

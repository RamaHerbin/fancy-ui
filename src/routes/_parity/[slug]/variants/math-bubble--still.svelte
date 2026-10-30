<!-- Dev-only still of MathBubble for visual QA: ?variant=still&t=<ms> draws one frame at that time, no animation loop (works in a hidden tab, where rAF is frozen). -->
<script lang="ts">
	import { page } from "$app/state";
	import { MathBubble } from "$lib/fancy-ui/math-bubble";

	const raw = $derived(page.url.searchParams.get("t"));
	const t = $derived(raw !== null && Number.isFinite(Number(raw)) ? Number(raw) : undefined);
</script>

<div class="text-foreground flex flex-wrap items-center justify-center gap-8 p-6">
	<MathBubble formula={"e^{i\\pi}+1=0"} {t} />
	<MathBubble formula={"\\int_0^1 x\\,dx=\\frac{1}{2}"} bubble="thought" tail="left" seed={3} {t} />
	<MathBubble formula={"\\sqrt{a^2+b^2}=c"} bubble="shout" tail="top" seed={7} {t} />
	<MathBubble
		formula={"\\sum_{n=1}^{\\infty}\\frac{1}{n^2}=\\frac{\\pi^2}{6}"}
		tail="right"
		seed={11}
		size={26}
		{t}
	/>
</div>

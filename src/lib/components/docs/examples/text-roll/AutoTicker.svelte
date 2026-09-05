<script lang="ts">
	import { TextRoll } from "$lib/fancy-ui/text-roll";

	let count = $state(1204);

	// A counter that ticks forever is the shape WCAG 2.2.2 (Pause, Stop, Hide)
	// is about, so the demo holds still under `prefers-reduced-motion: reduce`
	// — there is no roll left to demonstrate there anyway.
	$effect(() => {
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
		const id = setInterval(() => {
			count += Math.floor(Math.random() * 3) + 1;
		}, 1000);
		return () => clearInterval(id);
	});
</script>

<div class="flex w-full flex-col items-center gap-2 p-6">
	<p class="text-muted-foreground text-sm">Downloads today</p>
	<!-- No `live` here on purpose — a live region firing every second on a
	     fast-moving counter is worse than silence (see the component's own
	     Accessibility notes); `direction="auto"` (the default) already resolves
	     to "up" for a value that only ever increases. -->
	<TextRoll value={String(count)} tabular class="text-foreground text-5xl font-bold" />
</div>

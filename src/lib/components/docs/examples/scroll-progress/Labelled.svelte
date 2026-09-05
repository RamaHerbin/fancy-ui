<script lang="ts">
	import { ScrollProgress } from "$lib/fancy-ui/scroll-progress";

	let box = $state<HTMLElement | null>(null);
	let percent = $state(0);

	function onScroll() {
		if (!box) return;
		const max = box.scrollHeight - box.clientHeight;
		percent = max > 0 ? Math.round((box.scrollTop / max) * 100) : 0;
	}
</script>

<div class="mx-auto flex w-full max-w-sm flex-col gap-2 p-6">
	<div class="flex items-center justify-between">
		<span class="text-muted-foreground text-xs font-medium">Reading progress</span>
		<span class="text-muted-foreground text-xs tabular-nums">{percent}%</span>
	</div>
	<ScrollProgress
		target={box}
		position="inline"
		label="Reading progress"
		class="text-primary rounded-full"
	/>
	<div
		bind:this={box}
		onscroll={onScroll}
		class="border-border bg-card h-56 overflow-y-auto rounded-lg border p-4 text-sm leading-relaxed"
	>
		<p class="text-muted-foreground mb-3">
			A progress indicator only earns its place when it tells a reader something scroll position
			alone doesn't: how much is left, not just how far they've come.
		</p>
		<p class="text-muted-foreground mb-3">
			For a short note that fits one screen, it's noise. For a long guide, a changelog, or a policy
			document, it turns "how much further?" from a guess into a glance.
		</p>
		<p class="text-muted-foreground mb-3">
			The same number that fills the bar is available to assistive technology too — set a
			<code class="text-xs">label</code> and the bar announces itself as a real progress control, not
			just decoration.
		</p>
		<p class="text-muted-foreground">Keep scrolling to watch both readouts move together.</p>
	</div>
	<p class="text-muted-foreground text-xs">
		<code class="text-xs">label</code> turns the bar into
		<code class="text-xs">role="progressbar"</code>, announcing this exact percentage to screen
		readers as you scroll — the number above is the same value, just for sighted eyes.
	</p>
</div>

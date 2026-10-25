<script lang="ts">
	import { MathBubble } from "$lib/fancy-ui/math-bubble";

	let bubble = $state<ReturnType<typeof MathBubble>>();
</script>

<div class="text-foreground flex w-full flex-col items-center gap-6 py-10">
	<MathBubble
		bind:this={bubble}
		formula={"e^{i\\pi}+1=0"}
		ariaLabel="e to the i pi, plus one, equals zero"
	/>
	<button
		type="button"
		class="border-border text-muted-foreground hover:text-foreground rounded-md border px-3 py-1 text-sm transition-colors"
		onclick={() => bubble?.play()}
	>
		Replay
	</button>
</div>

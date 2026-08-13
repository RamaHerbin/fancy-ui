<script lang="ts">
	import { HoverCard } from "$lib/fancy-ui/hover-card";
</script>

<HoverCard>
	{#snippet trigger(describedBy)}
		<button
			type="button"
			aria-describedby={describedBy}
			class="text-[13px] font-medium text-violet-300 hover:underline"
		>
			@alexrivera
		</button>
	{/snippet}
	{#snippet children()}
		<div class="flex items-center gap-2.5">
			<span class="h-9 w-9 flex-none rounded-full bg-gradient-to-br from-violet-500 to-sky-400"
			></span>
			<div class="flex flex-col">
				<span class="text-[13px] font-semibold">Alex Rivera</span>
				<span class="text-muted-foreground text-[11px]">@alexrivera</span>
			</div>
		</div>
		<p class="text-muted-foreground text-[12px] leading-relaxed">
			Frontend engineer. Building accessible interfaces, one component at a time.
		</p>
	{/snippet}
</HoverCard>

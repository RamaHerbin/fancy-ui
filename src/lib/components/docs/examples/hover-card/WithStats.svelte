<script lang="ts">
	import { HoverCard } from "$lib/fancy-ui/hover-card";
</script>

<HoverCard side="top">
	{#snippet trigger(describedBy)}
		<button
			type="button"
			aria-describedby={describedBy}
			class="text-[13px] font-medium text-violet-300 hover:underline"
		>
			@juno-writes
		</button>
	{/snippet}
	{#snippet children()}
		<div class="flex items-center gap-2.5">
			<span class="h-9 w-9 flex-none rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500"
			></span>
			<div class="flex flex-col">
				<span class="text-[13px] font-semibold">Juno Park</span>
				<span class="text-muted-foreground text-[11px]">@juno-writes</span>
			</div>
		</div>
		<p class="text-muted-foreground text-[12px] leading-relaxed">
			Technical writer. Documenting the parts of the codebase everyone else avoids.
		</p>
		<div class="text-muted-foreground flex gap-3.5 text-[11px]">
			<span><strong class="text-foreground">842</strong> followers</span>
			<span><strong class="text-foreground">37</strong> articles</span>
		</div>
	{/snippet}
</HoverCard>

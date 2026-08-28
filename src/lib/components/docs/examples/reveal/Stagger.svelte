<script lang="ts">
	import { Reveal } from "$lib/fancy-ui/reveal";

	const tags = ["Design", "Motion", "Layout", "Type", "Color", "Sound", "Depth"];
</script>

<div class="w-full p-6">
	<!-- stagger widened from the 50ms ladder step so the cascade reads at preview size -->
	<Reveal trigger="mount" stagger={60} from="center" class="flex flex-wrap justify-center gap-2">
		{#each tags as tag (tag)}
			<span
				class="bg-muted text-muted-foreground border-border rounded-full border px-3 py-1 text-sm"
			>
				{tag}
			</span>
		{/each}
	</Reveal>
</div>

<script lang="ts">
	import { Pressable } from "$lib/fancy-ui/pressable";

	const REPLIES = ["Sounds good", "Not today", "Let's talk"];
</script>

<div class="flex w-full items-center justify-center p-6">
	<div class="border-border bg-card w-full max-w-[280px] rounded-[1.75rem] border p-4 shadow-sm">
		<p class="text-muted-foreground mb-3 text-xs">Quick replies</p>
		<div class="flex flex-wrap gap-2">
			{#each REPLIES as reply}
				<Pressable>
					<button
						type="button"
						class="border-border bg-muted text-foreground rounded-full border px-3.5 py-1.5 text-sm"
					>
						{reply}
					</button>
				</Pressable>
			{/each}
		</div>
		<p class="text-muted-foreground mt-4 text-xs">
			Tap a chip (or focus one and press Space/Enter) — it gives under the press, then settles back
			the instant you let go. With reduced motion it dims instead of shrinking.
		</p>
	</div>
</div>

<script lang="ts">
	import { Pressable } from "$lib/fancy-ui/pressable";
</script>

<div class="flex w-full flex-col items-center justify-center gap-4 p-6">
	<div class="flex flex-wrap items-center justify-center gap-3">
		<Pressable haptic="light">
			<button
				type="button"
				class="border-border bg-card text-foreground rounded-full border px-4 py-2 text-sm font-medium"
			>
				Like
			</button>
		</Pressable>
		<Pressable haptic="medium">
			<button
				type="button"
				class="bg-primary text-primary-foreground rounded-full px-4 py-2 text-sm font-medium"
			>
				Add to cart
			</button>
		</Pressable>
	</div>
	<p class="text-muted-foreground max-w-xs text-center text-xs">
		On a touch device each button also fires a short vibration on press — a lighter buzz for "Like",
		a stronger one for "Add to cart". <code class="text-xs">haptic</code> is touch-only and additive:
		on this desktop preview (and for mouse or pen everywhere) you'll only ever see the press-scale, exactly
		like BasicUsage.
	</p>
</div>

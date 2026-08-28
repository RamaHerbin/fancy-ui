<script lang="ts">
	// Nothing here runs on a timer: the pull is driven entirely by pointer
	// position, and under `prefers-reduced-motion: reduce` Magnetic attaches
	// no listeners at all — the button simply sits still.
	import { Magnetic } from "$lib/fancy-ui/magnetic";
	import { Button } from "$lib/fancy-ui/button";
</script>

<div class="flex min-h-[280px] flex-col items-center justify-center gap-4 p-10">
	<Magnetic>
		<Button variant="outline" size="lg">Get in touch</Button>
	</Magnetic>
	<p class="text-muted-foreground max-w-sm text-center text-xs">
		Move the cursor near the button — it leans toward you before you even touch it, then settles
		back once you leave. On a touchscreen nothing moves, and tabbing to it never starts a pull:
		attraction needs a pointer position, and a keyboard has none.
	</p>
</div>

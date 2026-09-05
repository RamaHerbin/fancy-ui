<script lang="ts">
	import { ScrollProgress } from "$lib/fancy-ui/scroll-progress";

	let box = $state<HTMLElement | null>(null);
</script>

<div class="mx-auto flex w-full max-w-sm flex-col gap-2 p-6">
	<ScrollProgress target={box} position="inline" class="text-primary rounded-full" />
	<div
		bind:this={box}
		class="border-border bg-card h-56 overflow-y-auto rounded-lg border p-4 text-sm leading-relaxed"
	>
		<p class="text-foreground text-xs font-semibold tracking-wide uppercase">0.9.0</p>
		<p class="text-muted-foreground mt-1 mb-4">
			Redesigned the sidebar navigation and shipped a set of layout primitives for scroll-driven
			pages.
		</p>
		<p class="text-foreground text-xs font-semibold tracking-wide uppercase">0.8.0</p>
		<p class="text-muted-foreground mt-1 mb-4">
			Added dark-mode tokens to every core component and fixed a focus-trap bug in the command menu.
		</p>
		<p class="text-foreground text-xs font-semibold tracking-wide uppercase">0.7.0</p>
		<p class="text-muted-foreground mt-1 mb-4">
			Introduced the shared motion foundation: easing tokens, a reduced-motion rune, and staggered
			reveal presets.
		</p>
		<p class="text-foreground text-xs font-semibold tracking-wide uppercase">0.6.0</p>
		<p class="text-muted-foreground mt-1">
			Rebuilt the docs search and added keyboard shortcuts for jumping between components.
		</p>
	</div>
	<p class="text-muted-foreground text-xs">
		Scroll the panel above — the bar tracks that element directly (<code class="text-xs"
			>target</code
		>), not the whole page.
	</p>
</div>

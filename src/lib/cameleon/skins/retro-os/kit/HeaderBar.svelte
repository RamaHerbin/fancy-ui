<script lang="ts" module>
	import type { Snippet } from "svelte";

	export interface HeaderBarProps {
		/** the header's main title */
		title: string;
		/** the header's subtitle */
		subtitle?: string;
		/** the 44px ink tile's glyph — a wordmark, not prose */
		tile?: string;
		class?: string;
		/** rendered on the right, where a skin switcher or nav would sit */
		children?: Snippet;
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";

	let { title, subtitle, tile = "✦", class: className, children }: HeaderBarProps = $props();
</script>

<!--
	Header bar shell: ink tile · title + subtitle · right-side slot.

	This is the SHELL only — the reference portfolio implementation's header
	also hosted a skin switcher in the right-hand slot; that piece is
	app-specific navigation, not kit vocabulary, so it is a `children` snippet
	here instead. The two titles absorb the narrow end via clamp() rather than
	the shell itself shrinking, since the tile and border never scale.
-->
<header
	class={cn(
		"r-border r-shadow-4 flex items-center gap-4 bg-[var(--r-paper)] px-5 py-[14px]",
		className
	)}
>
	<span
		class="r-pixel inline-flex h-11 w-11 flex-none items-center justify-center bg-[var(--r-ink)] text-[14px] text-[var(--r-paper)]"
	>
		{tile}
	</span>

	<div class="flex min-w-0 flex-1 flex-col gap-[3px]">
		<span
			class="text-[clamp(15px,3.6vw,22px)] leading-tight font-black tracking-[-0.3px] text-[var(--r-ink)]"
		>
			{title}
		</span>
		{#if subtitle}
			<span
				class="r-mono text-[clamp(9px,2.1vw,11px)] font-semibold tracking-[1px] text-[var(--r-muted)]"
			>
				{subtitle}
			</span>
		{/if}
	</div>

	{#if children}
		{@render children()}
	{/if}
</header>

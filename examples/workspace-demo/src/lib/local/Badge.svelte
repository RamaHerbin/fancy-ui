<script lang="ts" module>
	export type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info";
</script>

<script lang="ts">
	import type { Snippet } from "svelte";

	// A short status label. The tone is colour plus a visible word from the
	// caller, never colour alone.
	let {
		tone = "neutral",
		children,
		class: className = "",
	}: { tone?: BadgeTone; children?: Snippet; class?: string } = $props();

	const tones: Record<BadgeTone, string> = {
		neutral: "border-border bg-muted text-muted-foreground",
		success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
		warning: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
		danger: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
		info: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
	};
</script>

<span
	class="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap {tones[
		tone
	]} {className}"
	data-tone={tone}
>
	{@render children?.()}
</span>

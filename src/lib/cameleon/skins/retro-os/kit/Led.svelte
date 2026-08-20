<script lang="ts" module>
	export interface LedProps {
		/** Lamp color — green reads "online", rust reads "offline". */
		color?: string;
		/** Additional CSS classes. */
		class?: string;
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";

	let { color = "var(--r-green)", class: className }: LedProps = $props();
</script>

<!--
	The status lamp next to "STATUS: ONLINE". Purely decorative: the state it
	reports is already in the adjacent text, so announcing a second, wordless
	copy of it would only add noise.

	The blink is `.r-blink` (kit.css) rather than an inline `animation:` so the
	prefers-reduced-motion rule can switch it off — an inline animation could
	only be cancelled with !important.
-->
<span
	aria-hidden="true"
	class={cn("r-border r-blink inline-block h-[12px] w-[12px] flex-none", className)}
	style="background: {color};"
></span>

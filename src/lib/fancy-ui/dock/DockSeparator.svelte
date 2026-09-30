<script lang="ts">
	import { getContext } from "svelte";
	import { cn } from "$lib/utils";
	import { DOCK_CONTEXT_KEY, type DockContext } from "./types";

	interface Props {
		class?: string;
	}

	let { class: className = "" }: Props = $props();

	const context = getContext<DockContext>(DOCK_CONTEXT_KEY);
</script>

<!-- A hairline that fades out at both ends, so it reads as a seam in the
     glass rather than a bar laid on top of it. -->
<div
	role="separator"
	aria-orientation={context.orientation === "vertical" ? "horizontal" : "vertical"}
	class={cn(
		"relative z-[1] block shrink-0 self-center",
		context.orientation === "vertical"
			? "h-px w-4/5 bg-gradient-to-r"
			: "h-4/5 w-px bg-gradient-to-b",
		"from-transparent via-black/15 to-transparent dark:via-white/15",
		className
	)}
></div>

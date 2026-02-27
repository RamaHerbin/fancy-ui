<script lang="ts">
	import { cn } from "$lib/utils";

	interface Props {
		size?: string;
	}

	let { size = "h-8" }: Props = $props();
</script>

<div class={cn(size)} aria-hidden="true"></div>

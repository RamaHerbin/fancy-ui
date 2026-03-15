<script lang="ts">
	let { onclick }: { onclick: () => void } = $props();
</script>

<button
	{onclick}
	class="text-muted-foreground hover:text-foreground absolute top-3 right-3 flex items-center gap-1 rounded border px-2 py-1 text-xs transition-colors"
	aria-label="Replay animation"
>
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width="12"
		height="12"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		aria-hidden="true"
		focusable="false"
	>
		<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
		<path d="M3 3v5h5" />
	</svg>
	Replay
</button>

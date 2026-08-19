<script lang="ts">
	import { PixelLoader } from "$lib/fancy-ui/pixel-loader";
</script>

<div
	class="flex w-full flex-col items-center justify-center gap-10 rounded-lg border bg-zinc-950 p-10"
>
	<div class="flex items-center gap-3 text-zinc-400">
		<PixelLoader />
		<span class="text-sm">Thinking…</span>
	</div>

	<PixelLoader cols={8} rows={8} cellSize={8} gap={3} color="#22d3ee" speed={2.2} label="Working" />
</div>

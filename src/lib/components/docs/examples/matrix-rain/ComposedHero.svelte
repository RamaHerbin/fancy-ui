<script lang="ts">
	import { MatrixRain } from "$lib/fancy-ui/matrix-rain";
	import { TerminalText } from "$lib/fancy-ui/terminal-text";
</script>

<div class="relative h-64 w-full overflow-hidden rounded-lg">
	<MatrixRain class="absolute inset-0 h-full w-full" />
	<div class="absolute inset-0 flex items-center justify-center">
		<div class="rounded-md bg-black/70 p-6 text-green-400 backdrop-blur-sm">
			<TerminalText
				lines={[
					"> initializing neural interface...",
					"> connecting to mainframe...",
					"> access granted. welcome, operator.",
					"> awaiting input_",
				]}
				speed={45}
			/>
		</div>
	</div>
</div>

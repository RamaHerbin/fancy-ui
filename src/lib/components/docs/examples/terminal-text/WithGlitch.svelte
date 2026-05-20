<script lang="ts">
	import { TerminalText } from "$lib/fancy-ui/terminal-text";
</script>

<div class="rounded-lg border bg-black p-5 text-green-400">
	<TerminalText
		lines={[
			"> scanning network topology...",
			"> found 1,337 vulnerable endpoints",
			"> deploying countermeasures...",
			"> done. the matrix has you.",
		]}
		speed={50}
		glitch={true}
	/>
</div>

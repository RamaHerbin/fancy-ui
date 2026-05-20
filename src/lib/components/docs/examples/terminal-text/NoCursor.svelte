<script lang="ts">
	import { TerminalText } from "$lib/fancy-ui/terminal-text";
</script>

<div class="rounded-lg border bg-black p-5 text-cyan-400">
	<TerminalText
		lines={["> ping 8.8.8.8 — 3ms", "> traceroute complete", "> done."]}
		speed={15}
		cursor={false}
	/>
</div>

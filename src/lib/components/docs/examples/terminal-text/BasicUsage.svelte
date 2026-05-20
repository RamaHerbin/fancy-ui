<script lang="ts">
	import { TerminalText } from "$lib/fancy-ui/terminal-text";
</script>

<div class="rounded-lg border bg-black p-5 text-green-400">
	<TerminalText
		lines={[
			"[INFO]  boot sequence complete",
			"[WARN]  memory fragmentation at sector 0x4A2F",
			"[INFO]  kernel patch applied successfully",
			"[OK]    all systems nominal",
		]}
		speed={25}
	/>
</div>

<script lang="ts">
	import { StatusMorph } from "$lib/fancy-ui/status-morph";
</script>

<div class="flex w-full flex-col items-center gap-6 p-6">
	<!-- tone="semantic" swaps currentColor for the shared AI-family
	     --ft-status-running/-done/-error vocabulary — the ring track itself stays
	     neutral in both tones. Three static states side by side, so the three
	     colors are visible at once instead of only ever one at a time;
	     resetAfter={0} keeps the settled states from auto-resetting to idle. -->
	<div class="flex items-center gap-8 text-3xl">
		<div class="flex flex-col items-center gap-2">
			<StatusMorph state="loading" tone="semantic" />
			<span class="text-muted-foreground text-xs">loading</span>
		</div>
		<div class="flex flex-col items-center gap-2">
			<StatusMorph state="success" tone="semantic" resetAfter={0} />
			<span class="text-muted-foreground text-xs">success</span>
		</div>
		<div class="flex flex-col items-center gap-2">
			<StatusMorph state="error" tone="semantic" resetAfter={0} />
			<span class="text-muted-foreground text-xs">error</span>
		</div>
	</div>
</div>

<script lang="ts">
	import { Tooltip } from "$lib/fancy-ui/tooltip";
</script>

<div class="flex flex-wrap items-center gap-8">
	<Tooltip content="Opens instantly" openDelay={0}>
		<button
			class="border-border text-foreground rounded-[8px] border px-[14px] py-[7px] text-[12px] font-medium"
		>
			No delay
		</button>
	</Tooltip>

	<Tooltip content="Waits a second before showing" openDelay={1000}>
		<button
			class="border-border text-foreground rounded-[8px] border px-[14px] py-[7px] text-[12px] font-medium"
		>
			1s open delay
		</button>
	</Tooltip>

	<Tooltip content="Lingers for a second after you leave" closeDelay={1000}>
		<button
			class="border-border text-foreground rounded-[8px] border px-[14px] py-[7px] text-[12px] font-medium"
		>
			1s close delay
		</button>
	</Tooltip>
</div>

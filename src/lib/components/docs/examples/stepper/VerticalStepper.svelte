<script lang="ts">
	import { Stepper, Step } from "$lib/fancy-ui/stepper";

	let current = $state(2);
</script>

<div
	class="w-full max-w-xs rounded-[20px] border border-black/[0.08] bg-[#f4f4f5] p-1.5 dark:border-white/[0.08] dark:bg-[#0b0b0c]"
>
	<div
		class="rounded-[14px] border border-black/[0.08] bg-[#fafafa] p-5 dark:border-white/[0.06] dark:bg-[#141416]"
	>
		<Stepper bind:current orientation="vertical">
			<Step label="Account" />
			<Step label="Profile" />
			<Step label="Billing" />
			<Step label="Confirmation" />
		</Stepper>
	</div>
</div>

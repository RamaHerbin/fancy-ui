<script lang="ts">
	import { Stepper, Step } from "$lib/fancy-ui/stepper";

	let current = $state(1);
</script>

<div
	class="w-full max-w-sm rounded-[20px] border border-black/[0.08] bg-[#f4f4f5] p-1.5 dark:border-white/[0.08] dark:bg-[#0b0b0c]"
>
	<div
		class="rounded-[14px] border border-black/[0.08] bg-[#fafafa] p-5 dark:border-white/[0.06] dark:bg-[#141416]"
	>
		<Stepper bind:current orientation="vertical" clickable>
			<Step label="Account" description="Create your login" />
			<Step label="Profile" description="Tell us about yourself" />
			<Step label="Billing" description="Pick a plan" />
			<Step label="Confirmation" description="Review and finish" />
		</Stepper>
	</div>
</div>

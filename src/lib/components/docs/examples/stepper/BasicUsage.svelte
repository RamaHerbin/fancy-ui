<script lang="ts">
	import { Stepper, Step } from "$lib/fancy-ui/stepper";

	const steps = [
		{ label: "Account", description: "Sign-in details" },
		{ label: "Workspace", description: "Name and region" },
		{ label: "Invite", description: "Bring your team" },
		{ label: "Launch", description: "Review and go" },
	];

	let current = $state(2);
</script>

<div
	class="w-full max-w-2xl rounded-[22px] border border-black/[0.08] bg-[#f4f4f5] p-1.5 dark:border-white/[0.08] dark:bg-[#0b0b0c]"
>
	<div
		class="rounded-2xl border border-black/[0.08] bg-[#fafafa] shadow-[0_1px_2px_rgb(0_0_0/0.04)] dark:border-white/[0.06] dark:bg-[#141416] dark:shadow-none"
	>
		<div
			class="flex items-center justify-between border-b border-black/[0.06] px-5 py-3 dark:border-white/[0.06]"
		>
			<span class="text-foreground text-[13px] font-medium">New workspace</span>
			<span class="text-muted-foreground font-mono text-[11px] tabular-nums">
				{String(current + 1).padStart(2, "0")} / {String(steps.length).padStart(2, "0")}
			</span>
		</div>

		<div class="px-4 pt-7 pb-6 sm:px-6">
			<Stepper bind:current>
				{#each steps as step (step.label)}
					<Step label={step.label} description={step.description} />
				{/each}
			</Stepper>
		</div>

		<div
			class="flex items-center justify-between border-t border-black/[0.06] px-5 py-3 dark:border-white/[0.06]"
		>
			<button
				type="button"
				class="text-muted-foreground hover:text-foreground rounded-md px-2.5 py-1.5 text-[13px] transition-colors disabled:pointer-events-none disabled:opacity-40"
				disabled={current === 0}
				onclick={() => (current = Math.max(0, current - 1))}
			>
				Back
			</button>
			<button
				type="button"
				class="rounded-lg border border-black/[0.08] bg-white px-3.5 py-1.5 text-[13px] font-medium text-neutral-900 shadow-[0_1px_2px_rgb(0_0_0/0.06)] transition-colors hover:bg-neutral-50 dark:border-white/[0.1] dark:bg-white/[0.06] dark:text-neutral-100 dark:shadow-none dark:hover:bg-white/[0.1]"
				onclick={() => (current = current === steps.length - 1 ? 0 : current + 1)}
			>
				{current === steps.length - 1 ? "Start over" : "Continue"}
			</button>
		</div>
	</div>
</div>

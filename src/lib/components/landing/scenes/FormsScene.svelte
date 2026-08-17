<!--
	Scene 2 — one realistic form end to end, including the states a real form has
	to survive: a validation error, a disabled field, a helper line. Skins differ
	most visibly in how they render error and focus, so this is where the switch
	pays off.
-->
<script lang="ts">
	import { Badge, Button, Checkbox, Input, Select, Switch, Textarea } from "$lib/cameleon";

	let name = $state("Ada Lovelace");
	let email = $state("not-an-email");
	let role = $state("engineering");
	let seats = $state("3");
	let message = $state(
		"We are migrating a design system and need a component set that themes cleanly."
	);
	let newsletter = $state(false);
	let terms = $state(true);

	// Deliberately naive: this scene is a demo of the controls, not of validation.
	const emailInvalid = $derived(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email));
</script>

<div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
	<!-- The form -->
	<div class="lp-card flex flex-col gap-5 rounded-[14px] p-6">
		<div class="flex items-center justify-between gap-4">
			<div>
				<h3 class="text-[17px] font-semibold">Request a team trial</h3>
				<p class="lp-muted mt-1 text-[13px]">Every field below is a live component.</p>
			</div>
			<Badge variant="purple">Pro</Badge>
		</div>

		<div class="grid gap-4 sm:grid-cols-2">
			<label class="flex flex-col gap-1.5 text-[13px]">
				<span class="lp-muted">Full name</span>
				<Input bind:value={name} placeholder="Ada Lovelace" />
			</label>

			<label class="flex flex-col gap-1.5 text-[13px]">
				<span class="lp-muted">Work email</span>
				<Input bind:value={email} type="email" error={emailInvalid} placeholder="you@company.com" />
				{#if emailInvalid}
					<span style="color:var(--skin-red,#fb7185)" class="text-[12px]">
						Enter a valid email address.
					</span>
				{:else}
					<span class="lp-dim text-[12px]">We only use this to send the trial key.</span>
				{/if}
			</label>

			<label class="flex flex-col gap-1.5 text-[13px]">
				<span class="lp-muted">Team</span>
				<Select bind:value={role}>
					<option value="engineering">Engineering</option>
					<option value="design">Design</option>
					<option value="product">Product</option>
				</Select>
			</label>

			<label class="flex flex-col gap-1.5 text-[13px]">
				<span class="lp-muted">Seats</span>
				<Input bind:value={seats} type="number" min="1" />
			</label>
		</div>

		<label class="flex flex-col gap-1.5 text-[13px]">
			<span class="lp-muted">What are you building?</span>
			<Textarea bind:value={message} rows={3} />
		</label>

		<label class="flex flex-col gap-1.5 text-[13px]">
			<span class="lp-dim">Billing reference (set by your admin)</span>
			<Input value="ACME-2026-Q3" disabled />
		</label>

		<div class="flex flex-col gap-2.5">
			<Checkbox bind:checked={terms}>I accept the terms of service</Checkbox>
			<Checkbox bind:checked={newsletter}>Send me release notes</Checkbox>
		</div>

		<div class="lp-line flex flex-wrap items-center gap-3 border-t pt-5">
			<Button disabled={emailInvalid || !terms}>Request trial</Button>
			<Button variant="secondary">Talk to us</Button>
		</div>
	</div>

	<!-- Summary rail -->
	<div class="lp-card flex flex-col gap-4 rounded-[14px] p-6">
		<p class="lp-mono lp-dim text-[10px] tracking-[0.12em] uppercase">Summary</p>
		{#each [["Team", role], ["Seats", seats], ["Billing", "Monthly"]] as [label, value] (label)}
			<div class="flex items-baseline justify-between gap-4 text-[13px]">
				<span class="lp-muted">{label}</span>
				<span class="font-medium capitalize">{value}</span>
			</div>
		{/each}

		<div class="lp-line flex items-baseline justify-between gap-4 border-t pt-4">
			<span class="lp-muted text-[13px]">Total</span>
			<span class="text-[20px] font-bold">${Number(seats || 0) * 12}/mo</span>
		</div>

		<div class="lp-line flex items-center justify-between gap-4 border-t pt-4">
			<span class="text-[13px]">Annual billing</span>
			<Switch aria-label="Annual billing" />
		</div>

		<p class="lp-dim text-[12px] leading-relaxed">
			Switch the skin above — the error, focus and disabled treatments are the skin's, not this
			form's.
		</p>
	</div>
</div>

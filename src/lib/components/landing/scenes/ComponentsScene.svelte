<!--
	Scene 1 — a spread of controls, every one of them live and every one of them
	restyled by the active skin. Deliberately the widest variety rather than the
	prettiest arrangement: the point is that ten different primitives change art
	direction together from one prop.
-->
<script lang="ts">
	import { Badge, Button, Checkbox, Input, Radio, Slider, Switch, Tooltip } from "$lib/cameleon";

	let email = $state("ada@example.com");
	let notify = $state(true);
	let compact = $state(false);
	let volume = $state(64);
	let plan = $state("pro");
	let terms = $state(true);
</script>

<div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
	<!-- Field group -->
	<div class="lp-card flex flex-col gap-4 rounded-[14px] p-5">
		<p class="lp-mono lp-dim text-[10px] tracking-[0.12em] uppercase">Sign in</p>
		<label class="flex flex-col gap-1.5 text-[13px]">
			<span class="lp-muted">Email</span>
			<Input bind:value={email} type="email" placeholder="you@example.com" />
		</label>
		<label class="flex flex-col gap-1.5 text-[13px]">
			<span class="lp-muted">Password</span>
			<Input type="password" value="hunter2" placeholder="••••••••" />
		</label>
		<Checkbox bind:checked={terms}>Keep me signed in</Checkbox>
		<Button size="md">Continue</Button>
	</div>

	<!-- Toggles + slider -->
	<div class="lp-card flex flex-col gap-5 rounded-[14px] p-5">
		<p class="lp-mono lp-dim text-[10px] tracking-[0.12em] uppercase">Preferences</p>

		<div class="flex items-center justify-between gap-4">
			<span class="text-[13px]">Email notifications</span>
			<Switch bind:checked={notify} aria-label="Email notifications" />
		</div>
		<div class="flex items-center justify-between gap-4">
			<span class="text-[13px]">Compact layout</span>
			<Switch bind:checked={compact} aria-label="Compact layout" />
		</div>

		<div class="flex flex-col gap-2">
			<div class="flex items-baseline justify-between text-[13px]">
				<span>Volume</span>
				<span class="lp-mono lp-muted text-[12px]">{volume}</span>
			</div>
			<Slider bind:value={volume} min={0} max={100} class="w-full" aria-label="Volume" />
		</div>

		<div class="flex flex-col gap-2 text-[13px]">
			<Radio bind:group={plan} value="free">Free</Radio>
			<Radio bind:group={plan} value="pro">Pro</Radio>
		</div>
	</div>

	<!-- Status + actions -->
	<div class="lp-card flex flex-col gap-5 rounded-[14px] p-5 sm:col-span-2 lg:col-span-1">
		<p class="lp-mono lp-dim text-[10px] tracking-[0.12em] uppercase">Status</p>

		<div class="flex flex-wrap gap-2">
			<Badge variant="green">Operational</Badge>
			<Badge variant="blue">v3.2</Badge>
			<Badge variant="yellow">Beta</Badge>
			<Badge variant="purple">Pro</Badge>
			<Badge variant="red">Deprecated</Badge>
		</div>

		<!-- The tooltip leads the row rather than trailing it. Its bubble is
		     `whitespace-nowrap` and laid out even while hidden, so flush against the
		     right edge of a narrow viewport it widens the document and the page
		     scrolls sideways. -->
		<div class="flex flex-wrap items-center gap-2.5">
			<Tooltip content="Every control here is a real component" />
			<Button size="sm" variant="secondary">Cancel</Button>
			<Button size="sm">Save</Button>
			<Button size="sm" variant="destructive">Delete</Button>
		</div>

		<div class="lp-line flex items-center justify-between border-t pt-4 text-[13px]">
			<span class="lp-muted">Plan</span>
			<span class="font-semibold">{plan === "pro" ? "Pro — $12/mo" : "Free"}</span>
		</div>
	</div>
</div>

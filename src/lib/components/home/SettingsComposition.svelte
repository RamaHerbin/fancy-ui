<!--
	SettingsComposition — a preferences panel from the library's controls:
	tabs, a segmented choice, a slider and switches. Every value is local.
-->
<script lang="ts">
	import { Tabs, TabsList, TabsTrigger, TabsContent } from "$lib/fancy-ui/tabs/index.js";
	import { Switch } from "$lib/fancy-ui/switch/index.js";
	import { Slider } from "$lib/fancy-ui/slider/index.js";
	import { ToggleGroup, ToggleGroupItem } from "$lib/fancy-ui/toggle-group/index.js";

	let tab = $state("appearance");
	let density = $state("comfortable");
	let radius = $state(12);
	let grid = $state(true);
	let digest = $state(true);
	let mentions = $state(true);
	let releases = $state(false);
	let speed = $state(60);
	let parallax = $state(false);

	/** The switch label on the left, the track on the right, the whole row clickable. */
	const SWITCH_ROW = "flex w-full flex-row-reverse justify-between text-[14px]";
</script>

<div class="settings">
	<p class="title">Workspace settings</p>
	<Tabs bind:value={tab}>
		<TabsList>
			<TabsTrigger value="appearance">Appearance</TabsTrigger>
			<TabsTrigger value="notifications">Notifications</TabsTrigger>
			<TabsTrigger value="motion">Motion</TabsTrigger>
		</TabsList>

		<TabsContent value="appearance">
			<div class="rows">
				<div class="row">
					<span class="label">Density</span>
					<ToggleGroup bind:value={density} label="Density" size="sm">
						<ToggleGroupItem value="compact">Compact</ToggleGroupItem>
						<ToggleGroupItem value="comfortable">Comfortable</ToggleGroupItem>
						<ToggleGroupItem value="roomy">Roomy</ToggleGroupItem>
					</ToggleGroup>
				</div>
				<div class="row stack">
					<span class="label" aria-hidden="true">Corner radius</span>
					<Slider
						bind:value={radius}
						min={0}
						max={24}
						label="Corner radius"
						showValue
						class="mt-3"
					/>
				</div>
				<div class="row">
					<Switch bind:checked={grid} class={SWITCH_ROW}>Show layout grid</Switch>
				</div>
			</div>
		</TabsContent>

		<TabsContent value="notifications">
			<div class="rows">
				<div class="row">
					<Switch bind:checked={digest} class={SWITCH_ROW}>Weekly digest</Switch>
				</div>
				<div class="row"><Switch bind:checked={mentions} class={SWITCH_ROW}>Mentions</Switch></div>
				<div class="row">
					<Switch bind:checked={releases} class={SWITCH_ROW}>Release notes</Switch>
				</div>
			</div>
		</TabsContent>

		<TabsContent value="motion">
			<div class="rows">
				<div class="row stack">
					<span class="label" aria-hidden="true">Transition speed</span>
					<Slider
						bind:value={speed}
						min={0}
						max={100}
						label="Transition speed"
						showValue
						class="mt-3"
					/>
				</div>
				<div class="row">
					<Switch bind:checked={parallax} class={SWITCH_ROW}>Pointer parallax</Switch>
				</div>
			</div>
		</TabsContent>
	</Tabs>
</div>

<style>
	.settings {
		display: flex;
		flex-direction: column;
		gap: 14px;
		height: 100%;
		padding: 20px 22px;
		border-radius: 12px;
		background: var(--fx-panel-solid);
		box-shadow: inset 0 0 0 1px var(--fx-hairline);
	}

	/* One-hue fill on --ft-accent. Set here, on the wrap's own rule: the
	   library declares the cyan end on that element, so an inherited value
	   from an ancestor never reaches it. */
	.settings :global(.ft-slider-wrap) {
		--ft-slider-accent-end: var(--ft-slider-accent);
		/* The resting track reads the theme's input colour, a pale slate here:
		   a hairline keeps the ink fill legible against it. */
		--color-input: var(--fx-hairline-strong);
	}

	.title {
		font-size: 14px;
		font-weight: 600;
	}

	.rows {
		display: flex;
		flex-direction: column;
		margin-top: 8px;
	}

	.row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		min-height: 56px;
		padding: 8px 0;
		box-shadow: inset 0 -1px 0 var(--fx-hairline);
	}

	.row:last-child {
		box-shadow: none;
	}

	.row.stack {
		display: block;
	}

	.label {
		font-size: 14px;
	}

	@media (max-width: 700px) {
		.settings {
			padding: 14px;
		}
		.row:not(.stack) {
			flex-wrap: wrap;
		}
	}
</style>

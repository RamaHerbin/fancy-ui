<!--
	Bottom band of the 13a frame: six small bordered cells, each holding one
	form primitive exactly as it ships from the library. The verification-code
	cell is the one hand-drawn specimen — the library has no PIN input yet, so
	the cell shows the design's static mock.
-->
<script lang="ts">
	import { Input, Select, Slider, Switch, Tabs, TabsList, TabsTrigger } from "$lib/fancy-ui";

	let volume = $state(30);
	let notify = $state(true);
	let channel = $state("chats");

	const SELECT_OPTIONS = [
		{ value: "svelte", label: "Svelte 5" },
		{ value: "tailwind", label: "Tailwind v4" },
		{ value: "typescript", label: "TypeScript" },
	];

	const CODE_DIGITS = ["4", "2", "7", "9", "1", "6"];
	const FOCUSED_DIGIT = 3;
</script>

{#snippet cellLabel(index: string, name: string, slug: string)}
	<span
		class="lp-mono flex items-center text-[9.5px] tracking-[0.1em]"
		style="color:var(--lp-grey-3)"
	>
		{index} — {name}
		<a href="/docs/components/{slug}" class="lp-link ml-auto" style="color:var(--lp-grey-5)"
			>View docs ↗</a
		>
	</span>
{/snippet}

<div class="grid min-h-0 flex-1 grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.08fr_1.05fr_1.14fr_.98fr_.94fr_1fr]">
	<!-- 05 — Input -->
	<div class="lp-cell">
		{@render cellLabel("05", "INPUT", "input")}
		<span class="flex flex-1 items-center">
			<Input placeholder="Type something…" label="Type something" class="w-full" />
		</span>
	</div>

	<!-- 06 — Select -->
	<div class="lp-cell">
		{@render cellLabel("06", "SELECT", "select")}
		<span class="flex flex-1 items-center">
			<Select options={SELECT_OPTIONS} placeholder="Select an option" label="Select an option" class="w-full" />
		</span>
	</div>

	<!-- 07 — Verification code (static mock: no PIN input in the library yet) -->
	<div class="lp-cell">
		{@render cellLabel("07", "VERIFICATION CODE", "input")}
		<span class="flex flex-1 items-center">
			<span class="flex gap-[7px]" aria-hidden="true">
				{#each CODE_DIGITS as digit, index (index)}
					<span
						class="lp-mono flex h-11 w-[33px] items-center justify-center rounded-[2px] border text-[17px]"
						style={index === FOCUSED_DIGIT
							? "border-color:var(--lp-accent);box-shadow:0 0 0 1px var(--lp-accent)"
							: "border-color:rgba(242,241,236,.18)"}>{digit}</span
					>
				{/each}
			</span>
		</span>
	</div>

	<!-- 08 — Slider -->
	<div class="lp-cell">
		{@render cellLabel("08", "SLIDER", "slider")}
		<span class="flex flex-1 items-center gap-3.5">
			<Slider bind:value={volume} min={0} max={100} label="Volume" class="w-full" />
			<span class="lp-mono w-[22px] text-right text-[12px]" style="color:var(--lp-grey-2)"
				>{volume}</span
			>
		</span>
	</div>

	<!-- 09 — Notification -->
	<div class="lp-cell">
		{@render cellLabel("09", "NOTIFICATION", "switch")}
		<span class="flex flex-1 items-center gap-3">
			<Switch bind:checked={notify} label="Push notifications" />
			<span class="text-[13px]" style="color:var(--lp-grey-1)">Push notifications</span>
		</span>
	</div>

	<!-- 10 — Tabs -->
	<div class="lp-cell lp-cell-last">
		{@render cellLabel("10", "TABS", "tabs")}
		<span class="flex flex-1 items-center">
			<Tabs bind:value={channel} class="w-full">
				<TabsList>
					<TabsTrigger value="chats">Chats</TabsTrigger>
					<TabsTrigger value="emails">Emails</TabsTrigger>
					<TabsTrigger value="calls">Calls</TabsTrigger>
				</TabsList>
			</Tabs>
		</span>
	</div>
</div>

<style>
	.lp-cell {
		display: flex;
		flex-direction: column;
		box-sizing: border-box;
		min-width: 0;
		min-height: 108px;
		padding: 14px 16px;
		border-right: 1px solid var(--lp-line);
		border-bottom: 1px solid var(--lp-line);
	}

	/* At the full six-across width the row is the frame's last band: the frame
	   draws the outer edge, so the cells drop their own closing borders. */
	@media (min-width: 64rem) {
		.lp-cell {
			border-bottom: none;
		}

		.lp-cell-last {
			border-right: none;
		}
	}
</style>

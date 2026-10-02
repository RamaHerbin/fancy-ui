<script lang="ts">
	import { BentoGrid, BentoGridItem } from "$lib/fancy-ui/bento-grid";
	import Activity from "@lucide/svelte/icons/activity";
	import Rocket from "@lucide/svelte/icons/rocket";
	import Gauge from "@lucide/svelte/icons/gauge";
	import Command from "@lucide/svelte/icons/command";
	import Globe from "@lucide/svelte/icons/globe";

	// Fixed sample data: the preview renders the same on the server and the client.
	const latency = [
		42, 38, 44, 40, 36, 39, 47, 52, 45, 41, 37, 35, 38, 43, 40, 34, 33, 36, 31, 34, 30, 32, 29, 31,
	];
	const W = 480;
	const H = 110;
	const max = 60;
	const pts = latency.map((v, i) => [(i / (latency.length - 1)) * W, H - (v / max) * H] as const);
	const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
	const area = `${line} L${W} ${H} L0 ${H} Z`;
	const last = pts[pts.length - 1];

	const uptime = [9, 10, 10, 9, 10, 10, 10, 8, 10, 10, 10, 9, 10, 10, 6, 10, 10, 9, 10, 10];

	const deploys = [
		{ name: "feat/cart-v2", state: "live", time: "2m" },
		{ name: "fix/retry", state: "building", time: "now" },
		{ name: "chore/deps", state: "queued", time: "—" },
	];

	const regions = [
		{ code: "fra", ms: 12 },
		{ code: "iad", ms: 18 },
		{ code: "sfo", ms: 24 },
		{ code: "sin", ms: 41 },
		{ code: "gru", ms: 57 },
		{ code: "syd", ms: 63 },
	];

	const well =
		"rounded-lg border border-black/[0.06] bg-white/70 dark:border-white/[0.06] dark:bg-white/[0.02]";
</script>

<BentoGrid>
	<BentoGridItem class="md:col-span-2">
		{#snippet header()}
			<div class="relative flex min-h-[5.5rem] flex-1 flex-col overflow-hidden {well}">
				<div class="flex items-center justify-between px-3 pt-2.5 text-[11px]">
					<span class="font-medium text-neutral-500 dark:text-neutral-400">p95 · last 24h</span>
					<span
						class="rounded-md border border-black/[0.06] px-1.5 py-0.5 font-mono text-neutral-800 tabular-nums dark:border-white/[0.08] dark:text-neutral-200"
						>31 ms</span
					>
				</div>
				<svg
					viewBox="0 0 {W} {H}"
					preserveAspectRatio="none"
					class="mt-auto h-[70%] w-full"
					aria-hidden="true"
				>
					<defs>
						<linearGradient id="bento-demo-area" x1="0" y1="0" x2="0" y2="1">
							<stop offset="0%" stop-color="var(--bento-accent, #8e9cff)" stop-opacity="0.28" />
							<stop offset="100%" stop-color="var(--bento-accent, #8e9cff)" stop-opacity="0" />
						</linearGradient>
					</defs>
					{#each [0.25, 0.5, 0.75] as g (g)}
						<line
							x1="0"
							x2={W}
							y1={H * g}
							y2={H * g}
							class="stroke-black/[0.06] dark:stroke-white/[0.06]"
							stroke-dasharray="2 4"
							vector-effect="non-scaling-stroke"
						/>
					{/each}
					<path d={area} fill="url(#bento-demo-area)" />
					<path
						d={line}
						fill="none"
						stroke="var(--bento-accent, #8e9cff)"
						stroke-width="1.5"
						vector-effect="non-scaling-stroke"
						stroke-linejoin="round"
					/>
					<circle cx={last[0] - 3} cy={last[1]} r="3" fill="var(--bento-accent, #8e9cff)" />
				</svg>
			</div>
		{/snippet}
		{#snippet icon()}<Activity />{/snippet}
		{#snippet title()}Latency, at a glance{/snippet}
		{#snippet description()}Every request, every region, folded into one quiet line.{/snippet}
	</BentoGridItem>

	<BentoGridItem>
		{#snippet header()}
			<ul
				class="flex min-h-[5.5rem] flex-1 flex-col justify-center divide-y divide-black/[0.05] px-3 dark:divide-white/[0.05] {well}"
			>
				{#each deploys as d (d.name)}
					<li class="flex items-center gap-2.5 py-2 text-[12px]">
						<span
							class="size-1.5 shrink-0 rounded-full {d.state === 'live'
								? 'bg-emerald-500 shadow-[0_0_6px_1px] shadow-emerald-500/50'
								: d.state === 'building'
									? 'bg-amber-400'
									: 'bg-neutral-300 dark:bg-neutral-600'}"
						></span>
						<span class="truncate font-mono text-neutral-700 dark:text-neutral-300">{d.name}</span>
						<span class="ml-auto text-neutral-400 tabular-nums dark:text-neutral-500">{d.time}</span
						>
					</li>
				{/each}
			</ul>
		{/snippet}
		{#snippet icon()}<Rocket />{/snippet}
		{#snippet title()}Deploy queue{/snippet}
		{#snippet description()}Ship in order, roll back in one move.{/snippet}
	</BentoGridItem>

	<BentoGridItem>
		{#snippet header()}
			<div class="flex min-h-[5.5rem] flex-1 flex-col justify-between p-3 {well}">
				<div class="flex items-baseline gap-1.5">
					<span
						class="text-2xl font-medium tracking-tight text-neutral-900 tabular-nums dark:text-neutral-100"
						>99.98%</span
					>
					<span class="text-[11px] text-neutral-400 dark:text-neutral-500">20 days</span>
				</div>
				<div class="flex h-8 items-end gap-1" aria-hidden="true">
					{#each uptime as u, i (i)}
						<span
							class="flex-1 rounded-[2px] {u < 8
								? 'bg-amber-400/80'
								: 'bg-neutral-300 dark:bg-neutral-700'}"
							style:height="{u * 10}%"
						></span>
					{/each}
				</div>
			</div>
		{/snippet}
		{#snippet icon()}<Gauge />{/snippet}
		{#snippet title()}Uptime{/snippet}
		{#snippet description()}One amber day in twenty. Nothing else to see.{/snippet}
	</BentoGridItem>

	<BentoGridItem>
		{#snippet header()}
			<div class="flex min-h-[5.5rem] flex-1 flex-col gap-1.5 p-2 {well}">
				<div
					class="flex items-center gap-2 rounded-md border border-black/[0.07] bg-white px-2.5 py-1.5 text-[12px] text-neutral-400 dark:border-white/[0.07] dark:bg-black/30 dark:text-neutral-500"
				>
					<span>Search…</span>
					<kbd
						class="ml-auto rounded border border-black/[0.08] px-1 font-mono text-[10px] text-neutral-500 dark:border-white/[0.1] dark:text-neutral-400"
						>⌘K</kbd
					>
				</div>
				<div
					class="rounded-md bg-black/[0.035] px-2.5 py-1.5 text-[12px] text-neutral-800 dark:bg-white/[0.05] dark:text-neutral-200"
				>
					Open project settings
				</div>
				<div class="px-2.5 py-1 text-[12px] text-neutral-500 dark:text-neutral-400">
					Invite a teammate
				</div>
			</div>
		{/snippet}
		{#snippet icon()}<Command />{/snippet}
		{#snippet title()}Keyboard first{/snippet}
		{#snippet description()}Every action is two keys away.{/snippet}
	</BentoGridItem>

	<BentoGridItem>
		{#snippet header()}
			<div class="grid min-h-[5.5rem] flex-1 grid-cols-2 content-center gap-1 p-2 {well}">
				{#each regions as r (r.code)}
					<div
						class="flex min-w-0 items-center gap-1 rounded-md border border-black/[0.05] px-1.5 py-1 text-[11px] dark:border-white/[0.05]"
					>
						<span
							class="size-1 shrink-0 rounded-full {r.ms < 30
								? 'bg-emerald-500'
								: 'bg-neutral-400 dark:bg-neutral-500'}"
						></span>
						<span class="font-mono text-neutral-700 uppercase dark:text-neutral-300">{r.code}</span>
						<span class="ml-auto text-[10px] text-neutral-400 tabular-nums dark:text-neutral-500"
							>{r.ms}ms</span
						>
					</div>
				{/each}
			</div>
		{/snippet}
		{#snippet icon()}<Globe />{/snippet}
		{#snippet title()}Close to everyone{/snippet}
		{#snippet description()}Six regions, one config file.{/snippet}
	</BentoGridItem>
</BentoGrid>

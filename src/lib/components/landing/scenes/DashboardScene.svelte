<!--
	Scene 3 — an app shell. Where the other scenes prove the primitives restyle,
	this one proves the *surfaces* do: sidebar, stat tiles, a chart and a table
	built only from `--skin-card` / `--skin-surface` / `--skin-line` and the five
	accent tokens, so the whole layout follows the skin without a single
	per-skin branch.
-->
<script lang="ts">
	import { Badge, Button, Select, Switch } from "$lib/cameleon";

	let range = $state("30d");
	let live = $state(true);

	const nav = ["Overview", "Orders", "Customers", "Reports", "Settings"];
	let current = $state("Overview");

	const stats = [
		{ label: "Revenue", value: "$228,441", delta: "+3.3%", up: true },
		{ label: "Orders", value: "1,284", delta: "+8.1%", up: true },
		{ label: "Refunds", value: "$4,108", delta: "-1.4%", up: false },
		{ label: "Margin", value: "62.4%", delta: "+0.9%", up: true },
	];

	// A fixed series — no clock, no randomness, so the scene renders identically
	// on the server and after hydration.
	const series = [38, 52, 44, 61, 57, 72, 66, 81, 74, 92, 86, 99];

	const rows = [
		{ id: "#4821", who: "Ada Lovelace", plan: "Pro", total: "$144.00", state: "Paid" },
		{ id: "#4820", who: "Alan Turing", plan: "Team", total: "$432.00", state: "Pending" },
		{ id: "#4819", who: "Grace Hopper", plan: "Pro", total: "$144.00", state: "Paid" },
		{ id: "#4818", who: "Katherine Johnson", plan: "Free", total: "$0.00", state: "Refunded" },
	];

	const stateVariant = (s: string) =>
		s === "Paid" ? "green" : s === "Pending" ? "yellow" : ("red" as const);
</script>

<div class="grid gap-5 lg:grid-cols-[190px_minmax(0,1fr)]">
	<!-- Sidebar -->
	<aside class="lp-card flex flex-col gap-1 rounded-[14px] p-3">
		<p class="lp-mono lp-dim px-2 pt-1 pb-2 text-[10px] tracking-[0.12em] uppercase">Workspace</p>
		{#each nav as item (item)}
			{@const active = item === current}
			<button
				type="button"
				onclick={() => (current = item)}
				class="cursor-pointer rounded-lg px-3 py-2 text-left text-[13px] transition-colors"
				class:lp-muted={!active}
				class:lp-surface={active}
				style={active ? "color:var(--skin-page-fg,#f8fafc);font-weight:600" : undefined}
			>
				{item}
			</button>
		{/each}
	</aside>

	<div class="flex flex-col gap-5">
		<!-- Toolbar -->
		<div class="flex flex-wrap items-center justify-between gap-3">
			<div>
				<h3 class="text-[17px] font-semibold">{current}</h3>
				<p class="lp-muted text-[13px]">
					Last {range === "7d" ? "7" : range === "30d" ? "30" : "90"} days
				</p>
			</div>
			<div class="flex flex-wrap items-center gap-3">
				<div class="flex items-center gap-2 text-[13px]">
					<span class="lp-muted">Live</span>
					<Switch bind:checked={live} aria-label="Live data" />
				</div>
				<div class="w-[120px]">
					<Select bind:value={range}>
						<option value="7d">7 days</option>
						<option value="30d">30 days</option>
						<option value="90d">90 days</option>
					</Select>
				</div>
				<Button size="sm">Export</Button>
			</div>
		</div>

		<!-- Stat tiles -->
		<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
			{#each stats as stat (stat.label)}
				<div class="lp-card rounded-[14px] p-4">
					<p class="lp-muted text-[12px]">{stat.label}</p>
					<p class="mt-1.5 text-[22px] font-bold tracking-[-0.02em]">{stat.value}</p>
					<p
						class="mt-1 text-[12px] font-medium"
						style="color:{stat.up ? 'var(--skin-green,#34d399)' : 'var(--skin-red,#fb7185)'}"
					>
						{stat.delta}
					</p>
				</div>
			{/each}
		</div>

		<!-- Chart + table -->
		<div class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
			<div class="lp-card flex flex-col gap-4 rounded-[14px] p-5">
				<p class="lp-mono lp-dim text-[10px] tracking-[0.12em] uppercase">Revenue</p>
				<!-- Bars, not an SVG chart: they inherit the accent token directly and
				     need no viewBox maths to stay responsive. -->
				<div class="flex h-[120px] items-end gap-1.5" aria-hidden="true">
					{#each series as v, i (i)}
						<div
							class="flex-1 rounded-t-[3px]"
							style="height:{v}%;background:linear-gradient(180deg,var(--skin-purple,#8b7bff),var(--skin-blue,#5b8cff));opacity:{0.45 +
								(i / series.length) * 0.55}"
						></div>
					{/each}
				</div>
				<p class="lp-dim text-[12px]">Jan — Dec</p>
			</div>

			<div class="lp-card overflow-hidden rounded-[14px]">
				<div class="lp-hairline flex items-center justify-between px-5 py-3.5">
					<p class="lp-mono lp-dim text-[10px] tracking-[0.12em] uppercase">Recent orders</p>
					<Badge>{rows.length}</Badge>
				</div>
				<div class="flex flex-col">
					{#each rows as row (row.id)}
						<div class="lp-hairline flex items-center gap-3 px-5 py-3 text-[13px] last:border-0">
							<span class="lp-mono lp-dim w-[52px] shrink-0">{row.id}</span>
							<span class="min-w-0 flex-1 truncate font-medium">{row.who}</span>
							<span class="lp-muted hidden w-[54px] shrink-0 sm:block">{row.plan}</span>
							<span class="w-[72px] shrink-0 text-right font-medium">{row.total}</span>
							<span class="shrink-0"
								><Badge variant={stateVariant(row.state)}>{row.state}</Badge></span
							>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</div>
</div>

<script lang="ts">
	import { ContainerScroll } from "$lib/fancy-ui/container-scroll";

	const nav = ["Overview", "Releases", "Insights", "Members", "Settings"];
	const stats = [
		{
			label: "Deploys",
			value: "1,284",
			delta: "+12.4%",
			path: "M0 18 L10 15 L20 16 L30 10 L40 12 L50 6 L60 7 L70 3",
		},
		{
			label: "p95 latency",
			value: "182ms",
			delta: "−8.1%",
			path: "M0 6 L10 8 L20 7 L30 11 L40 10 L50 13 L60 12 L70 15",
		},
		{
			label: "Uptime",
			value: "99.98%",
			delta: "30 days",
			path: "M0 10 L10 9 L20 10 L30 9 L40 10 L50 9 L60 10 L70 9",
		},
	];
	const rows = [
		{ name: "edge-router", live: true, time: "2m" },
		{ name: "billing-api", live: true, time: "14m" },
		{ name: "search-index", live: false, time: "31m" },
		{ name: "auth-worker", live: true, time: "1h" },
	];

	// A deterministic area chart (no randomness: server render and hydration agree).
	const points = [34, 40, 37, 48, 44, 56, 52, 63, 58, 70, 66, 78, 74, 86];
	const w = 560;
	const h = 160;
	const line = points
		.map(
			(v, i) =>
				`${i === 0 ? "M" : "L"}${((i / (points.length - 1)) * w).toFixed(1)} ${(h - (v / 100) * h).toFixed(1)}`
		)
		.join(" ");
	const area = `${line} L${w} ${h} L0 ${h} Z`;

	// Nested hairline panels: an outer tray and an inner surface.
	const tray =
		"rounded-xl border border-black/[0.06] bg-zinc-50 p-1 dark:border-white/[0.06] dark:bg-[#111113]";
	const inner =
		"rounded-lg border border-black/[0.05] bg-white dark:border-white/[0.05] dark:bg-[#0d0d0f]";
</script>

<ContainerScroll>
	{#snippet titleContent()}
		<p
			class="text-muted-foreground mb-3 text-[11px] font-medium tracking-[0.22em] uppercase motion-reduce:hidden"
		>
			Scroll to open
		</p>
		<h2 class="text-foreground text-3xl font-semibold tracking-tight md:text-5xl">
			Bring the whole picture<br />
			<span class="text-muted-foreground">into focus.</span>
		</h2>
	{/snippet}
	{#snippet cardContent()}
		<div
			class="@container flex size-full gap-2 bg-white p-2 text-[10px] leading-tight text-zinc-500 @lg:text-[11px] dark:bg-[#0b0b0c] dark:text-zinc-400"
		>
			<!-- Sidebar -->
			<aside class="{tray} hidden w-32 shrink-0 flex-col @xl:flex @3xl:w-40">
				<div class="{inner} flex flex-1 flex-col gap-0.5 p-2">
					<div class="mb-2 flex items-center gap-2 px-1 pt-1">
						<span class="size-3.5 rounded-[4px] bg-gradient-to-br from-[#8fb2ff] to-[#c3b1ff]"
						></span>
						<span class="font-semibold text-zinc-900 dark:text-zinc-100">Workspace</span>
					</div>
					{#each nav as item, i (item)}
						<span
							class={i === 0
								? "rounded-md bg-zinc-100 px-2 py-1.5 text-zinc-900 dark:bg-white/[0.05] dark:text-zinc-100"
								: "px-2 py-1.5"}>{item}</span
						>
					{/each}
					<div class="mt-auto px-1 pb-1">
						<div class="mb-1.5 flex justify-between">
							<span>Build minutes</span><span class="tabular-nums">68%</span>
						</div>
						<div class="h-1 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.06]">
							<div class="h-full w-2/3 rounded-full bg-[#8fb2ff]"></div>
						</div>
					</div>
				</div>
			</aside>

			<!-- Main -->
			<div class="flex min-w-0 flex-1 flex-col gap-2">
				<div class={tray}>
					<div class="{inner} flex items-center justify-between px-3 py-2">
						<span class="text-xs font-medium text-zinc-900 dark:text-zinc-100">Overview</span>
						<div class="flex items-center gap-2">
							<span
								class="hidden rounded-md border border-black/[0.06] px-2 py-1 @md:inline dark:border-white/[0.08]"
								>Search&nbsp;&nbsp;⌘K</span
							>
							<span
								class="size-5 rounded-full bg-gradient-to-br from-zinc-200 to-zinc-400 dark:from-zinc-600 dark:to-zinc-800"
							></span>
						</div>
					</div>
				</div>

				<div class="grid grid-cols-3 gap-2">
					{#each stats as s (s.label)}
						<div class={tray}>
							<div class="{inner} p-2.5">
								<div class="truncate">{s.label}</div>
								<div class="mt-1.5 flex items-end justify-between gap-2">
									<span
										class="text-sm font-semibold tracking-tight text-zinc-900 tabular-nums @2xl:text-lg dark:text-zinc-50"
										>{s.value}</span
									>
									<svg viewBox="0 0 70 20" class="hidden h-4 w-12 @2xl:block" aria-hidden="true">
										<path
											d={s.path}
											fill="none"
											stroke="#8fb2ff"
											stroke-width="1.5"
											stroke-linejoin="round"
										/>
									</svg>
								</div>
								<div class="mt-1 text-[10px]">{s.delta}</div>
							</div>
						</div>
					{/each}
				</div>

				<div class="flex min-h-0 flex-1 gap-2">
					<div class="{tray} flex min-h-0 min-w-0 flex-[3] flex-col">
						<div class="{inner} flex min-h-0 flex-1 flex-col p-3">
							<div class="flex items-center justify-between gap-2">
								<span class="text-zinc-900 dark:text-zinc-100">Requests</span>
								<span class="truncate">Last 14 days</span>
							</div>
							<svg
								viewBox="0 0 {w} {h}"
								preserveAspectRatio="none"
								class="mt-2 min-h-0 w-full flex-1"
								aria-hidden="true"
							>
								<defs>
									<linearGradient id="cs-demo-fill" x1="0" x2="0" y1="0" y2="1">
										<stop offset="0" stop-color="#8fb2ff" stop-opacity="0.32" />
										<stop offset="1" stop-color="#8fb2ff" stop-opacity="0" />
									</linearGradient>
								</defs>
								{#each [0.25, 0.5, 0.75] as g (g)}
									<line
										x1="0"
										x2={w}
										y1={h * g}
										y2={h * g}
										class="stroke-black/[0.06] dark:stroke-white/[0.06]"
										vector-effect="non-scaling-stroke"
									/>
								{/each}
								<path d={area} fill="url(#cs-demo-fill)" />
								<path
									d={line}
									fill="none"
									stroke="#8fb2ff"
									stroke-width="1.5"
									stroke-linejoin="round"
									vector-effect="non-scaling-stroke"
								/>
							</svg>
						</div>
					</div>

					<div class="{tray} hidden min-h-0 min-w-0 flex-[2] flex-col @lg:flex">
						<div class="{inner} flex flex-1 flex-col p-3">
							<span class="mb-1 text-zinc-900 dark:text-zinc-100">Recent deploys</span>
							{#each rows as r (r.name)}
								<div
									class="flex items-center justify-between gap-2 border-t border-black/[0.05] py-1.5 first-of-type:border-0 dark:border-white/[0.05]"
								>
									<span class="flex min-w-0 items-center gap-2">
										<span
											class="size-1.5 shrink-0 rounded-full {r.live
												? 'bg-emerald-400'
												: 'bg-amber-400'}"
										></span>
										<span class="truncate font-mono text-zinc-800 dark:text-zinc-200">{r.name}</span
										>
									</span>
									<span class="tabular-nums">{r.time}</span>
								</div>
							{/each}
						</div>
					</div>
				</div>
			</div>
		</div>
	{/snippet}
</ContainerScroll>

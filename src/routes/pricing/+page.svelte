<script lang="ts">
	import { SparklesText } from "$lib/fancy-ui/sparkles-text";
	import { GlowBorder } from "$lib/fancy-ui/glow-border";
	import { BorderBeam } from "$lib/fancy-ui/border-beam";
	import { ShimmerButton } from "$lib/fancy-ui/shimmer-button";
	import { Meteors } from "$lib/fancy-ui/meteors";
	import { NumberTicker } from "$lib/fancy-ui/number-ticker";
	import { RainbowButton } from "$lib/fancy-ui/rainbow-button";
	import { Check } from "@lucide/svelte";

	let annual = $state(false);

	const plans = [
		{
			name: "Hobby",
			tagline: "Perfect to get started",
			monthlyPrice: 0,
			annualPrice: 0,
			cta: "Get started free",
			ctaVariant: "default" as const,
			popular: false,
			features: [
				"50+ open-source components",
				"Svelte 5 runes syntax",
				"Tailwind CSS v4 support",
				"MIT license",
				"Community support",
				"Basic documentation",
			],
		},
		{
			name: "Pro",
			tagline: "For serious builders",
			monthlyPrice: 19,
			annualPrice: 12,
			cta: "Start free trial",
			ctaVariant: "popular" as const,
			popular: true,
			features: [
				"Everything in Hobby",
				"Premium component library",
				"Figma design files",
				"Priority support",
				"Early access to new components",
				"Discord community access",
				"Lifetime updates",
			],
		},
		{
			name: "Team",
			tagline: "For growing teams",
			monthlyPrice: 49,
			annualPrice: 32,
			cta: "Contact us",
			ctaVariant: "default" as const,
			popular: false,
			features: [
				"Everything in Pro",
				"Unlimited team seats",
				"White-label license",
				"Custom component requests",
				"Dedicated support channel",
				"On-boarding call",
				"SLA guarantee",
			],
		},
	];

	const faqs = [
		{
			q: "Can I use FancyUI in commercial projects?",
			a: "Yes. The open-source components are MIT licensed. Pro and Team plans extend this with a commercial white-label license.",
		},
		{
			q: "What happens after my free trial?",
			a: "After the 14-day trial your plan reverts to Hobby automatically — no credit card required to start.",
		},
		{
			q: "Do you offer refunds?",
			a: "We offer a 30-day no-questions-asked refund for all paid plans.",
		},
		{
			q: "Can I switch plans later?",
			a: "Absolutely. You can upgrade or downgrade at any time and we'll prorate the difference.",
		},
		{
			q: "Is there a student discount?",
			a: "Yes — reach out via Discord with proof of enrollment for 50% off the Pro plan.",
		},
	];

	let openFaq = $state<number | null>(null);

	const compareRows: [string, boolean, boolean, boolean][] = [
		["Open-source components", true, true, true],
		["Tailwind CSS v4", true, true, true],
		["Svelte 5 runes", true, true, true],
		["Premium components", false, true, true],
		["Figma design files", false, true, true],
		["Discord access", false, true, true],
		["White-label license", false, false, true],
		["Custom component requests", false, false, true],
		["Dedicated support", false, false, true],
		["SLA guarantee", false, false, true],
	];

	function getPrice(plan: (typeof plans)[0]) {
		if (plan.monthlyPrice === 0) return 0;
		return annual ? plan.annualPrice : plan.monthlyPrice;
	}
</script>

<svelte:head>
	<title>Pricing — FancyUI</title>
</svelte:head>

<!-- ── Page wrapper ──────────────────────────────────────────── -->
<div class="bg-background relative min-h-screen overflow-hidden">
	<!-- Subtle grid background -->
	<div
		class="pointer-events-none absolute inset-0 opacity-[0.03]"
		style="background-image: linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px); background-size: 48px 48px;"
	></div>

	<div class="relative mx-auto max-w-6xl px-4 py-24">
		<!-- ── Hero ─────────────────────────────────────────────── -->
		<div class="mb-16 text-center">
			<div class="mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm">
				<span class="h-2 w-2 animate-pulse rounded-full bg-emerald-400"></span>
				<span class="text-muted-foreground">No credit card required</span>
			</div>

			<h1 class="mb-4 text-5xl font-bold tracking-tight md:text-6xl">
				<SparklesText
					text="Simple pricing,"
					colors={{ first: "#a855f7", second: "#3b82f6" }}
					class="inline"
				/>
				<br />
				<span class="text-foreground">built to scale</span>
			</h1>

			<p class="text-muted-foreground mx-auto mt-4 max-w-xl text-lg">
				Start free. Ship faster. Upgrade when you're ready. All plans include access to the
				open-source component library.
			</p>

			<!-- Billing toggle -->
			<div
				role="group"
				aria-label="Billing period"
				class="mt-8 inline-flex items-center gap-4 rounded-full border px-2 py-1.5"
			>
				<button
					onclick={() => (annual = false)}
					aria-pressed={!annual}
					class="rounded-full px-4 py-1.5 text-sm font-medium transition-all {!annual
						? 'bg-foreground text-background shadow-sm'
						: 'text-muted-foreground hover:text-foreground'}"
				>
					Monthly
				</button>
				<button
					onclick={() => (annual = true)}
					aria-pressed={annual}
					class="flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-all {annual
						? 'bg-foreground text-background shadow-sm'
						: 'text-muted-foreground hover:text-foreground'}"
				>
					Annual
					<span
						class="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-400"
					>
						-35%
					</span>
				</button>
			</div>
		</div>

		<!-- ── Pricing cards ─────────────────────────────────────── -->
		<div class="mb-24 grid grid-cols-1 gap-6 md:grid-cols-3">
			{#each plans as plan}
				{@const price = getPrice(plan)}

				<div
					class="relative flex flex-col rounded-2xl border p-8 transition-all duration-300
					{plan.popular
						? 'bg-card border-transparent shadow-2xl shadow-purple-500/10'
						: 'bg-card/50 hover:bg-card'}"
				>
					<!-- Decorative effects on popular card -->
					{#if plan.popular}
						<GlowBorder
							color={["#a855f7", "#3b82f6", "#06b6d4"]}
							borderRadius={16}
							borderWidth={1}
						/>
						<BorderBeam size={250} duration={4} colorFrom="#a855f7" colorTo="#3b82f6" />

						<!-- Popular badge -->
						<div
							class="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 px-4 py-1 text-xs font-semibold text-white shadow-lg"
						>
							Most popular
						</div>
					{/if}

					<!-- Plan header -->
					<div class="mb-6">
						<h2 class="text-foreground mb-1 text-xl font-bold">{plan.name}</h2>
						<p class="text-muted-foreground text-sm">{plan.tagline}</p>
					</div>

					<!-- Price -->
					<div class="mb-8">
						{#if price === 0}
							<div class="flex items-end gap-1">
								<span class="text-foreground text-5xl font-bold tracking-tight">Free</span>
							</div>
							<p class="text-muted-foreground mt-1 text-sm">forever</p>
						{:else}
							<div class="flex items-end gap-1">
								<span class="text-muted-foreground mb-1 text-xl">$</span>
								<span class="text-foreground text-5xl font-bold tracking-tight">
									{#key annual}
										<NumberTicker value={price} duration={400} />
									{/key}
								</span>
								<span class="text-muted-foreground mb-1">/mo</span>
							</div>
							<p class="text-muted-foreground mt-1 text-sm">
								{#if annual}
									Billed annually · ${plan.annualPrice * 12}/yr
								{:else}
									Billed monthly
								{/if}
							</p>
						{/if}
					</div>

					<!-- CTA -->
					<div class="mb-8">
						{#if plan.popular}
							<RainbowButton class="w-full justify-center text-sm font-semibold">
								{plan.cta}
							</RainbowButton>
						{:else}
							<ShimmerButton
								class="w-full justify-center text-sm"
								shimmerColor={plan.name === "Team" ? "#a855f7" : "#6b7280"}
								background={plan.name === "Team"
									? "rgba(168, 85, 247, 0.08)"
									: "rgba(107, 114, 128, 0.08)"}
							>
								{plan.cta}
							</ShimmerButton>
						{/if}
					</div>

					<!-- Divider -->
					<div class="bg-border mb-6 h-px"></div>

					<!-- Features -->
					<ul class="flex flex-col gap-3">
						{#each plan.features as feature}
							<li class="flex items-start gap-3">
								<Check
									size={16}
									class="mt-0.5 shrink-0 {plan.popular ? 'text-purple-400' : 'text-emerald-400'}"
								/>
								<span class="text-muted-foreground text-sm">{feature}</span>
							</li>
						{/each}
					</ul>
				</div>
			{/each}
		</div>

		<!-- ── Social proof strip ────────────────────────────────── -->
		<div class="mb-24 text-center">
			<p class="text-muted-foreground mb-8 text-sm tracking-widest uppercase">
				Trusted by developers at
			</p>
			<div
				class="text-muted-foreground/40 flex flex-wrap items-center justify-center gap-10 text-lg font-bold tracking-tight"
			>
				{#each ["Vercel", "Netlify", "Supabase", "PlanetScale", "Railway", "Render"] as company}
					<span>{company}</span>
				{/each}
			</div>
		</div>

		<!-- ── Compare features table ────────────────────────────── -->
		<div class="mb-24">
			<h2 class="mb-10 text-center text-3xl font-bold">Compare plans</h2>
			<div class="overflow-x-auto rounded-2xl border">
				<table class="w-full text-sm">
					<thead>
						<tr class="bg-muted/50 border-b">
							<th class="px-6 py-4 text-left font-medium">Feature</th>
							{#each plans as plan}
								<th
									class="px-6 py-4 text-center font-semibold {plan.popular
										? 'text-purple-400'
										: 'text-foreground'}"
								>
									{plan.name}
								</th>
							{/each}
						</tr>
					</thead>
					<tbody class="divide-y">
						{#each compareRows as row}
							{@const [label, ...values] = row}
							<tr class="hover:bg-muted/30 transition-colors">
								<td class="text-muted-foreground px-6 py-3">{label}</td>
								{#each values as val}
									<td class="px-6 py-3 text-center">
										{#if val}
											<Check size={16} class="mx-auto text-emerald-400" />
										{:else}
											<span class="text-muted-foreground/30 text-lg leading-none">—</span>
										{/if}
									</td>
								{/each}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>

		<!-- ── FAQ ───────────────────────────────────────────────── -->
		<div class="mx-auto mb-24 max-w-2xl">
			<h2 class="mb-10 text-center text-3xl font-bold">Frequently asked questions</h2>
			<div class="flex flex-col gap-2">
				{#each faqs as faq, i}
					<div class="rounded-xl border transition-all">
						<button
							class="flex w-full items-center justify-between px-6 py-4 text-left text-sm font-medium"
							onclick={() => (openFaq = openFaq === i ? null : i)}
							aria-expanded={openFaq === i}
							aria-controls="faq-answer-{i}"
						>
							<span>{faq.q}</span>
							<span
								aria-hidden="true"
								class="text-muted-foreground ml-4 shrink-0 transition-transform duration-200 {openFaq ===
								i
									? 'rotate-45'
									: ''}"
							>
								+
							</span>
						</button>
						{#if openFaq === i}
							<div
								id="faq-answer-{i}"
								class="text-muted-foreground border-t px-6 py-4 text-sm leading-relaxed"
							>
								{faq.a}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</div>

		<!-- ── Bottom CTA ─────────────────────────────────────────── -->
		<div class="relative overflow-hidden rounded-2xl border p-12 text-center">
			<Meteors count={12} />
			<div class="relative z-10">
				<h2 class="mb-3 text-3xl font-bold">Ready to ship something beautiful?</h2>
				<p class="text-muted-foreground mb-8 text-base">
					Join thousands of developers building with FancyUI. Start for free, no credit card needed.
				</p>
				<div class="flex flex-wrap items-center justify-center gap-4">
					<RainbowButton>Get started for free</RainbowButton>
					<a
						href="/demo"
						class="text-muted-foreground hover:text-foreground text-sm font-medium underline-offset-4 hover:underline"
					>
						Browse components →
					</a>
				</div>
			</div>
		</div>
	</div>
</div>

<script lang="ts">
	import {
		FancyProvider,
		Button,
		Input,
		Textarea,
		Select,
		Checkbox,
		Radio,
		Switch,
		Slider,
		Badge,
		Tooltip,
		brutalSkin,
		glassSkin,
		terminalSkin,
	} from "$lib/cameleon";
	import type { Skin } from "$lib/cameleon";

	const skins: Skin[] = [brutalSkin, glassSkin, terminalSkin];
	let active = $state<Skin>(brutalSkin);

	const badgeVariants = ["blue", "red", "yellow", "green", "purple", "solid"] as const;
	const legend = [
		{ label: "DEFAULT", accent: "var(--skin-line)" },
		{ label: "HOVER", accent: "var(--skin-line)" },
		{ label: "ACTIVE", accent: "var(--skin-line)" },
		{ label: "FOCUS", accent: "var(--skin-blue)" },
		{ label: "DISABLED", accent: "color-mix(in srgb, var(--skin-line) 40%, transparent)" },
		{ label: "ERROR", accent: "var(--skin-red)" },
	];
</script>

<svelte:head>
	<title>Cameleon Engine — Design System</title>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Archivo:wght@400..900&family=Space+Mono:wght@400;700&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

{#snippet shead(num: string, title: string, accent: string, right?: string)}
	<div class="ds-shead">
		<div class="ds-dot" style="background:{accent};"></div>
		<div class="ds-num">/ {num}</div>
		<div class="ds-title">{title}</div>
		{#if right}<div style="flex:1;"></div>
			<div class="ds-mono" style="font-size:9px;">{right}</div>{/if}
	</div>
{/snippet}

{#snippet divider(name: string, note?: string)}
	<div class="ds-divider">
		<div class="ds-mono" style="font-size:9px;font-weight:700;letter-spacing:0.1em;opacity:0.6;">
			{name}
		</div>
		<div class="line"></div>
		{#if note}<div class="ds-mono" style="font-size:8px;">{note}</div>{/if}
	</div>
{/snippet}

<div class="mx-auto max-w-6xl px-6 py-12">
	<!-- Chrome (neutral, outside the provider) -->
	<div class="mb-6 flex flex-wrap items-center justify-between gap-4">
		<div>
			<p class="text-muted-foreground font-mono text-xs tracking-widest uppercase">
				Cameleon Engine · one API, many worlds
			</p>
			<h1 class="text-foreground text-2xl font-bold">Design System — live re-skin</h1>
		</div>
		<div class="flex flex-wrap gap-2">
			{#each skins as skin (skin.name)}
				<button
					onclick={() => (active = skin)}
					class="rounded-full border px-4 py-1.5 text-sm font-medium transition-colors {active.name ===
					skin.name
						? 'bg-foreground text-background border-foreground'
						: 'border-border text-muted-foreground hover:text-foreground'}"
				>
					{skin.label}
				</button>
			{/each}
		</div>
	</div>

	<!-- The whole documentation page re-skins inside the provider -->
	<FancyProvider skin={active} class="ds-page rounded-2xl p-[26px]">
		<!-- Header banner -->
		<div class="ds-card ds-banner">
			<div class="ds-logo">RH</div>
			<div>
				<div style="font-size:24px;font-weight:900;letter-spacing:-0.025em;line-height:1;">
					{active.label} System — Tokens &amp; Components
				</div>
				<div class="ds-mono" style="font-size:9.5px;letter-spacing:0.1em;margin-top:5px;">
					CAMELEON ENGINE · SAME API · {active.name.toUpperCase()} ART DIRECTION · 2026
				</div>
			</div>
			<div style="flex:1;"></div>
			<div style="display:flex;gap:6px;">
				{#each ["var(--skin-blue)", "var(--skin-red)", "var(--skin-yellow)", "var(--skin-green)", "var(--skin-purple)"] as c}
					<div class="ds-chip-sm" style="background:{c};"></div>
				{/each}
			</div>
		</div>

		<!-- /01 Color tokens -->
		<div class="ds-card">
			{@render shead("01", "Color tokens", "var(--skin-blue)")}
			<div class="ds-swatches">
				{#each active.meta.palette as p}
					<div class="ds-swatch">
						<div class="chip" style="background:{p.value};"></div>
						<div class="meta">
							<div style="font-size:11px;font-weight:800;">{p.name}</div>
							<div class="ds-mono" style="font-size:8px;margin-top:2px;">
								{p.value}{#if p.note}<br />{p.note}{/if}
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- /02 Typography + /03 Grid -->
		<div class="ds-two">
			<div class="ds-card">
				{@render shead("02", "Typography scale", "var(--skin-red)")}
				<div style="display:flex;flex-direction:column;gap:12px;">
					{#each active.meta.type as t}
						<div class="ds-type-row">
							<div style={t.style}>{t.sample}</div>
							<div style="flex:1;"></div>
							<div class="ds-mono" style="font-size:8.5px;text-align:right;max-width:40%;">
								{t.spec}
							</div>
						</div>
					{/each}
				</div>
			</div>
			<div class="ds-card">
				{@render shead("03", "Grid, radius & borders", "var(--skin-yellow)")}
				<div
					class="ds-mono"
					style="font-size:8.5px;font-weight:700;letter-spacing:0.1em;margin-bottom:8px;"
				>
					RADIUS
				</div>
				<div style="display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap;">
					{#each active.meta.specs.radius as r}
						<div style="text-align:center;">
							<div class="ds-radius" style="border-radius:{r.size};"></div>
							<div class="ds-mono" style="font-size:8px;margin-top:3px;">{r.size} {r.label}</div>
						</div>
					{/each}
				</div>
				<div
					class="ds-mono"
					style="font-size:8.5px;font-weight:700;letter-spacing:0.1em;margin:14px 0 8px;"
				>
					BORDER · SHADOW · SPACING
				</div>
				<div class="ds-mono" style="font-size:8.5px;line-height:1.6;opacity:0.75;">
					<div>BORDER — {active.meta.specs.border}</div>
					<div>SHADOW REST — {active.meta.specs.shadowRest}</div>
					<div>SHADOW HOVER — {active.meta.specs.shadowHover}</div>
					<div>SPACING — {active.meta.specs.spacing}</div>
				</div>
			</div>
		</div>

		<!-- /04 Components (presentational, token-driven) -->
		<div class="ds-card">
			{@render shead("04", "Components", "var(--skin-green)")}
			<div class="ds-comp-grid">
				<!-- Nav cards -->
				<div style="display:flex;flex-direction:column;gap:8px;">
					<div class="ds-mono" style="font-size:8.5px;font-weight:700;letter-spacing:0.1em;">
						NAV CARD
					</div>
					<div class="ds-nav" style="background:var(--skin-blue);color:#fff;">
						<div class="row">
							<span class="ds-mono" style="font-size:10px;color:#fff;">01</span><span class="arrow"
								>↗</span
							>
						</div>
						<div style="font-size:15px;font-weight:800;">About Me</div>
					</div>
					<div class="ds-nav" style="background:var(--skin-card);">
						<div class="row">
							<span class="ds-mono" style="font-size:10px;">06</span><span class="arrow">↗</span>
						</div>
						<div style="font-size:15px;font-weight:800;">More</div>
					</div>
				</div>
				<!-- Section card + timeline -->
				<div style="display:flex;flex-direction:column;gap:8px;">
					<div class="ds-mono" style="font-size:8.5px;font-weight:700;letter-spacing:0.1em;">
						SECTION + TIMELINE
					</div>
					<div class="ds-sec">
						<div class="row">
							<div class="ds-chip-sm" style="background:var(--skin-red);"></div>
							<div style="font-size:13px;font-weight:800;letter-spacing:0.06em;">EXPERIENCE</div>
							<div style="flex:1;"></div>
							<div class="ds-mono" style="font-size:9px;">/ 02</div>
						</div>
						<div class="ds-slot">CONTENT SLOT</div>
					</div>
					<div style="display:grid;grid-template-columns:16px 1fr;column-gap:9px;">
						<div class="ds-tl-dot"></div>
						<div>
							<div style="font-size:12.5px;font-weight:800;">Job title — Company</div>
							<div class="ds-mono" style="font-size:8.5px;margin-top:2px;">LOCATION · META</div>
						</div>
					</div>
				</div>
				<!-- Project card + pills -->
				<div style="display:flex;flex-direction:column;gap:8px;">
					<div class="ds-mono" style="font-size:8.5px;font-weight:700;letter-spacing:0.1em;">
						PROJECT CARD
					</div>
					<div class="ds-proj">
						<div class="ds-icon" style="background:var(--skin-blue);color:#fff;">F</div>
						<div>
							<div style="font-size:15px;font-weight:850;">FancyUI</div>
							<div class="ds-tag" style="color:var(--skin-blue);border-color:var(--skin-blue);">
								DESIGN SYSTEM
							</div>
						</div>
						<div style="font-size:11.5px;line-height:1.45;font-weight:500;opacity:0.9;">
							One-to-two line description.
						</div>
						<div style="display:flex;flex-wrap:wrap;gap:4px;">
							<div class="ds-pill">Angular</div>
							<div class="ds-pill">TypeScript</div>
						</div>
					</div>
				</div>
				<!-- Contact + CTA -->
				<div style="display:flex;flex-direction:column;gap:8px;">
					<div class="ds-mono" style="font-size:8.5px;font-weight:700;letter-spacing:0.1em;">
						CONTACT · CTA
					</div>
					<div class="ds-contact">
						<span class="ds-kbd">MAIL</span><span style="font-size:11px;font-weight:700;"
							>rama.herbin@gmail.com</span
						>
					</div>
					<div
						class="ds-contact"
						style="background:var(--skin-ink,var(--skin-line));color:var(--skin-card);"
					>
						<span
							class="ds-kbd"
							style="background:var(--skin-card);color:var(--skin-ink,var(--skin-line));">GIT</span
						>
						<span style="font-size:11px;font-weight:700;">github.com/ramaherbin</span>
					</div>
					<div class="ds-strip" style="background:var(--skin-yellow);">
						<div
							style="width:8px;height:8px;background:var(--skin-line);transform:rotate(45deg);"
						></div>
						<div style="font-size:10.5px;font-weight:750;">CTA strip — statement + pill</div>
						<div style="flex:1;"></div>
						<div
							style="background:var(--skin-line);color:var(--skin-card);border-radius:999px;padding:4px 9px;font-size:8.5px;font-weight:750;"
						>
							Let's build
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- /05 Responsive -->
		<div class="ds-card">
			{@render shead("05", "Responsive variants", "var(--skin-purple)")}
			<div class="ds-resp">
				{#each active.meta.responsive as r}
					<div>
						<div class="ds-resp-mock"></div>
						<div class="ds-mono" style="font-size:8px;margin-top:5px;">
							<b>{r.label}</b> — {r.note}
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- /06 Core components -->
		<div class="ds-card">
			{@render shead("06", "Core components", "var(--skin-blue)", "10 CONTROLS · 6 STATES")}
			<!-- state legend -->
			<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:18px;">
				{#each legend as s}
					<div class="ds-legend">
						<div class="ds-chip-xs" style="background:{s.accent};"></div>
						{s.label}
					</div>
				{/each}
			</div>

			<div style="display:flex;flex-direction:column;gap:20px;">
				<!-- BUTTON -->
				<div class="ds-ctrl">
					{@render divider("BUTTON", "PILL · HARD-SHADOW LIFT")}
					<div class="ds-cells" style="gap:22px;">
						<div class="ds-cell"><Button>Button</Button><span class="ds-cap">DEFAULT ✦</span></div>
						<div class="ds-cell">
							<Button demoState="hover">Button</Button><span class="ds-cap">HOVER</span>
						</div>
						<div class="ds-cell">
							<Button demoState="active">Button</Button><span class="ds-cap">ACTIVE</span>
						</div>
						<div class="ds-cell">
							<Button demoState="focus">Button</Button><span class="ds-cap">FOCUS</span>
						</div>
						<div class="ds-cell">
							<Button disabled>Button</Button><span class="ds-cap">DISABLED</span>
						</div>
						<div class="ds-cell">
							<Button variant="destructive">Delete</Button><span class="ds-cap">ERROR</span>
						</div>
					</div>
				</div>

				<!-- INPUT -->
				<div class="ds-ctrl">
					{@render divider("INPUT", "TEXT FIELD")}
					<div class="ds-cells">
						<div class="ds-cell ds-w">
							<Input value="Lyon, France" /><span class="ds-cap">DEFAULT ✦</span>
						</div>
						<div class="ds-cell ds-w">
							<Input value="Lyon, France" demoState="hover" /><span class="ds-cap">HOVER</span>
						</div>
						<div class="ds-cell ds-w">
							<Input value="Lyon, France" demoState="active" /><span class="ds-cap">ACTIVE</span>
						</div>
						<div class="ds-cell ds-w">
							<Input value="Lyon, France" demoState="focus" /><span class="ds-cap">FOCUS</span>
						</div>
						<div class="ds-cell ds-w">
							<Input value="Lyon, France" disabled /><span class="ds-cap">DISABLED</span>
						</div>
						<div class="ds-cell ds-w">
							<Input value="Lyon" error /><span class="ds-cap" style="color:var(--skin-red);"
								>ERROR</span
							>
						</div>
					</div>
				</div>

				<!-- SELECT -->
				<div class="ds-ctrl">
					{@render divider("SELECT", "DROPDOWN · CHEVRON")}
					<div class="ds-cells">
						{#each [["DEFAULT ✦", undefined, false], ["HOVER", "hover", false], ["ACTIVE", "active", false], ["FOCUS", "focus", false], ["DISABLED", undefined, false]] as [cap, ds]}
							<div class="ds-cell ds-w">
								<Select value="frontend" demoState={ds as any} disabled={cap === "DISABLED"}>
									<option value="frontend">Front-end</option>
									<option value="backend">Back-end</option>
								</Select><span class="ds-cap">{cap}</span>
							</div>
						{/each}
						<div class="ds-cell ds-w">
							<Select value="frontend" error>
								<option value="frontend">Front-end</option>
							</Select><span class="ds-cap" style="color:var(--skin-red);">ERROR</span>
						</div>
					</div>
				</div>

				<!-- CHECKBOX + RADIO -->
				<div class="ds-two">
					<div class="ds-ctrl">
						{@render divider("CHECKBOX")}
						<div class="ds-cells">
							<div class="ds-cell"><Checkbox /><span class="ds-cap">DEFAULT</span></div>
							<div class="ds-cell">
								<Checkbox demoState="hover" /><span class="ds-cap">HOVER</span>
							</div>
							<div class="ds-cell"><Checkbox checked /><span class="ds-cap">ON</span></div>
							<div class="ds-cell">
								<Checkbox checked demoState="focus" /><span class="ds-cap">FOCUS</span>
							</div>
							<div class="ds-cell">
								<Checkbox checked disabled /><span class="ds-cap">DISABLED</span>
							</div>
							<div class="ds-cell">
								<Checkbox error /><span class="ds-cap" style="color:var(--skin-red);">ERROR</span>
							</div>
						</div>
					</div>
					<div class="ds-ctrl">
						{@render divider("RADIO")}
						<div class="ds-cells">
							<div class="ds-cell">
								<Radio group="a" value="b" /><span class="ds-cap">DEFAULT</span>
							</div>
							<div class="ds-cell">
								<Radio group="a" value="b" demoState="hover" /><span class="ds-cap">HOVER</span>
							</div>
							<div class="ds-cell"><Radio group="a" value="a" /><span class="ds-cap">ON</span></div>
							<div class="ds-cell">
								<Radio group="a" value="a" demoState="focus" /><span class="ds-cap">FOCUS</span>
							</div>
							<div class="ds-cell">
								<Radio group="a" value="a" disabled /><span class="ds-cap">DISABLED</span>
							</div>
							<div class="ds-cell">
								<Radio group="a" value="b" error /><span
									class="ds-cap"
									style="color:var(--skin-red);">ERROR</span
								>
							</div>
						</div>
					</div>
				</div>

				<!-- SWITCH + SLIDER -->
				<div class="ds-two">
					<div class="ds-ctrl">
						{@render divider("SWITCH", "ON = ACCENT")}
						<div class="ds-cells">
							<div class="ds-cell"><Switch /><span class="ds-cap">OFF</span></div>
							<div class="ds-cell">
								<Switch checked demoState="hover" /><span class="ds-cap">HOVER / ON</span>
							</div>
							<div class="ds-cell"><Switch checked /><span class="ds-cap">ON</span></div>
							<div class="ds-cell">
								<Switch checked demoState="focus" /><span class="ds-cap">FOCUS</span>
							</div>
							<div class="ds-cell">
								<Switch checked disabled /><span class="ds-cap">DISABLED</span>
							</div>
							<div class="ds-cell">
								<Switch error /><span class="ds-cap" style="color:var(--skin-red);">ERROR</span>
							</div>
						</div>
					</div>
					<div class="ds-ctrl">
						{@render divider("SLIDER", "LIVE ✦")}
						<div class="ds-cells" style="gap:20px;">
							<div class="ds-cell"><Slider value={52} /><span class="ds-cap">DEFAULT ✦</span></div>
							<div class="ds-cell">
								<Slider value={52} disabled /><span class="ds-cap">DISABLED</span>
							</div>
							<div class="ds-cell">
								<Slider value={52} error /><span class="ds-cap" style="color:var(--skin-red);"
									>ERROR</span
								>
							</div>
						</div>
					</div>
				</div>

				<!-- TEXTAREA -->
				<div class="ds-ctrl">
					{@render divider("TEXTAREA", "MULTI-LINE")}
					<div class="ds-cells">
						<div class="ds-cell ds-w2">
							<Textarea value="Front-end engineer focused on design systems." rows={2} /><span
								class="ds-cap">DEFAULT</span
							>
						</div>
						<div class="ds-cell ds-w2">
							<Textarea
								value="Front-end engineer focused on design systems."
								rows={2}
								demoState="focus"
							/><span class="ds-cap">FOCUS</span>
						</div>
						<div class="ds-cell ds-w2">
							<Textarea
								value="Front-end engineer focused on design systems."
								rows={2}
								disabled
							/><span class="ds-cap">DISABLED</span>
						</div>
						<div class="ds-cell ds-w2">
							<Textarea value="Too short." rows={2} error /><span
								class="ds-cap"
								style="color:var(--skin-red);">ERROR</span
							>
						</div>
					</div>
				</div>

				<!-- BADGE + TOOLTIP -->
				<div class="ds-two">
					<div class="ds-ctrl">
						{@render divider("BADGE")}
						<div class="ds-cells" style="gap:14px;">
							<div class="ds-cell"><Badge>Label</Badge><span class="ds-cap">DEFAULT</span></div>
							<div class="ds-cell">
								<Badge demoState="hover">Label</Badge><span class="ds-cap">HOVER</span>
							</div>
							<div class="ds-cell">
								<Badge demoState="active">Label</Badge><span class="ds-cap">ACTIVE</span>
							</div>
							<div class="ds-cell">
								<Badge demoState="focus">Label</Badge><span class="ds-cap">FOCUS</span>
							</div>
							<div class="ds-cell">
								<Badge demoState="disabled">Label</Badge><span class="ds-cap">DISABLED</span>
							</div>
							<div class="ds-cell">
								<Badge demoState="error">Error</Badge><span
									class="ds-cap"
									style="color:var(--skin-red);">ERROR</span
								>
							</div>
						</div>
						<div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:8px;">
							{#each badgeVariants as v}<Badge variant={v}>{v}</Badge>{/each}
						</div>
					</div>
					<div class="ds-ctrl">
						{@render divider("TOOLTIP", "ON HOVER / FOCUS")}
						<div
							style="display:flex;flex-direction:column;gap:40px;padding-top:40px;align-items:center;"
						>
							<div class="ds-cell" style="align-items:center;">
								<Tooltip content="Design systems & UI" demoOpen /><span class="ds-cap">DEFAULT</span
								>
							</div>
							<div class="ds-cell" style="align-items:center;">
								<Tooltip content="Focus-triggered" demoState="focus" demoOpen /><span
									class="ds-cap"
									style="color:var(--skin-blue);">FOCUS</span
								>
							</div>
							<div class="ds-cell" style="align-items:center;">
								<Tooltip content="Something went wrong" demoState="error" demoOpen>!</Tooltip><span
									class="ds-cap"
									style="color:var(--skin-red);">ERROR</span
								>
							</div>
						</div>
					</div>
				</div>
			</div>
			<div class="ds-mono" style="font-size:9px;margin-top:16px;line-height:1.5;">
				✦ = LIVE — HOVER, PRESS &amp; TAB IT. Other cells force the state statically. Same markup,
				no per-skin code.
			</div>
		</div>
	</FancyProvider>
</div>

<style>
	:global(.ds-page) {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
	.ds-card {
		background: var(--skin-card, transparent);
		border: 1.5px solid var(--skin-line, currentColor);
		border-radius: 14px;
		padding: 20px 24px;
		box-shadow: 0 10px 18px rgba(0, 0, 0, 0.06);
	}
	.ds-banner {
		display: flex;
		align-items: center;
		gap: 14px;
	}
	.ds-logo {
		width: 44px;
		height: 44px;
		flex: none;
		background: var(--skin-line, currentColor);
		color: var(--skin-card);
		border-radius: 10px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: var(--skin-font-mono, monospace);
		font-size: 16px;
		font-weight: 700;
	}
	.ds-shead {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-bottom: 16px;
	}
	.ds-dot {
		width: 13px;
		height: 13px;
		border-radius: 3px;
		border: 1.5px solid var(--skin-line, currentColor);
		flex: none;
	}
	.ds-num {
		font-family: var(--skin-font-mono, monospace);
		font-size: 10px;
		font-weight: 700;
		opacity: 0.5;
	}
	.ds-title {
		font-size: 20px;
		font-weight: 850;
		letter-spacing: -0.015em;
	}
	.ds-mono {
		font-family: var(--skin-font-mono, monospace);
		opacity: 0.55;
	}
	.ds-chip-sm {
		width: 18px;
		height: 18px;
		border: 1.5px solid var(--skin-line, currentColor);
		border-radius: 4px;
		flex: none;
	}
	.ds-chip-xs {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		flex: none;
	}
	.ds-two {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 14px;
	}
	.ds-swatches {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(96px, 1fr));
		gap: 8px;
	}
	.ds-swatch {
		border: 1.5px solid var(--skin-line, currentColor);
		border-radius: 10px;
		overflow: hidden;
	}
	.ds-swatch .chip {
		height: 52px;
		border-bottom: 1.5px solid var(--skin-line, currentColor);
	}
	.ds-swatch .meta {
		padding: 7px 9px;
	}
	.ds-type-row {
		display: flex;
		align-items: baseline;
		gap: 14px;
		border-bottom: 1px solid color-mix(in srgb, var(--skin-line, currentColor) 20%, transparent);
		padding-bottom: 10px;
	}
	.ds-radius {
		width: 44px;
		height: 34px;
		border: 1.5px solid var(--skin-line, currentColor);
		background: var(--skin-surface, transparent);
	}
	.ds-divider {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 10px;
	}
	.ds-divider .line {
		flex: 1;
		height: 1px;
		background: color-mix(in srgb, var(--skin-line, currentColor) 30%, transparent);
	}
	.ds-cells {
		display: flex;
		flex-wrap: wrap;
		gap: 16px;
		align-items: flex-start;
	}
	.ds-cell {
		display: flex;
		flex-direction: column;
		gap: 8px;
		align-items: flex-start;
	}
	.ds-w {
		width: 150px;
	}
	.ds-w2 {
		width: 190px;
	}
	.ds-cap {
		font-family: var(--skin-font-mono, monospace);
		font-size: 8px;
		font-weight: 700;
		letter-spacing: 0.06em;
		opacity: 0.55;
	}
	.ds-legend {
		display: flex;
		align-items: center;
		gap: 6px;
		font-family: var(--skin-font-mono, monospace);
		font-size: 8px;
		font-weight: 700;
		letter-spacing: 0.06em;
		border: 1.4px solid var(--skin-line, currentColor);
		border-radius: 999px;
		padding: 3px 9px;
		background: var(--skin-surface, transparent);
	}
	/* /04 component showcase */
	.ds-comp-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 12px;
		align-items: start;
	}
	.ds-nav {
		border: 1.5px solid var(--skin-line, currentColor);
		border-radius: 12px;
		padding: 11px 13px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	.ds-nav .row {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.ds-nav .arrow {
		font-weight: 700;
	}
	.ds-sec {
		border: 1.5px solid var(--skin-line, currentColor);
		border-radius: 14px;
		padding: 13px 15px;
	}
	.ds-sec .row {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.ds-slot {
		margin-top: 10px;
		height: 40px;
		border: 1.5px dashed color-mix(in srgb, var(--skin-line, currentColor) 40%, transparent);
		border-radius: 9px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: var(--skin-font-mono, monospace);
		font-size: 8.5px;
		opacity: 0.5;
	}
	.ds-tl-dot {
		width: 13px;
		height: 13px;
		border-radius: 50%;
		background: var(--skin-blue);
		border: 1.5px solid var(--skin-line, currentColor);
		margin-top: 2px;
	}
	.ds-proj {
		border: 1.5px solid var(--skin-line, currentColor);
		border-radius: 14px;
		background: var(--skin-surface, transparent);
		padding: 14px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.ds-icon {
		width: 38px;
		height: 38px;
		border: 1.5px solid var(--skin-line, currentColor);
		border-radius: 9px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: var(--skin-font-mono, monospace);
		font-size: 16px;
		font-weight: 700;
	}
	.ds-tag {
		display: inline-block;
		font-family: var(--skin-font-mono, monospace);
		font-size: 7.8px;
		font-weight: 700;
		border: 1.3px solid currentColor;
		border-radius: 999px;
		padding: 2px 7px;
		letter-spacing: 0.05em;
		margin-top: 4px;
	}
	.ds-pill {
		padding: 2px 8px;
		border: 1.3px solid var(--skin-line, currentColor);
		border-radius: 999px;
		font-size: 9.5px;
		font-weight: 700;
		background: var(--skin-card, transparent);
	}
	.ds-contact {
		display: flex;
		align-items: center;
		gap: 7px;
		border: 1.5px solid var(--skin-line, currentColor);
		border-radius: 10px;
		background: var(--skin-card, transparent);
		padding: 8px 11px;
	}
	.ds-kbd {
		font-family: var(--skin-font-mono, monospace);
		font-size: 8px;
		font-weight: 700;
		background: var(--skin-line, currentColor);
		color: var(--skin-card);
		padding: 2px 5px;
		border-radius: 4px;
		letter-spacing: 0.06em;
	}
	.ds-strip {
		border: 1.5px solid var(--skin-line, currentColor);
		border-radius: 10px;
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 11px;
	}
	.ds-resp {
		display: grid;
		grid-template-columns: 1.5fr 1fr 0.6fr;
		gap: 12px;
		align-items: start;
	}
	.ds-resp-mock {
		height: 120px;
		border: 1.5px solid var(--skin-line, currentColor);
		border-radius: 10px;
		background: repeating-linear-gradient(
			45deg,
			color-mix(in srgb, var(--skin-line, currentColor) 8%, transparent) 0,
			color-mix(in srgb, var(--skin-line, currentColor) 8%, transparent) 8px,
			transparent 8px,
			transparent 16px
		);
	}
	.ds-ctrl {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
</style>

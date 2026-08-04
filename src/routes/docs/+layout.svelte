<script lang="ts">
	import { page } from "$app/stores";
	import Sidebar from "$lib/components/docs/Sidebar.svelte";
	import DocHeader from "$lib/components/docs/DocHeader.svelte";
	import TableOfContents from "$lib/components/docs/TableOfContents.svelte";
	import CommandSearch from "$lib/components/docs/CommandSearch.svelte";
	import RetroTaskbar from "$lib/components/docs/retro/RetroTaskbar.svelte";
	import { FancyProvider, brutalSkin, defaultSkin, retroOsSkin, type Skin } from "$lib/cameleon";
	import { createSkinState, t, type DocsSkin } from "$lib/stores";
	import { nextDocsPage } from "$lib/components/docs/docs-nav.js";
	import "$lib/components/docs/docs-skin.css";

	let { children } = $props();

	let sidebarOpen = $state(false);
	let searchOpen = $state(false);

	const skinState = createSkinState();
	const standardSkin: Skin = { ...defaultSkin, name: "standard", tokens: {}, fonts: undefined };
	const SKINS: Record<DocsSkin, Skin> = {
		standard: standardSkin,
		brutal: brutalSkin,
		"retro-os": retroOsSkin,
	};
	const activeSkin = $derived(SKINS[skinState.skin]);
	const isRetro = $derived(skinState.skin === "retro-os");
	const isBrutal = $derived(skinState.skin === "brutal");

	/* Brutal rail: the reference shows a NEXT PAGE card under the TOC. */
	const railNext = $derived(isBrutal ? nextDocsPage($page.url.pathname) : undefined);
</script>

{#snippet docBody()}
	<div class="docs-shell mx-auto max-w-7xl px-4 py-8 lg:px-8">
		<div class="docs-content-row flex gap-10">
			<!-- Main content -->
			<main class="min-w-0 flex-1" data-doc-content>
				{@render children()}
			</main>

			<!-- TOC + rail extras -->
			<div class="docs-rail hidden w-48 shrink-0 xl:block">
				<TableOfContents />
				{#if isBrutal}
					<!-- Brutal-only rail: NEXT PAGE card + footer stamp (docs-skin brutal region). -->
					{#if railNext}
						<a class="docs-rail-next" href={railNext.href}>
							<span class="docs-rail-next-marker" aria-hidden="true"></span>
							<span class="docs-rail-next-text">
								<span class="docs-rail-next-eyebrow">{t("rail.nextPage")}</span>
								<span class="docs-rail-next-name">{railNext.name}</span>
							</span>
							<svg
								class="docs-rail-next-arrow"
								width="11"
								height="11"
								viewBox="0 0 14 14"
								aria-hidden="true"
							>
								<path
									d="M3 11 L11 3 M4.5 3 L11 3 L11 9.5"
									fill="none"
									stroke="currentColor"
									stroke-width="1.9"
									stroke-linecap="round"
									stroke-linejoin="round"
								/>
							</svg>
						</a>
					{/if}
					<div class="docs-rail-stamp" aria-hidden="true">FANCYUI DOCS — 2026</div>
				{/if}
			</div>
		</div>
	</div>
{/snippet}

<FancyProvider skin={activeSkin} class="docs-skin min-h-svh">
	{#if isRetro}
		<!-- Retro OS: desk + window frame; menubar spans the frame, the explorer
		     sidebar joins the body grid, and the taskbar sits in-flow at the
		     window's bottom edge. Styled by skins/retro-os/*. -->
		<div class="retro-desktop">
			<div class="retro-frame">
				<DocHeader
					onMenuClick={() => (sidebarOpen = !sidebarOpen)}
					onSearchClick={() => (searchOpen = true)}
				/>
				<div class="retro-body">
					<Sidebar bind:open={sidebarOpen} onclose={() => (sidebarOpen = false)} />
					<div class="retro-main">
						{@render docBody()}
					</div>
				</div>
				<RetroTaskbar />
			</div>
		</div>
	{:else}
		<Sidebar bind:open={sidebarOpen} onclose={() => (sidebarOpen = false)} />

		<div class="lg:ps-64">
			<DocHeader
				onMenuClick={() => (sidebarOpen = !sidebarOpen)}
				onSearchClick={() => (searchOpen = true)}
			/>
			{@render docBody()}
		</div>
	{/if}

	<CommandSearch bind:open={searchOpen} />
</FancyProvider>

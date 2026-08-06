<script lang="ts">
	import { page } from "$app/stores";
	import { categories, getComponentsGroupedByCategory } from "$lib/fancy-ui/registry.js";
	// `MessageKey` went with develop's `tCategory`, which now owns category labels.
	import { t, tCategory, createSkinState } from "$lib/stores";
	import { GITHUB_URL, PACKAGE_VERSION } from "$lib/site.js";

	const skinState = createSkinState();
	const isRetro = $derived(skinState.skin === "retro-os");
	const isBrutal = $derived(skinState.skin === "brutal");

	interface Props {
		open?: boolean;
		onclose?: () => void;
	}

	let { open = $bindable(false), onclose }: Props = $props();

	const grouped = getComponentsGroupedByCategory();

	const gettingStartedLinks = [
		{ href: "/docs/getting-started/introduction", key: "page.introduction" },
		{ href: "/docs/getting-started/installation", key: "page.installation" },
		{ href: "/docs/getting-started/theming", key: "page.theming" },
		{ href: "/docs/getting-started/theme-generator", key: "page.themeGenerator" },
		{ href: "/docs/getting-started/changelog", key: "page.changelog" },
	] as const;

	let collapsedCategories = $state<Set<string>>(new Set());

	function toggleCategory(cat: string) {
		const next = new Set(collapsedCategories);
		if (next.has(cat)) next.delete(cat);
		else next.add(cat);
		collapsedCategories = next;
	}

	function isActive(href: string): boolean {
		return $page.url.pathname === href;
	}
</script>

<!-- Mobile overlay -->
{#if open}
	<button
		class="fixed inset-0 z-40 bg-black/50 lg:hidden"
		onclick={onclose}
		aria-label={t("a11y.closeSidebar")}
	></button>
{/if}

<aside
	class="border-sidebar-border bg-sidebar text-sidebar-foreground fixed start-0 top-0 z-50 flex h-full w-64 flex-col border-e transition-transform duration-300 lg:translate-x-0 rtl:lg:translate-x-0 {open
		? 'translate-x-0'
		: '-translate-x-full rtl:translate-x-full'}"
>
	<!-- The two wrapper layers exist for the retro-os floating-window treatment
	     (ink clip-path layer + paper layer); they are display:contents by
	     default so every other skin keeps the aside's own flex column. -->
	<div class="retro-explorer-window">
		<div class="retro-explorer-inner">
			<!-- Header -->
			{#if isRetro}
				<div class="retro-explorer-bar shrink-0">
					<span class="retro-explorer-chip" aria-hidden="true">NAV</span>
					<a href="/docs" class="retro-explorer-title" onclick={onclose}>{t("retro.explorer")}</a>
				</div>
			{:else if isBrutal}
				<!-- Brutal brand block: ink FU tile + stacked mono sub-line. -->
				<a href="/docs" class="docs-brand" onclick={onclose}>
					<span class="docs-brand-logo" aria-hidden="true">FU</span>
					<span class="docs-brand-text">
						<span class="docs-brand-name">FancyUI</span>
						<span class="docs-brand-sub">{t("nav.docsSuffix")} · V{PACKAGE_VERSION}</span>
					</span>
				</a>
			{:else}
				<div
					class="border-sidebar-border flex h-14 shrink-0 items-center justify-between border-b px-4"
				>
					<a href="/docs" class="text-lg font-semibold tracking-tight" onclick={onclose}>
						FancyUI <span class="text-muted-foreground text-xs font-normal"
							>{t("nav.docsSuffix")}</span
						>
					</a>
				</div>
			{/if}

			<!-- Nav -->
			<nav class="flex-1 overflow-y-auto px-3 py-4">
				<!-- Getting Started -->
				<div class="mb-6" data-category="getting-started">
					<!-- Not a heading: the sidebar renders before the page <h1>, so a real
				     heading here would open the document outline above the page title. -->
					<p
						data-category="getting-started"
						class="text-sidebar-foreground/50 mb-1 px-2 text-xs font-semibold tracking-wider uppercase"
					>
						{t("nav.gettingStarted")}
					</p>
					<ul>
						{#each gettingStartedLinks as link}
							<li>
								<a
									href={link.href}
									onclick={onclose}
									class="block rounded-md px-2 py-1.5 text-sm transition-colors {isActive(link.href)
										? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
										: 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'}"
								>
									{t(link.key)}
								</a>
							</li>
						{/each}
					</ul>
				</div>

				<!-- Components link -->
				<div class="docs-nav-components mb-2">
					<a
						href="/docs/components"
						onclick={onclose}
						class="block rounded-md px-2 py-1.5 text-xs font-semibold tracking-wider uppercase transition-colors {isActive(
							'/docs/components'
						)
							? 'text-sidebar-accent-foreground'
							: 'text-sidebar-foreground/50 hover:text-sidebar-foreground/70'}"
					>
						{t("nav.components")}
					</a>
				</div>

				<!-- Categories -->
				{#each categories as category}
					{@const items = grouped[category]}
					{#if items.length > 0}
						{@const collapsed = collapsedCategories.has(category)}
						<div class="mb-2" data-category={category}>
							<button
								onclick={() => toggleCategory(category)}
								data-category={category}
								class="text-sidebar-foreground/50 hover:text-sidebar-foreground/70 flex w-full items-center justify-between px-2 py-1 text-xs font-semibold tracking-wider uppercase"
							>
								{tCategory(category)}
								<svg
									class="docs-nav-chevron h-3 w-3 transition-transform {collapsed
										? ''
										: 'rotate-90'}"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M9 5l7 7-7 7"
									/>
								</svg>
							</button>
							{#if !collapsed}
								<ul>
									{#each items as comp}
										<li>
											<a
												href="/docs/components/{comp.slug}"
												onclick={onclose}
												class="block rounded-md px-2 py-1.5 text-sm transition-colors {isActive(
													`/docs/components/${comp.slug}`
												)
													? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
													: 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'}"
											>
												{comp.name}
											</a>
										</li>
									{/each}
								</ul>
							{/if}
						</div>
					{/if}
				{/each}
			</nav>

			{#if isBrutal}
				<!-- Brutal-only footer card (reference R6). -->
				<a class="docs-sidebar-cta" href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
					<span class="docs-sidebar-cta-marker" aria-hidden="true"></span>
					<span class="docs-sidebar-cta-text">
						<span class="docs-sidebar-cta-title">{t("sidebar.starTitle")}</span>
						<span class="docs-sidebar-cta-sub">{t("sidebar.starBody")}</span>
					</span>
					<svg width="12" height="12" viewBox="0 0 14 14" aria-hidden="true">
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
		</div>
	</div>
</aside>

<style>
	/* Inert wrappers by default; the retro-os skin turns them into the ink +
	   paper clip-path layers of the floating explorer window. */
	.retro-explorer-window,
	.retro-explorer-inner {
		display: contents;
	}
</style>

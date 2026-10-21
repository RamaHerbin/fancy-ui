<script lang="ts">
	import { page } from "$app/stores";
	import { t, createSkinState } from "$lib/stores";
	import ThemeSwitcher from "$lib/components/docs/ThemeSwitcher.svelte";
	import SkinSwitcher from "$lib/components/docs/SkinSwitcher.svelte";
	import LanguageSwitcher from "$lib/components/docs/LanguageSwitcher.svelte";
	import GitHubStars from "$lib/components/docs/GitHubStars.svelte";
	import Logo from "$lib/components/Logo.svelte";
	import { getComponent } from "$lib/fancy-ui/registry.js";
	import { getRecipe } from "$lib/docs/recipes/registry.js";
	import { GITHUB_URL } from "$lib/site.js";
	import { SoundToggle } from "$lib/fancy-ui/sound/index.js";

	interface Props {
		onMenuClick?: () => void;
		onSearchClick?: () => void;
	}

	let { onMenuClick, onSearchClick }: Props = $props();

	const skinState = createSkinState();
	const isRetro = $derived(skinState.skin === "retro-os");

	const GETTING_STARTED_KEYS: Record<string, string> = {
		introduction: "page.introduction",
		installation: "page.installation",
		theming: "page.theming",
		"theme-generator": "page.themeGenerator",
		changelog: "page.changelog",
	};

	function titleCase(slug: string) {
		return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
	}

	/** Human label for one path segment, given the section it sits under. */
	function labelFor(section: string | undefined, index: number, part: string): string {
		if (index === 0) {
			if (part === "getting-started") return t("nav.gettingStarted");
			if (part === "components") return t("nav.components");
			if (part === "recipes") return t("nav.recipes");
			return titleCase(part);
		}
		if (section === "components") return getComponent(part)?.name ?? titleCase(part);
		if (section === "recipes") return getRecipe(part)?.title ?? titleCase(part);
		if (section === "getting-started") {
			const key = GETTING_STARTED_KEYS[part];
			return key ? t(key as Parameters<typeof t>[0]) : titleCase(part);
		}
		return titleCase(part);
	}

	let breadcrumbs = $derived.by(() => {
		const path = $page.url.pathname;
		const parts = path
			.replace(/^\/docs\/?/, "")
			.split("/")
			.filter(Boolean);
		return parts.map((part, i) => ({
			label: labelFor(parts[0], i, part),
			href: "/docs/" + parts.slice(0, i + 1).join("/"),
			current: i === parts.length - 1,
		}));
	});
</script>

<header
	class="border-border bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-30 flex h-14 items-center gap-2 border-b px-4 backdrop-blur sm:gap-3"
>
	<!-- Mobile hamburger -->
	<button
		class="border-border text-foreground flex h-9 w-9 items-center justify-center rounded-md border lg:hidden"
		onclick={onMenuClick}
		aria-label={t("a11y.toggleSidebar")}
	>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="18"
			height="18"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
		>
			<line x1="4" x2="20" y1="12" y2="12" />
			<line x1="4" x2="20" y1="6" y2="6" />
			<line x1="4" x2="20" y1="18" y2="18" />
		</svg>
	</button>

	<!-- Retro OS brand (menubar) -->
	{#if isRetro}
		<a href="/" class="retro-brand" aria-label={t("nav.backToSite")}>
			<span class="retro-pixel-logo" aria-hidden="true">
				<span></span><span></span><span></span><span></span>
			</span>
			<span class="retro-brand-name" aria-hidden="true"
				>FANCYUI<span class="retro-brand-ext"> — DOCS.EXE</span></span
			>
		</a>
	{/if}

	<!-- Logo: the sidebar carries the brand from lg up. Retro shows its menubar
	     wordmark (a link too) from sm up, so the logo only covers phones there. -->
	<a
		href="/"
		data-docs-logo
		class="docs-header-logo text-foreground flex shrink-0 items-center {isRetro
			? 'sm:hidden'
			: 'lg:hidden'}"
		aria-label={t("nav.backToSite")}
	>
		<Logo size={22} />
	</a>

	<!-- Breadcrumbs -->
	<nav
		aria-label={t("a11y.docsBreadcrumb")}
		class="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden text-sm whitespace-nowrap"
	>
		<!-- Phone widths keep only the current page; the sidebar holds the rest. -->
		{#each breadcrumbs as crumb, i}
			{#if i > 0}
				<span class="retro-crumb-sep text-muted-foreground/50 hidden sm:inline" aria-hidden="true"
					>/</span
				>
			{/if}
			{#if crumb.current}
				<span class="text-foreground truncate font-medium" aria-current="page">{crumb.label}</span>
			{:else}
				<a
					href={crumb.href}
					class="text-muted-foreground hover:text-foreground hidden transition-colors sm:inline"
				>
					{crumb.label}
				</a>
			{/if}
		{/each}
	</nav>

	<!-- Right side -->
	<div class="ms-auto flex shrink-0 items-center justify-end gap-2">
		<!-- Search trigger: icon only below sm -->
		<button
			onclick={onSearchClick}
			class="docs-search-icon border-border text-foreground flex h-9 w-9 items-center justify-center rounded-md border sm:hidden"
			aria-label={t("a11y.search")}
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="16"
				height="16"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				<circle cx="11" cy="11" r="8" />
				<path d="m21 21-4.3-4.3" />
			</svg>
		</button>

		<!-- Search trigger -->
		<button
			onclick={onSearchClick}
			class="retro-search docs-search border-border bg-muted/50 text-muted-foreground hover:bg-muted hidden items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors sm:flex"
		>
			<svg
				class="retro-search-icon"
				xmlns="http://www.w3.org/2000/svg"
				width="14"
				height="14"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<circle cx="11" cy="11" r="8" />
				<path d="m21 21-4.3-4.3" />
			</svg>
			<span class="retro-search-label">{t("header.search")}</span>
			<kbd class="border-border bg-background rounded border px-1.5 py-0.5 font-mono text-[10px]">
				{"\u2318"}K
			</kbd>
		</button>

		<!-- GitHub: out of the phone row, where the current crumb needs the room. -->
		<a
			href={GITHUB_URL}
			target="_blank"
			rel="noopener noreferrer"
			class="retro-gh docs-gh text-muted-foreground hover:text-foreground hidden h-9 items-center gap-1.5 rounded-md px-2 transition-colors sm:flex"
			aria-label={t("a11y.github")}
		>
			<svg class="retro-gh-icon" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
				<path
					d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"
				/>
			</svg>
			<!-- Phones drop the whole link (see above); the count never shows there. -->
			<GitHubStars class="hidden text-xs sm:inline-flex" />
		</a>

		<!-- display:contents wrapper — a grouping hook for the retro-os menubar. -->
		<div class="retro-menubar-tools">
			<!-- Sound is opt-in: this switch is the only way the docs ever make a sound. -->
			<SoundToggle label={t("a11y.sound")} class="hidden sm:inline-flex" />
			<LanguageSwitcher />
			<SkinSwitcher />
			<ThemeSwitcher />
		</div>
	</div>
</header>

<style>
	.retro-menubar-tools {
		display: contents;
	}
</style>

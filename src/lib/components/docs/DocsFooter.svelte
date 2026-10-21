<!--
	DocsFooter — the quiet end of every docs page: the three package versions
	(each a link to its changelog entry), the project links, one install line that
	follows the framework store, and the license. Colours come from the active
	skin's tokens; the skins only change the rule above it and the type.
-->
<script lang="ts">
	import { onMount } from "svelte";
	import { t } from "$lib/stores";
	import { createFrameworkState, type Framework } from "$lib/stores/framework.svelte.js";
	import {
		CODE_OF_CONDUCT_URL,
		CONTRIBUTING_URL,
		DISCUSSIONS_URL,
		GITHUB_URL,
		ISSUES_URL,
		LICENSE_URL,
		PACKAGE_NAME,
		PACKAGE_VERSION,
		REACT_PACKAGE_NAME,
		REACT_PACKAGE_VERSION,
		SECURITY_URL,
		VUE_PACKAGE_NAME,
		VUE_PACKAGE_VERSION,
	} from "$lib/site.js";

	const CHANGELOG_HREF = "/docs/getting-started/changelog";
	/** Release heading ids: `v0-16-0`, prefixed with the package id past the first list. */
	const anchor = (version: string, prefix = "") => `${prefix}v${version.replaceAll(".", "-")}`;

	const VERSIONS = [
		{
			name: PACKAGE_NAME,
			version: PACKAGE_VERSION,
			href: `${CHANGELOG_HREF}#${anchor(PACKAGE_VERSION)}`,
		},
		{
			name: REACT_PACKAGE_NAME,
			version: REACT_PACKAGE_VERSION,
			href: `${CHANGELOG_HREF}#${anchor(REACT_PACKAGE_VERSION, "react-")}`,
		},
		{
			name: VUE_PACKAGE_NAME,
			version: VUE_PACKAGE_VERSION,
			href: `${CHANGELOG_HREF}#${anchor(VUE_PACKAGE_VERSION, "vue-")}`,
		},
	];

	const PACKAGE_BY_FRAMEWORK: Record<Framework, string> = {
		svelte: PACKAGE_NAME,
		react: REACT_PACKAGE_NAME,
		vue: VUE_PACKAGE_NAME,
	};

	const links = $derived([
		{ label: t("footer.contribute"), href: CONTRIBUTING_URL, external: true },
		{ label: t("footer.issues"), href: ISSUES_URL, external: true },
		{ label: t("footer.discussions"), href: DISCUSSIONS_URL, external: true },
		{ label: t("footer.security"), href: SECURITY_URL, external: true },
		{ label: t("footer.conduct"), href: CODE_OF_CONDUCT_URL, external: true },
		{ label: t("footer.changelog"), href: CHANGELOG_HREF, external: false },
	]);

	// Same hydration rule as the site footer: render Svelte until mounted.
	const store = createFrameworkState();
	let mounted = $state(false);
	onMount(() => (mounted = true));
	const current = $derived<Framework>(mounted ? store.framework : "svelte");
</script>

<footer class="docs-footer border-border text-muted-foreground mt-16 border-t pt-6 text-sm">
	<div class="flex flex-wrap items-center gap-x-6 gap-y-3">
		<ul class="flex flex-wrap items-center gap-2" aria-label={t("footer.versions")}>
			{#each VERSIONS as v (v.name)}
				<li>
					<a
						href={v.href}
						class="docs-footer-chip border-border hover:text-foreground inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-xs transition-colors"
						>{v.name} <span class="text-foreground">{v.version}</span></a
					>
				</li>
			{/each}
		</ul>
		<code
			class="docs-footer-install bg-muted text-foreground rounded px-2 py-1 font-mono text-xs"
			data-docs-footer-install
			aria-label={t("footer.install")}>$ pnpm add {PACKAGE_BY_FRAMEWORK[current]}</code
		>
	</div>

	<nav class="mt-4 flex flex-wrap gap-x-5 gap-y-2" aria-label={t("footer.docs")}>
		{#each links as link (link.href)}
			<a
				href={link.href}
				class="hover:text-foreground transition-colors"
				target={link.external ? "_blank" : undefined}
				rel={link.external ? "noopener noreferrer" : undefined}>{link.label}</a
			>
		{/each}
	</nav>

	<p class="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
		<a href={LICENSE_URL} class="hover:text-foreground" target="_blank" rel="noopener noreferrer"
			>{t("footer.license")}</a
		>
		<a href={GITHUB_URL} class="hover:text-foreground" target="_blank" rel="noopener noreferrer"
			>GitHub</a
		>
	</p>
</footer>

<style>
	:global(.docs-skin[data-skin="brutal"]) .docs-footer {
		border-top-width: 3px;
		border-color: var(--foreground);
		font-family: var(--font-mono, ui-monospace, monospace);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}
	:global(.docs-skin[data-skin="brutal"]) .docs-footer-install {
		text-transform: none;
	}
	:global(.docs-skin[data-skin="brutal"]) .docs-footer-chip {
		text-transform: none;
		border-radius: 0;
		border-width: 2px;
	}
	:global(.docs-skin[data-skin="retro-os"]) .docs-footer {
		font-family: var(--font-mono, ui-monospace, monospace);
		border-top-style: double;
		border-top-width: 3px;
	}
	:global(.docs-skin[data-skin="retro-os"]) .docs-footer-chip {
		border-radius: 0;
	}
</style>

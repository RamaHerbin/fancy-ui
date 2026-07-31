<script lang="ts">
	/**
	 * Docs breadcrumb trail: Home → Components → current page.
	 *
	 * The visible trail is localized; the machine-readable BreadcrumbList that
	 * search engines read is emitted separately as JSON-LD by the page.
	 */
	import { t } from "$lib/stores";

	interface Props {
		/** Label of the page being shown — the last crumb, not a link. */
		current: string;
	}

	let { current }: Props = $props();
</script>

<nav aria-label={t("a11y.breadcrumb")} class="mb-4">
	<ol class="text-muted-foreground flex flex-wrap items-center gap-1.5 text-xs">
		<li>
			<a href="/" class="hover:text-foreground transition-colors">{t("nav.home")}</a>
		</li>
		<li aria-hidden="true" class="opacity-40 select-none">/</li>
		<li>
			<a href="/docs/components" class="hover:text-foreground transition-colors">
				{t("nav.components")}
			</a>
		</li>
		<li aria-hidden="true" class="opacity-40 select-none">/</li>
		<li class="text-foreground font-medium" aria-current="page">{current}</li>
	</ol>
</nav>

<script lang="ts">
	import { page } from "$app/stores";
	import { t, getLocale, createSkinState } from "$lib/stores";

	interface Props {
		/** Collapsed `<details>` variant for widths below xl, where the rail is hidden. */
		compact?: boolean;
	}

	let { compact = false }: Props = $props();

	const skinState = createSkinState();
	const isRetro = $derived(skinState.skin === "retro-os");

	interface Heading {
		id: string;
		text: string;
		level: number;
	}

	let headings = $state<Heading[]>([]);
	let activeId = $state("");

	let observer: IntersectionObserver | null = null;

	const SELECTOR =
		"[data-doc-content] h2:not([data-toc-ignore]), [data-doc-content] h3:not([data-toc-ignore])";

	let scannedKey = "";

	function headingId(el: HTMLElement) {
		return el.id || el.textContent?.toLowerCase().replace(/\s+/g, "-") || "";
	}

	function currentKey() {
		return Array.from(document.querySelectorAll<HTMLElement>(SELECTOR), headingId).join("\n");
	}

	function scan() {
		observer?.disconnect();
		const elements = document.querySelectorAll<HTMLElement>(SELECTOR);

		headings = Array.from(elements).map((el) => ({
			id: headingId(el),
			text: el.textContent || "",
			level: parseInt(el.tagName[1]),
		}));
		scannedKey = headings.map((h) => h.id).join("\n");

		// Ensure IDs exist
		elements.forEach((el, i) => {
			if (!el.id) el.id = headings[i].id;
		});

		// The compact list has no active item to track.
		if (compact) return;

		observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						activeId = entry.target.id;
						break;
					}
				}
			},
			{ rootMargin: "-80px 0px -60% 0px" }
		);

		elements.forEach((el) => observer!.observe(el));
	}

	$effect(() => {
		// Re-run when the route OR the locale changes (localized prose swaps in place).
		void $page.url.pathname;
		void getLocale();

		// Clean up previous observer
		observer?.disconnect();
		observer = null;

		let rescan: ReturnType<typeof setTimeout> | undefined;
		let mutations: MutationObserver | undefined;

		// Tick delay so new page content is rendered
		const timeout = setTimeout(() => {
			scan();

			// A page can replace its own headings without a navigation (the changelog
			// swaps its whole release list when the package tab changes): follow them.
			// Only child changes count; giving a heading an id is an attribute change.
			const root = document.querySelector("[data-doc-content]");
			if (root && typeof MutationObserver !== "undefined") {
				mutations = new MutationObserver(() => {
					clearTimeout(rescan);
					// Demo content churns the subtree all the time: only a different
					// set of headings is worth recreating the observers.
					rescan = setTimeout(() => {
						if (currentKey() !== scannedKey) scan();
					}, 50);
				});
				mutations.observe(root, { childList: true, subtree: true });
			}
		}, 100);

		return () => {
			clearTimeout(timeout);
			clearTimeout(rescan);
			mutations?.disconnect();
			observer?.disconnect();
		};
	});
</script>

{#if headings.length > 0 && compact}
	<details
		data-toc-compact
		class="docs-toc-compact border-border bg-muted/30 mb-6 rounded-md border xl:hidden"
	>
		<summary
			class="docs-toc-compact-summary text-foreground cursor-pointer px-3 py-2 text-sm font-medium"
		>
			{t("toc.onThisPage")}
		</summary>
		<ul class="docs-toc-list space-y-1 px-3 pt-1 pb-3">
			{#each headings as heading}
				<li style:padding-inline-start="{(heading.level - 2) * 12}px">
					<a
						href="#{heading.id}"
						class="text-muted-foreground hover:text-foreground block py-1 text-sm transition-colors"
					>
						{heading.text}
					</a>
				</li>
			{/each}
		</ul>
	</details>
{:else if headings.length > 0}
	<nav class="hidden xl:block">
		<div class="docs-toc sticky top-20" class:retro-toc={isRetro}>
			{#if isRetro}
				<div class="retro-toc-title">{t("toc.onThisPage")}</div>
			{:else}
				<h4
					class="docs-toc-title text-foreground mb-3 text-xs font-semibold tracking-wider uppercase"
				>
					{t("toc.onThisPage")}
				</h4>
			{/if}
			<ul class="docs-toc-list space-y-1" class:retro-toc-list={isRetro}>
				{#each headings as heading}
					<li style:padding-left="{(heading.level - 2) * 12}px">
						<a
							href="#{heading.id}"
							class="block py-1 text-xs transition-colors {activeId === heading.id
								? 'text-foreground font-medium'
								: 'text-muted-foreground hover:text-foreground'}"
						>
							{heading.text}
						</a>
					</li>
				{/each}
			</ul>
		</div>
	</nav>
{/if}

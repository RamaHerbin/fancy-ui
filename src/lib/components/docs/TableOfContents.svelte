<script lang="ts">
	import { page } from "$app/stores";
	import { t, getLocale, createSkinState } from "$lib/stores";

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

	function scan() {
		observer?.disconnect();
		const elements = document.querySelectorAll<HTMLElement>(SELECTOR);

		headings = Array.from(elements).map((el) => ({
			id: el.id || el.textContent?.toLowerCase().replace(/\s+/g, "-") || "",
			text: el.textContent || "",
			level: parseInt(el.tagName[1]),
		}));

		// Ensure IDs exist
		elements.forEach((el, i) => {
			if (!el.id) el.id = headings[i].id;
		});

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
					rescan = setTimeout(scan, 50);
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

{#if headings.length > 0}
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

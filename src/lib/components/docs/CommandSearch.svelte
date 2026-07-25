<script lang="ts">
	import { goto } from "$app/navigation";
	import { searchComponents, getAllComponents } from "$lib/fancy-ui/registry.js";
	import { t, tCategory } from "$lib/stores";

	interface Props {
		open?: boolean;
		onclose?: () => void;
	}

	let { open = $bindable(false), onclose }: Props = $props();

	let query = $state("");
	let selectedIndex = $state(0);
	let inputEl = $state<HTMLInputElement | null>(null);

	const gettingStartedPages = [
		{
			nameKey: "page.introduction",
			slug: "introduction",
			href: "/docs/getting-started/introduction",
		},
		{
			nameKey: "page.installation",
			slug: "installation",
			href: "/docs/getting-started/installation",
		},
		{ nameKey: "page.theming", slug: "theming", href: "/docs/getting-started/theming" },
		{
			nameKey: "page.themeGenerator",
			slug: "theme-generator",
			href: "/docs/getting-started/theme-generator",
		},
		{ nameKey: "page.changelog", slug: "changelog", href: "/docs/getting-started/changelog" },
	] as const;

	let results = $derived.by(() => {
		const q = query.trim().toLowerCase();
		const gsCategory = t("nav.gettingStarted");
		const pageResult = (p: (typeof gettingStartedPages)[number]) => ({
			name: t(p.nameKey),
			slug: p.slug,
			href: p.href,
			category: gsCategory,
			type: "page" as const,
		});
		if (!q) {
			return [
				...gettingStartedPages.map(pageResult),
				...getAllComponents()
					.slice(0, 8)
					.map((c) => ({
						name: c.name,
						slug: c.slug,
						href: `/docs/components/${c.slug}`,
						category: tCategory(c.category),
						type: "component" as const,
					})),
			];
		}

		const pages = gettingStartedPages
			.filter((p) => t(p.nameKey).toLowerCase().includes(q) || p.slug.includes(q))
			.map(pageResult);

		const components = searchComponents(q)
			.slice(0, 10)
			.map((c) => ({
				name: c.name,
				slug: c.slug,
				href: `/docs/components/${c.slug}`,
				category: tCategory(c.category),
				type: "component" as const,
			}));

		return [...pages, ...components];
	});

	function navigate(href: string) {
		open = false;
		query = "";
		onclose?.();
		goto(href);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === "ArrowDown") {
			e.preventDefault();
			selectedIndex = Math.min(selectedIndex + 1, results.length - 1);
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			selectedIndex = Math.max(selectedIndex - 1, 0);
		} else if (e.key === "Enter" && results[selectedIndex]) {
			e.preventDefault();
			navigate(results[selectedIndex].href);
		} else if (e.key === "Escape") {
			open = false;
			onclose?.();
		}
	}

	$effect(() => {
		if (open && inputEl) {
			requestAnimationFrame(() => inputEl?.focus());
		}
	});

	$effect(() => {
		query;
		selectedIndex = 0;
	});

	// Global keybinding
	$effect(() => {
		function handleGlobalKey(e: KeyboardEvent) {
			if ((e.metaKey || e.ctrlKey) && e.key === "k") {
				e.preventDefault();
				open = !open;
			}
		}
		document.addEventListener("keydown", handleGlobalKey);
		return () => document.removeEventListener("keydown", handleGlobalKey);
	});
</script>

{#if open}
	<!-- Backdrop -->
	<div class="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm">
		<button
			class="absolute inset-0"
			onclick={() => {
				open = false;
				onclose?.();
			}}
			aria-label="Close search"
		></button>
	</div>

	<!-- Dialog -->
	<div class="fixed inset-x-0 top-[15%] z-[70] mx-auto w-full max-w-lg px-4">
		<div
			class="bg-popover border-border overflow-hidden rounded-xl border shadow-2xl"
			role="dialog"
		>
			<!-- Input -->
			<div class="border-border flex items-center gap-3 border-b px-4">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					class="text-muted-foreground shrink-0"
				>
					<circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
				</svg>
				<input
					bind:this={inputEl}
					bind:value={query}
					onkeydown={handleKeydown}
					type="text"
					placeholder={t("search.placeholder")}
					class="text-foreground placeholder:text-muted-foreground h-12 w-full bg-transparent text-sm outline-none"
				/>
				<kbd
					class="border-border bg-muted text-muted-foreground rounded border px-1.5 py-0.5 font-mono text-[10px]"
					>{t("search.esc")}</kbd
				>
			</div>

			<!-- Results -->
			<div class="max-h-[300px] overflow-y-auto p-2">
				{#if results.length === 0}
					<p class="text-muted-foreground px-3 py-6 text-center text-sm">{t("search.noResults")}</p>
				{:else}
					{#each results as result, i}
						<button
							onclick={() => navigate(result.href)}
							onmouseenter={() => (selectedIndex = i)}
							class="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition-colors {selectedIndex ===
							i
								? 'bg-accent text-accent-foreground'
								: 'text-foreground'}"
						>
							<div class="flex items-center gap-3">
								{#if result.type === "page"}
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="14"
										height="14"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										class="text-muted-foreground shrink-0"
									>
										<path
											d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"
										/><path d="M14 2v6h6" />
									</svg>
								{:else}
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="14"
										height="14"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										class="text-muted-foreground shrink-0"
									>
										<rect width="7" height="7" x="3" y="3" rx="1" /><rect
											width="7"
											height="7"
											x="14"
											y="3"
											rx="1"
										/><rect width="7" height="7" x="14" y="14" rx="1" /><rect
											width="7"
											height="7"
											x="3"
											y="14"
											rx="1"
										/>
									</svg>
								{/if}
								<span>{result.name}</span>
							</div>
							<span class="text-muted-foreground text-xs">{result.category}</span>
						</button>
					{/each}
				{/if}
			</div>
		</div>
	</div>
{/if}

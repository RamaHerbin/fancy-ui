<script lang="ts">
	import { examplesRegistry } from "./examples/registry.js";
	import ComponentPreview from "./ComponentPreview.svelte";
	import PreviewBoundary from "./PreviewBoundary.svelte";
	import PreviewError from "./PreviewError.svelte";
	import { hasSoundProp } from "$lib/fancy-ui/registry.js";
	import { t } from "$lib/stores";

	interface Props {
		slug: string;
		/** False for React/Vue: the example sources are Svelte, so only the live previews show. */
		showCode?: boolean;
	}

	let { slug, showCode = true }: Props = $props();

	let soundCapable = $derived(hasSoundProp(slug));

	// Raw example source is inlined at build time so the titles, descriptions and snippets are
	// part of the prerendered HTML. The [slug] page eager-globs these same modules, so this
	// resolves to the same Vite modules rather than a second copy.
	const rawSources = import.meta.glob("$lib/components/docs/examples/**/*.svelte", {
		query: "?raw",
		import: "default",
		eager: true,
	}) as Record<string, string>;

	// The runnable examples stay lazy: only the visited slug pays for their JS.
	const liveModules = import.meta.glob("$lib/components/docs/examples/**/*.svelte");

	interface Example {
		path: string;
		title: string;
		description?: string;
		code: string;
	}

	let examples = $derived(
		(examplesRegistry[slug] ?? []).reduce<Example[]>((acc, entry) => {
			const path = `/src/lib/components/docs/examples/${slug}/${entry.name}.svelte`;
			const code = rawSources[path];
			if (code) acc.push({ path, title: entry.title, description: entry.description, code });
			return acc;
		}, [])
	);

	// Plain maps, deliberately outside the reactive graph: reading them must not make the
	// effect below depend on its own writes.
	const loaded = new Map<string, unknown>();
	const failedImports = new Set<string>();
	let liveComponents = $state<Record<string, unknown>>({});
	let failed = $state<Record<string, true>>({});

	// Each example loads on its own: one broken chunk must not hold back, or take down, the
	// others. A failure shows the error state in that example's frame and logs the real error;
	// the source stays readable in the Code tab.
	$effect(() => {
		const wanted = examples.map((e) => e.path);
		let cancelled = false;

		liveComponents = Object.fromEntries(
			wanted.filter((path) => loaded.has(path)).map((path) => [path, loaded.get(path)])
		);
		failed = Object.fromEntries(
			wanted.filter((path) => failedImports.has(path)).map((path) => [path, true as const])
		);

		for (const path of wanted) {
			if (loaded.has(path) || failedImports.has(path)) continue;
			const load = liveModules[path];
			if (!load) continue;
			load().then(
				(mod) => {
					const component = (mod as { default: unknown }).default;
					loaded.set(path, component);
					if (!cancelled) liveComponents = { ...liveComponents, [path]: component };
				},
				(e: unknown) => {
					console.error(`[docs] example "${path}" failed to load`, e);
					failedImports.add(path);
					if (!cancelled) failed = { ...failed, [path]: true };
				}
			);
		}

		return () => {
			cancelled = true;
		};
	});
</script>

{#if examples.length > 0}
	<section class="mb-10">
		<h2 class="text-foreground mb-6 text-xl font-semibold" id="examples">{t("comp.examples")}</h2>

		{#if !showCode}
			<p class="text-muted-foreground mb-6 text-sm" data-snippet-missing>
				{t("comp.snippetSvelteOnly")}
			</p>
		{/if}

		<div class="space-y-8">
			{#each examples as example (example.path)}
				<div>
					<h3
						class="text-foreground mb-2 text-base font-semibold"
						id="example-{example.title.toLowerCase().replace(/\s+/g, '-')}"
					>
						{example.title}
					</h3>
					{#if example.description}
						<p class="text-muted-foreground mb-3 text-sm">{example.description}</p>
					{/if}
					<ComponentPreview code={showCode ? example.code : ""} sound={soundCapable}>
						{#snippet preview()}
							{@const Live = liveComponents[example.path] as any}
							{#if Live}
								<PreviewBoundary source={example.path}>
									<Live />
								</PreviewBoundary>
							{:else if failed[example.path]}
								<PreviewError kind="import" />
							{/if}
						{/snippet}
					</ComponentPreview>
				</div>
			{/each}
		</div>
	</section>
{/if}

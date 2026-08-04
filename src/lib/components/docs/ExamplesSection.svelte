<script lang="ts">
	import { examplesRegistry } from "./examples/registry.js";
	import ComponentPreview from "./ComponentPreview.svelte";
	import { t } from "$lib/stores";

	interface Props {
		slug: string;
	}

	let { slug }: Props = $props();

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

	// Plain map, deliberately outside the reactive graph: reading it must not make the effect
	// below depend on its own writes.
	const loaded = new Map<string, unknown>();
	let liveComponents = $state<Record<string, unknown>>({});

	$effect(() => {
		const wanted = examples.map((e) => e.path);
		let cancelled = false;

		Promise.all(
			wanted.map(async (path) => {
				if (loaded.has(path)) return;
				const load = liveModules[path];
				if (!load) return;
				try {
					loaded.set(path, ((await load()) as { default: unknown }).default);
				} catch {
					// An example that fails to load keeps its placeholder; the source stays readable.
				}
			})
		).then(() => {
			if (cancelled) return;
			liveComponents = Object.fromEntries(
				wanted.filter((path) => loaded.has(path)).map((path) => [path, loaded.get(path)])
			);
		});

		return () => {
			cancelled = true;
		};
	});
</script>

{#if examples.length > 0}
	<section class="mb-10">
		<h2 class="text-foreground mb-6 text-xl font-semibold" id="examples">{t("comp.examples")}</h2>

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
					<ComponentPreview code={example.code}>
						{#snippet preview()}
							{@const Live = liveComponents[example.path] as any}
							{#if Live}
								<Live />
							{/if}
						{/snippet}
					</ComponentPreview>
				</div>
			{/each}
		</div>
	</section>
{/if}

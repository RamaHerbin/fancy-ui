<script lang="ts">
	import { examplesRegistry } from "./examples/registry.js";
	import ComponentPreview from "./ComponentPreview.svelte";

	interface Props {
		slug: string;
	}

	let { slug }: Props = $props();

	const modules = import.meta.glob("$lib/components/docs/examples/**/*.svelte");
	const rawModules = import.meta.glob("$lib/components/docs/examples/**/*.svelte", {
		query: "?raw",
		import: "default",
	}) as Record<string, () => Promise<string>>;

	interface LoadedExample {
		title: string;
		description?: string;
		component: any;
		code: string;
	}

	let examples = $state<LoadedExample[]>([]);
	let loading = $state(true);

	$effect(() => {
		const currentSlug = slug;
		examples = [];
		loading = true;

		const meta = examplesRegistry[currentSlug];
		if (!meta || meta.length === 0) {
			loading = false;
			return;
		}

		Promise.all(
			meta.map(async (entry) => {
				const path = `/src/lib/components/docs/examples/${currentSlug}/${entry.name}.svelte`;
				const loader = modules[path];
				const rawLoader = rawModules[path];
				if (!loader || !rawLoader) return null;

				const [mod, raw] = await Promise.all([loader(), rawLoader()]);
				return {
					title: entry.title,
					description: entry.description,
					component: (mod as any).default,
					code: raw,
				};
			})
		)
			.then((results) => {
				if (slug === currentSlug) {
					examples = results.filter((r) => r !== null) as LoadedExample[];
					loading = false;
				}
			})
			.catch(() => {
				if (slug === currentSlug) {
					loading = false;
				}
			});
	});
</script>

{#if !loading && examples.length > 0}
	<section class="mb-10">
		<h2 class="text-foreground mb-6 text-xl font-semibold" id="examples">Examples</h2>

		<div class="space-y-8">
			{#each examples as example}
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
							<example.component />
						{/snippet}
					</ComponentPreview>
				</div>
			{/each}
		</div>
	</section>
{/if}

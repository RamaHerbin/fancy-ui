<script lang="ts">
	import { getAllRecipes } from "$lib/docs/recipes/registry.js";
	import { getComponent } from "$lib/fancy-ui/registry.js";
	import Seo from "$lib/components/Seo.svelte";
	import { t, docTitle } from "$lib/stores";

	const recipes = getAllRecipes();
</script>

<Seo title={docTitle(t("recipes.title"))} description={t("recipes.lead")} path="/docs/recipes" />

<div class="max-w-3xl">
	<div class="mb-8">
		<h1 class="text-foreground mb-2 text-3xl font-bold tracking-tight" id="recipes">
			{t("recipes.title")}
		</h1>
		<p class="text-muted-foreground text-lg">{t("recipes.lead")}</p>
	</div>

	<ul class="grid gap-4">
		{#each recipes as recipe (recipe.slug)}
			<li class="border-border bg-card rounded-lg border p-5" data-recipe={recipe.slug}>
				<h2 class="text-foreground mb-1 text-lg font-semibold">
					<a href="/docs/recipes/{recipe.slug}" class="hover:underline">{recipe.title}</a>
				</h2>
				<p class="text-muted-foreground mb-3 text-sm">{recipe.summary}</p>
				<ul class="flex flex-wrap gap-2" aria-label={t("recipes.componentsUsed")}>
					{#each recipe.components as slug (slug)}
						<li>
							<a
								href="/docs/components/{slug}"
								class="border-border text-muted-foreground hover:text-foreground inline-block rounded-full border px-2.5 py-0.5 text-xs transition-colors"
								>{getComponent(slug)?.name ?? slug}</a
							>
						</li>
					{/each}
				</ul>
			</li>
		{/each}
	</ul>
</div>

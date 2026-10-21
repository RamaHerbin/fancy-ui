<!--
	/_proposals/home — a proposal for a discovery-first front door. Not linked
	from the nav, left out of the sitemap, noindex. Two ideas under test:
	browse by the job you need done, and a search that puts the best match first.
-->
<script lang="ts">
	import Seo from "$lib/components/Seo.svelte";
	import { JOBS, jobComponents, jobHref } from "$lib/docs/jobs.js";
	import { NO_RESULT_SUGGESTIONS, rankComponents } from "$lib/docs/search-rank.js";
	import { getStats } from "$lib/fancy-ui/registry.js";

	let query = $state("");
	const results = $derived(rankComponents(query));
	const searching = $derived(query.trim().length > 0);
	const total = getStats().total;
</script>

<Seo
	title="Find the right component | Fancy UI proposal"
	description="A proposal for browsing Fancy UI by the job you need done."
	path="/_proposals/home"
	noindex
/>

<div class="bg-background text-foreground min-h-screen">
	<header class="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
		<a href="/" class="text-sm font-semibold">Fancy UI</a>
		<a href="/docs/components" class="text-muted-foreground text-sm underline underline-offset-4">
			All components
		</a>
	</header>

	<main class="mx-auto max-w-3xl px-4 pt-6 pb-24">
		<h1 class="text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
			What do you need to get done?
		</h1>
		<p class="text-muted-foreground mt-3 max-w-prose text-base">
			{total} components, grouped by the job they do. Pick a job, or search by name.
		</p>

		<form class="mt-6" role="search" onsubmit={(e) => e.preventDefault()}>
			<label class="sr-only" for="proposal-search">Search components</label>
			<input
				id="proposal-search"
				type="search"
				bind:value={query}
				placeholder="Search, for example “toast”"
				autocomplete="off"
				class="border-border bg-background h-12 w-full rounded-xl border px-4 text-base outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--primary)]"
			/>
		</form>

		<div aria-live="polite" class="sr-only" data-testid="result-count">
			{#if searching}{results.length} results{/if}
		</div>

		{#if searching}
			{#if results.length > 0}
				<ul class="mt-6 grid gap-2" data-testid="results">
					{#each results.slice(0, 24) as c (c.slug)}
						<li>
							<a
								href={jobHref(c.slug)}
								class="border-border hover:bg-muted block rounded-lg border px-4 py-3"
							>
								<span class="block font-medium">{c.name}</span>
								<span class="text-muted-foreground block text-sm">{c.description}</span>
							</a>
						</li>
					{/each}
				</ul>
			{:else}
				<div class="mt-8 rounded-xl border border-dashed p-6" data-testid="no-results">
					<p class="font-medium">Nothing matches “{query.trim()}”.</p>
					<p class="text-muted-foreground mt-1 text-sm">Try one of these instead:</p>
					<div class="mt-3 flex flex-wrap gap-2">
						{#each NO_RESULT_SUGGESTIONS as suggestion (suggestion)}
							<button
								type="button"
								class="border-border hover:bg-muted min-h-11 rounded-full border px-4 text-sm"
								onclick={() => (query = suggestion)}
							>
								{suggestion}
							</button>
						{/each}
					</div>
				</div>
			{/if}
		{:else}
			<div class="mt-10 grid gap-8" data-testid="jobs">
				{#each JOBS as job (job.id)}
					<section aria-labelledby={`job-${job.id}`}>
						<h2 id={`job-${job.id}`} class="text-xl font-semibold">{job.title}</h2>
						<p class="text-muted-foreground mt-1 text-sm">{job.blurb}</p>
						<ul class="mt-3 flex flex-wrap gap-2">
							{#each jobComponents(job) as c (c.slug)}
								<li>
									<a
										href={jobHref(c.slug)}
										class="border-border hover:bg-muted inline-flex min-h-11 items-center rounded-full border px-4 text-sm"
									>
										{c.name}
									</a>
								</li>
							{/each}
						</ul>
					</section>
				{/each}
			</div>
		{/if}
	</main>
</div>

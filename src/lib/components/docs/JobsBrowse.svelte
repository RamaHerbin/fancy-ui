<script lang="ts">
	import { JOBS, jobComponents, jobHref } from "$lib/docs/jobs.js";
	import { t } from "$lib/stores";
	import type { MessageKey } from "$lib/i18n/messages/en.js";
</script>

<!-- Browse by the job you need done; category browsing stays below. -->
<section aria-labelledby="jobs-heading" class="mb-10" data-jobs>
	<h2 id="jobs-heading" class="text-foreground mb-3 text-lg font-semibold tracking-tight">
		{t("jobs.heading")}
	</h2>
	<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
		{#each JOBS as job (job.id)}
			<div class="border-border bg-card rounded-xl border p-4" data-job={job.id}>
				<h3 data-toc-ignore class="text-foreground mb-3 text-sm font-semibold">
					{t(`jobs.${job.id}` as MessageKey)}
				</h3>
				<ul class="flex flex-wrap gap-1.5">
					{#each jobComponents(job) as c (c.slug)}
						<li>
							<a
								href={jobHref(c.slug)}
								class="border-border text-muted-foreground hover:text-foreground hover:bg-muted inline-flex min-h-8 items-center rounded-full border px-3 text-xs transition-colors"
							>
								{c.name}
							</a>
						</li>
					{/each}
				</ul>
			</div>
		{/each}
	</div>
</section>

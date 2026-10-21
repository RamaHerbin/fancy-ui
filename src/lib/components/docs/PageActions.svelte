<script lang="ts">
	/**
	 * "Edit this page" and "Report an issue" links for a docs page. The edit
	 * link targets the integration branch; a folder source opens in the tree
	 * view because the web editor only takes files.
	 */
	import { page } from "$app/stores";
	import { t, createFrameworkState } from "$lib/stores";
	import { editUrl, newIssueUrl, sourceTreeUrl } from "$lib/site.js";

	interface Props {
		/** Repository path of the page source; null hides the edit link. */
		sourcePath: string | null;
		/** Human-readable page name, used in the issue title. */
		name: string;
	}

	let { sourcePath, name }: Props = $props();

	const frameworkState = createFrameworkState();

	const isFile = $derived(sourcePath ? /\.[A-Za-z0-9]+$/.test(sourcePath) : false);
	const editHref = $derived(
		sourcePath ? (isFile ? editUrl(sourcePath) : sourceTreeUrl(sourcePath)) : null
	);
	const issueHref = $derived(
		newIssueUrl({
			template: "bug_report.yml",
			title: t("comp.issueTitle").replace("{name}", name),
			body: `Page: ${$page.url.href}\nFramework: ${frameworkState.framework}`,
		})
	);
</script>

<div class="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
	{#if editHref}
		<a
			href={editHref}
			target="_blank"
			rel="noopener noreferrer"
			class="hover:text-foreground underline underline-offset-4 transition-colors"
		>
			{t("comp.editPage")}
		</a>
	{/if}
	<a
		href={issueHref}
		target="_blank"
		rel="noopener noreferrer"
		class="hover:text-foreground underline underline-offset-4 transition-colors"
	>
		{t("comp.reportIssue")}
	</a>
</div>

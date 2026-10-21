<script lang="ts">
	import { newIssueUrl } from "$lib/site.js";
	import { t } from "$lib/stores";

	interface Props {
		/** HTTP status of the error. 404 and 401 have their own copy. */
		status: number;
		/** Thrown error message, shown on the generic variant only. */
		message?: string;
		/** Absolute URL of the page that failed, carried into the report link. */
		url: string;
		/** Opens the docs search. The button is omitted when not provided. */
		onsearch?: () => void;
	}

	let { status, message, url, onsearch }: Props = $props();

	const variant = $derived(status === 404 ? "404" : status === 401 ? "401" : "generic");
	const title = $derived(
		variant === "404"
			? t("error.notFoundTitle")
			: variant === "401"
				? t("error.unauthorizedTitle")
				: t("error.genericTitle")
	);
	const body = $derived(
		variant === "404"
			? t("error.notFoundBody")
			: variant === "401"
				? t("error.unauthorizedBody")
				: t("error.genericBody")
	);
	const reportHref = $derived(
		newIssueUrl({
			title: `${status}: ${new URL(url, "https://x.invalid").pathname}`,
			body: `${status} at ${url}`,
		})
	);

	const action =
		"inline-flex items-center rounded-xl border border-border bg-card px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";
</script>

<div
	class="relative flex min-h-[70vh] flex-col items-center justify-center overflow-hidden px-4 py-16 text-center"
	data-error-variant={variant}
>
	<div
		aria-hidden="true"
		class="pointer-events-none absolute inset-0 bg-[linear-gradient(var(--color-border)_1px,transparent_1px),linear-gradient(90deg,var(--color-border)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000,transparent)] [background-size:64px_64px] opacity-40"
	></div>

	<div class="relative flex flex-col items-center gap-5">
		<span class="text-foreground text-7xl font-extrabold tracking-[-0.025em] sm:text-8xl">
			{status}
		</span>
		<h1 class="text-foreground max-w-md text-2xl font-bold tracking-tight text-balance sm:text-3xl">
			{title}
		</h1>
		<p class="text-muted-foreground max-w-[420px] text-[15px] leading-[1.65]">{body}</p>
		{#if variant === "generic" && message}
			<p class="text-muted-foreground max-w-[420px] font-mono text-xs break-words">{message}</p>
		{/if}

		<div class="mt-2 flex flex-wrap items-center justify-center gap-3">
			<a
				href="/"
				class="bg-foreground text-background focus-visible:outline-foreground inline-flex items-center rounded-xl px-6 py-3 text-sm font-semibold transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2"
			>
				{t("error.home")}
			</a>
			<a href="/docs/components" class={action}>{t("error.browse")}</a>
			{#if onsearch}
				<button type="button" class={action} onclick={onsearch}>{t("error.search")}</button>
			{/if}
		</div>

		<a
			data-report
			href={reportHref}
			target="_blank"
			rel="noopener noreferrer"
			class="text-muted-foreground hover:text-foreground text-sm underline underline-offset-4"
		>
			{t("error.report")}
		</a>
	</div>
</div>

<script lang="ts">
	import { newIssueUrl } from "$lib/site.js";
	import { t, getLocale } from "$lib/stores";
	import { getLocaleDef } from "$lib/i18n/locales.js";

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

	// t() follows the docs locale everywhere, but the html lang and dir are only applied
	// under /docs, so the error body declares its own language and direction.
	const localeDef = $derived(getLocaleDef(getLocale()));
	const lang = $derived(localeDef?.code ?? "en");
	const dir = $derived(localeDef?.dir ?? "ltr");

	// i18n: error.newTab — "(opens in a new tab)"
	const NEW_TAB = "(opens in a new tab)";

	// Action colours live in the scoped style block below (unlayered, class
	// specificity) so a skin's global `a { color }` rule cannot recolour them.
	const action = "err-action err-secondary";
</script>

<div
	class="relative flex min-h-[70vh] flex-col items-center justify-center overflow-hidden px-4 py-16 text-center"
	data-error-variant={variant}
	{lang}
	{dir}
>
	<div
		aria-hidden="true"
		class="pointer-events-none absolute inset-0 bg-[linear-gradient(var(--border)_1px,transparent_1px),linear-gradient(90deg,var(--border)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000,transparent)] [background-size:64px_64px] opacity-40"
	></div>

	<div class="relative flex flex-col items-center gap-5">
		<span class="text-foreground text-7xl font-extrabold tracking-[-0.025em] sm:text-8xl">
			{status}
		</span>
		<h1 class="text-foreground max-w-md text-2xl font-bold tracking-tight text-balance sm:text-3xl">
			{title}
		</h1>
		<p class="err-muted max-w-[420px] text-[15px] leading-[1.65]">{body}</p>
		{#if variant === "generic" && message}
			<p class="err-muted max-w-[420px] font-mono text-xs break-words">{message}</p>
		{/if}

		<div class="mt-2 flex flex-wrap items-center justify-center gap-3">
			<a href="/" class="err-action err-primary">
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
			class="err-report text-sm underline underline-offset-4"
		>
			{t("error.report")}<span class="sr-only"> {NEW_TAB}</span>
		</a>
	</div>
</div>

<style>
	.err-action {
		display: inline-flex;
		align-items: center;
		border-radius: 0.75rem;
		padding: 0.75rem 1.5rem;
		font-size: 0.875rem;
		line-height: 1.25rem;
		font-weight: 500;
		text-decoration: none;
		transition:
			background-color 0.15s,
			opacity 0.15s,
			color 0.15s;
		cursor: pointer;
	}
	.err-action:focus-visible,
	.err-report:focus-visible {
		outline: 2px solid var(--foreground);
		outline-offset: 2px;
	}
	.err-primary,
	.err-primary:hover {
		background: var(--foreground);
		color: var(--background);
		border: 1px solid transparent;
		font-weight: 600;
	}
	.err-primary:hover {
		opacity: 0.9;
	}
	.err-secondary,
	.err-secondary:hover {
		border: 1px solid var(--border);
		color: var(--foreground);
	}
	.err-secondary {
		background: var(--card);
	}
	.err-secondary:hover {
		background: var(--accent);
	}
	/* Derived from the foreground so it tracks the active skin's ink; the skin
	   bridge does not remap the muted token, which left grey on cream. */
	.err-muted,
	.err-report {
		color: color-mix(in oklab, var(--foreground) 72%, transparent);
	}
	.err-report:hover {
		color: var(--foreground);
	}
</style>

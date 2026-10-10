<script lang="ts">
import type { HTMLAttributes } from "vue";
import type { SourceData } from "../../internals/ai-types.js";

/**
 * Props for SourceCard
 */
export interface SourceCardProps {
	/** The document being cited. Only `title` is ever guaranteed to render. */
	source: SourceData;
	/**
	 * Renders the plain, non-anchor shape even when the source has a url. For a
	 * card embedded in a surface — a tooltip preview — that cannot host a link
	 * reachable by keyboard.
	 */
	interactive?: boolean;
	/** Additional CSS classes */
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { computed } from "vue";
import { cn } from "../../utils.js";
import { hostOf, monogram } from "../../internals/host.js";
import { sanitizeHref } from "../../internals/markdown.js";

defineOptions({ name: "SourceCard", inheritAttrs: false });

const { source, interactive = true, class: className } = defineProps<SourceCardProps>();

defineSlots<{
	/** Replaces the monogram: a favicon you host, a logo, an icon. */
	icon?(): unknown;
}>();

// An explicit `domain` always wins — a caller who says "the standards body"
// means that, not `www.w3.org`.
const domain = computed(() => source.domain || hostOf(source.url));
// The host names the place, so it is what the circle stands for; a source
// with no parsable host falls back to its own title.
const mark = computed(() => monogram(domain.value || source.title));
// A citation with nowhere to go is still worth showing — it just must not
// pretend to be a link. A model-provided url also has to clear the same
// scheme check every link in this family runs through, and a bare host
// ("docs.example.dev/guide") has to become absolute before it goes in an
// `href`, or the browser resolves it against this app's own origin instead
// of the cited site.
const href = computed(() =>
	interactive && typeof source.url === "string" ? (resolveHref(source.url) ?? "") : ""
);

/**
 * A model-provided url made safe for an anchor's `href`, or `null` when it
 * must not render as a link at all: a disallowed scheme is rejected outright
 * by the shared markdown-link sanitizer, and a scheme-less host is promoted
 * to `https://` first. A genuine relative path ("/local/guide") has nowhere
 * else to resolve against and is left alone.
 */
/*
 * The source factors the shared card body into a snippet and picks the element
 * around it with `{#if href}`. A template has no snippet to render twice, so
 * the element itself is what switches — same two tag names, same two `cn()`
 * calls with the same literals, one copy of the body.
 */

function resolveHref(raw: string): string | null {
	if (raw === "") return null;
	const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw) || raw.startsWith("//");
	const host = raw.split(/[/?#]/, 1)[0] as string;
	const looksHostLike = !hasScheme && !raw.startsWith("/") && host.includes(".");
	return sanitizeHref(looksHostLike ? `https://${raw}` : raw);
}
</script>

<template>
	<!--
		`nofollow ugc` because a model chose this link, not the author of the page
		it sits on; `noopener noreferrer` because the tab it opens has no business
		reaching back into the app or announcing where the reader came from.
	-->
	<component
		:is="href ? 'a' : 'div'"
		v-bind="
			href ? { href, target: '_blank', rel: 'noopener noreferrer nofollow ugc' } : {}
		"
		:class="
			href ? cn('ft-source-card ft-source-linked', className) : cn('ft-source-card', className)
		"
	>
		<span class="ft-source-mark flex-none" aria-hidden="true">
			<slot name="icon">{{ mark }}</slot>
		</span>

		<span class="flex min-w-0 flex-col gap-0.5">
			<span class="ft-source-title text-foreground text-xs leading-snug font-medium">
				{{ source.title }}
			</span>
			<span
				v-if="domain"
				class="ft-source-domain text-muted-foreground text-[0.6875rem] leading-none"
			>
				{{ domain }}
			</span>
			<span
				v-if="source.snippet"
				class="ft-source-snippet text-muted-foreground mt-0.5 text-[0.6875rem] leading-snug"
			>
				{{ source.snippet }}
			</span>
		</span>
	</component>
</template>

<style scoped>
.ft-source-card {
	display: flex;
	gap: 0.5rem;
	border-radius: 0.5rem;
	border: 1px solid
		var(
			--ft-sources-card-border,
			var(--color-border, color-mix(in oklab, currentColor 15%, transparent))
		);
	background: var(--ft-sources-card-bg, color-mix(in oklab, currentColor 3%, transparent));
	padding: 0.5rem 0.625rem;
	text-decoration: none;
	color: inherit;
}

.ft-source-linked:hover,
.ft-source-linked:focus-visible {
	background: var(--ft-sources-card-hover-bg, color-mix(in oklab, currentColor 7%, transparent));
}

/*
 * The monogram stands in for a favicon: no request leaves the reader's browser
 * to the cited site, and there is no broken image to fall back from.
 */
.ft-source-mark {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 1.25rem;
	height: 1.25rem;
	border-radius: 9999px;
	background: var(--ft-sources-chip-bg, color-mix(in oklab, currentColor 10%, transparent));
	color: var(--ft-sources-chip-fg, inherit);
	font-size: 0.625rem;
	font-weight: 600;
	line-height: 1;
}

/*
 * Two lines for a title, two for the snippet: enough to tell two results
 * apart, few enough that a row of cards stays a row.
 */
.ft-source-title,
.ft-source-snippet {
	display: -webkit-box;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 2;
	line-clamp: 2;
	overflow: hidden;
}

/* A host is an identifier, so it is set like one — and never wrapped. */
.ft-source-domain {
	overflow: hidden;
	font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
	text-overflow: ellipsis;
	white-space: nowrap;
}

@media (prefers-reduced-motion: no-preference) {
	.ft-source-linked {
		transition: background-color 150ms ease;
	}
}
</style>

import type { ReactNode } from "react";
import { cn } from "../../utils.js";
import type { SourceData } from "../../internals/ai-types.js";
import { hostOf, monogram } from "../../internals/host.js";
import { sanitizeHref } from "../../internals/markdown.js";
import "./source-card.css";

/**
 * Props for SourceCard
 */
export interface SourceCardProps {
	/** The document being cited. Only `title` is ever guaranteed to render. */
	source: SourceData;
	/** Replaces the monogram: a favicon you host, a logo, an icon. */
	icon?: ReactNode;
	/**
	 * Renders the plain, non-anchor shape even when the source has a url. For a
	 * card embedded in a surface — a tooltip preview — that cannot host a link
	 * reachable by keyboard.
	 */
	interactive?: boolean;
	/** Additional CSS classes */
	className?: string;
}

/**
 * A model-provided url made safe for an anchor's `href`, or `null` when it
 * must not render as a link at all: a disallowed scheme is rejected outright
 * by the shared markdown-link sanitizer, and a scheme-less host is promoted
 * to `https://` first. A genuine relative path ("/local/guide") has nowhere
 * else to resolve against and is left alone.
 */
function resolveHref(raw: string): string | null {
	if (raw === "") return null;
	const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw) || raw.startsWith("//");
	const host = raw.split(/[/?#]/, 1)[0] as string;
	const looksHostLike = !hasScheme && !raw.startsWith("/") && host.includes(".");
	return sanitizeHref(looksHostLike ? `https://${raw}` : raw);
}

/** One citation: monogram, title, host, and the line worth reading. */
export function SourceCard({ source, icon, interactive = true, className }: SourceCardProps) {
	// An explicit `domain` always wins — a caller who says "the standards body"
	// means that, not `www.w3.org`.
	const domain = source.domain || hostOf(source.url);
	// The host names the place, so it is what the circle stands for; a source
	// with no parsable host falls back to its own title.
	const mark = monogram(domain || source.title);
	// A citation with nowhere to go is still worth showing — it just must not
	// pretend to be a link. A model-provided url also has to clear the same
	// scheme check every link in this family runs through, and a bare host
	// ("docs.example.dev/guide") has to become absolute before it goes in an
	// `href`, or the browser resolves it against this app's own origin instead
	// of the cited site.
	const href = interactive && typeof source.url === "string" ? (resolveHref(source.url) ?? "") : "";

	const body = (
		<>
			<span className="ft-source-mark flex-none" aria-hidden="true">
				{/*
					Truthiness, not nullishness: the Svelte source branches on
					`{#if icon}`, so a caller writing `icon={cond && <Logo />}`
					with a false `cond` gets the monogram back rather than an
					empty circle.
				*/}
				{icon || mark}
			</span>

			<span className="flex min-w-0 flex-col gap-0.5">
				<span className="ft-source-title text-foreground text-xs leading-snug font-medium">
					{source.title}
				</span>
				{domain && (
					<span className="ft-source-domain text-muted-foreground text-[0.6875rem] leading-none">
						{domain}
					</span>
				)}
				{source.snippet && (
					<span className="ft-source-snippet text-muted-foreground mt-0.5 text-[0.6875rem] leading-snug">
						{source.snippet}
					</span>
				)}
			</span>
		</>
	);

	if (href) {
		return (
			// `nofollow ugc` because a model chose this link, not the author of the
			// page it sits on; `noopener noreferrer` because the tab it opens has no
			// business reaching back into the app or announcing where the reader
			// came from.
			<a
				href={href}
				target="_blank"
				rel="noopener noreferrer nofollow ugc"
				className={cn("ft-source-card ft-source-linked", className)}
			>
				{body}
			</a>
		);
	}

	return <div className={cn("ft-source-card", className)}>{body}</div>;
}

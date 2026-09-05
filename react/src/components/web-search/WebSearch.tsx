import { forwardRef, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "../../utils.js";
import type { SearchResultData } from "../../internals/ai-types.js";
import { hostOf, monogram } from "../../internals/host.js";
import { sanitizeHref } from "../../internals/markdown.js";
import { useFancyId } from "../../internals/use-id.js";
import { useSoundCue } from "../../sound/use-sound.js";
import "./web-search.css";

/**
 * Props for WebSearch
 */
export interface WebSearchProps {
	/** What the agent looked up, shown in the search-bar header */
	query: string;
	/** Hits found so far, oldest first; appending to it lands a new row */
	results: SearchResultData[];
	/** Whether the lookup is still running: drives the scanning bar and the waiting state */
	searching?: boolean;
	/** Called when a row is activated; supplying it turns every row into a button */
	onSelect?: (result: SearchResultData, index: number) => void;
	/** Replaces the built-in row body, keeping the row element and its behaviour */
	item?: (result: SearchResultData, index: number) => ReactNode;
	/** Rows shown before the expander takes over; `0` shows every result */
	maxVisible?: number;
	/** Accessible name for the whole block */
	label?: string;
	/** Additional CSS classes */
	className?: string;
	/**
	 * Plays the matching interface cue through the sound controller. Off by
	 * default; only audible once the user has enabled sound.
	 */
	sound?: boolean;
}

/**
 * A result url made safe for an `href`, or `null` when it must not be a link
 * at all. These arrive from a model with the rest of the answer, so they clear
 * the same scheme check as every link in this family; a bare host is promoted
 * to `https://` first, since an `href` of "docs.example.dev/guide" resolves
 * against this app's own origin. A genuine relative path is left alone.
 */
function resolveHref(raw: string | undefined): string | null {
	if (typeof raw !== "string" || raw === "") return null;
	const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw) || raw.startsWith("//");
	const host = raw.split(/[/?#]/, 1)[0] ?? "";
	const looksHostLike = !hasScheme && !raw.startsWith("/") && host.includes(".");
	return sanitizeHref(looksHostLike ? `https://${raw}` : raw);
}

const ROW_BASE =
	"ft-websearch-row flex w-full items-start gap-2.5 rounded-md px-2 py-1.5 text-left";
const ROW_INTERACTIVE =
	"hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:ring-ring cursor-pointer transition-colors focus-visible:ring-1 focus-visible:outline-none";

/**
 * A search the agent ran, shown as it happens: the query in a search-bar
 * header, a scanning bar while the lookup is in flight, and result rows that
 * land one at a time as they are found.
 *
 * The root element arrives through the ref channel rather than a `ref` prop,
 * per PORTING.md — the Svelte source declares `ref = $bindable(null)`.
 */
export const WebSearch = forwardRef<HTMLDivElement, WebSearchProps>(function WebSearch(
	{
		query,
		results,
		searching = false,
		onSelect,
		item,
		maxVisible = 0,
		label = "Web search",
		className,
		sound,
	},
	ref
) {
	const uid = useFancyId();
	const listId = `${uid}-list`;
	const playCue = useSoundCue(sound);

	const [expanded, setExpanded] = useState(false);

	// `0` — and any value below it, which would otherwise hide everything — means
	// the list is its own cap.
	const cap = maxVisible > 0 ? Math.floor(maxVisible) : results.length;
	const hiddenCount = Math.max(0, results.length - cap);

	// Expansion only means anything while something is hidden: with nothing behind
	// the cap there is no expanded state to be in, and the label and `aria-expanded`
	// would otherwise describe a button that is not on screen.
	const isExpanded = expanded && hiddenCount > 0;
	const visible = isExpanded || hiddenCount === 0 ? results : results.slice(0, cap);
	const countText = results.length === 1 ? "1 result" : `${results.length} results`;

	// An emptied list is a new search starting, not the old one still expanded: the
	// reader asked to see the rest of a result set that no longer exists, so the
	// request retires with it and the next set arrives capped like the first.
	useEffect(() => {
		if (results.length === 0) setExpanded(false);
	}, [results.length]);

	function pick(result: SearchResultData, index: number) {
		playCue("select");
		onSelect?.(result, index);
	}

	/** Disclosure, not a menu: `open`/`close` follow the same toggle either way. */
	function toggleExpanded() {
		const next = !isExpanded;
		playCue(next ? "open" : "close");
		setExpanded(next);
	}

	return (
		<div
			ref={ref}
			className={cn("ft-websearch w-full text-sm", className)}
			role="group"
			aria-label={label}
			aria-busy={searching}
		>
			<div className="ft-websearch-header border-border bg-background/60 flex items-center gap-2 rounded-lg border px-3 py-2">
				<svg
					className="text-muted-foreground size-3.5 flex-none"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					aria-hidden="true"
				>
					<circle cx="11" cy="11" r="7" />
					<path d="m20 20-3.6-3.6" />
				</svg>

				<span className="ft-websearch-query text-foreground min-w-0 flex-1 truncate" title={query}>
					{query}
				</span>

				{results.length > 0 && (
					<span className="ft-websearch-count text-muted-foreground flex-none text-xs tabular-nums">
						{countText}
					</span>
				)}
			</div>

			{/*
				Decorative: `aria-busy` on the group already says the lookup is running, and
				the waiting line below says it in words while there is nothing to read.
			*/}
			{searching && (
				<div className="ft-websearch-scan mt-1.5" aria-hidden="true">
					<span className="ft-websearch-beam"></span>
				</div>
			)}

			{visible.length > 0 ? (
				<ul id={listId} className="ft-websearch-list mt-1.5">
					{/*
						Keyed by id so an appended hit mounts as a fresh node and plays the
						entrance on its own, while the rows already on screen keep the DOM nodes
						they had — a CSS animation does not replay on an element that has one.
					*/}
					{visible.map((result, index) => {
						const domain = hostOf(result.url);
						const safeHref = resolveHref(result.url);
						const body = item ? (
							item(result, index)
						) : (
							<>
								{/* A row with no parsable host falls back to its title for the circle. */}
								<span className="ft-websearch-monogram" aria-hidden="true">
									{monogram(domain || result.title)}
								</span>
								<span className="ft-websearch-text min-w-0 flex-1">
									<span className="ft-websearch-title text-foreground block truncate font-medium">
										{result.title}
									</span>
									{domain && (
										<span className="ft-websearch-domain text-muted-foreground block truncate text-xs">
											{domain}
										</span>
									)}
									{result.snippet && (
										<span className="ft-websearch-snippet text-muted-foreground mt-0.5 text-xs">
											{result.snippet}
										</span>
									)}
								</span>
							</>
						);

						return (
							<li key={result.id} className="ft-websearch-item">
								{onSelect ? (
									<button
										type="button"
										className={cn(ROW_BASE, ROW_INTERACTIVE)}
										onClick={() => pick(result, index)}
									>
										{body}
									</button>
								) : safeHref ? (
									// Somebody else's page, arriving from a model: `nofollow ugc` keeps the
									// host from vouching for it, and `noopener noreferrer` keeps the opened
									// tab away from this one.
									<a
										className={cn(ROW_BASE, ROW_INTERACTIVE)}
										href={safeHref}
										target="_blank"
										rel="noopener noreferrer nofollow ugc"
										onClick={() => pick(result, index)}
									>
										{body}
									</a>
								) : (
									<div className={ROW_BASE}>{body}</div>
								)}
							</li>
						);
					})}
				</ul>
			) : searching ? (
				<p className="ft-websearch-status text-muted-foreground mt-1.5 px-2 text-xs">Searching…</p>
			) : (
				<p className="ft-websearch-empty text-muted-foreground mt-1.5 px-2 text-xs">No results</p>
			)}

			{hiddenCount > 0 && (
				<button
					type="button"
					className="ft-websearch-more text-muted-foreground hover:text-foreground focus-visible:ring-ring mt-1 cursor-pointer rounded-md px-2 py-1 text-xs transition-colors focus-visible:ring-1 focus-visible:outline-none"
					aria-expanded={isExpanded}
					aria-controls={listId}
					onClick={toggleExpanded}
				>
					{isExpanded ? "Show less" : `Show ${hiddenCount} more`}
				</button>
			)}
		</div>
	);
});

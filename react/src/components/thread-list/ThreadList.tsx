import { forwardRef, useState } from "react";
import type { MouseEvent, ReactNode } from "react";
import { cn } from "../../utils.js";
import { useNow } from "../../internals/use-elapsed.js";
import { formatRelativeTime } from "../../internals/relative-time.js";
import type { ThreadData } from "../../internals/ai-types.js";
import "./thread-list.css";

/**
 * Props for ThreadList
 */
export interface ThreadListProps {
	/** The conversations to list, in the order they should appear. */
	threads: ThreadData[];
	/**
	 * Id of the selected conversation. Passing it makes the selection
	 * controlled — the React counterpart of the Svelte source's `$bindable`;
	 * omit it entirely to let the list own its own selection and report every
	 * pick through `onSelect`.
	 */
	activeId?: string;
	/** Called with the conversation the reader picked. The highlight moves either way. */
	onSelect?: (thread: ThreadData) => void;
	/** Supplying it puts a delete button on every row, revealed on hover or focus. */
	onDelete?: (thread: ThreadData) => void;
	/** Accessible name for the list. */
	label?: string;
	/** Replaces the built-in row body. Receives the thread and whether it is the active one. */
	item?: (thread: ThreadData, active: boolean) => ReactNode;
	/** Replaces the built-in "no conversations yet" line. */
	empty?: ReactNode;
	/** Additional CSS classes */
	className?: string;
}

/** How often every timestamp in the list is recomputed. */
const REFRESH_MS = 30_000;

/**
 * The machine-readable half of a timestamp. A date the browser could not read
 * has no ISO form, and `datetime=""` is invalid rather than absent, so an
 * unreadable one is spread onto the element as no attributes at all.
 */
function timeAttrs(timestamp: Date | number): { dateTime?: string; title?: string } {
	const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
	if (!Number.isFinite(date.getTime())) return {};
	const exact = date.toISOString();
	return { dateTime: exact, title: exact };
}

/** One rendered row: the conversation, and the key the list tracks it by. */
interface ThreadRow {
	thread: ThreadData;
	key: string;
}

/**
 * The first thread under an id keeps that id as its key, so a row survives a
 * reorder with its DOM node — and its focus — intact. Only a repeat gets a
 * suffix, and the suffix counts occurrences rather than positions: keying on
 * the position would rename every row below an insertion, destroying the state
 * of rows that never moved.
 *
 * A suffix is also checked against the ids actually in the list, since one of
 * them may well look like a generated one: `x`, `x`, `x#1` would otherwise
 * hand the same key to two different rows.
 */
function keyedRows(threads: ThreadData[]): ThreadRow[] {
	const ids = new Set(threads.map((thread) => thread.id));
	const seen = new Map<string, number>();
	const used = new Set<string>();
	return threads.map((thread) => {
		const seenBefore = seen.get(thread.id) ?? 0;
		seen.set(thread.id, seenBefore + 1);
		let key = thread.id;
		if (seenBefore > 0) {
			let suffix = seenBefore;
			do {
				key = `${thread.id}#${suffix}`;
				suffix++;
			} while (ids.has(key) || used.has(key));
		}
		used.add(key);
		return { thread, key };
	});
}

/**
 * ThreadList renders a sidebar of conversations: title, preview, unread dot
 * and a relative timestamp per row, refreshed by one shared clock for the
 * whole list rather than one interval per row. Nothing ticks under SSR — the
 * clock only starts once the list is mounted.
 *
 * The root element arrives through the ref channel (the Svelte source
 * declares `ref = $bindable(null)`).
 */
export const ThreadList = forwardRef<HTMLDivElement, ThreadListProps>(function ThreadList(
	{
		threads,
		activeId: activeIdProp,
		onSelect,
		onDelete,
		label = "Conversations",
		item,
		empty,
		className,
	},
	ref
) {
	// The Svelte source's `activeId` is `$bindable()`: a consumer can bind it,
	// or leave it alone and let the component keep writing its own copy. React
	// has no such channel, so the prop is controlled when it is passed and this
	// local copy takes over when it is not. Either way `onSelect` fires with
	// the picked thread.
	const [uncontrolledActiveId, setUncontrolledActiveId] = useState<string | undefined>(undefined);
	const isControlled = activeIdProp !== undefined;
	const activeId = isControlled ? activeIdProp : uncontrolledActiveId;

	// One clock for the whole list: fifty rows cost one interval rather than
	// fifty, and nothing is scheduled until the list is mounted.
	const now = useNow(REFRESH_MS);

	function select(thread: ThreadData) {
		// The highlight is moved whether or not anyone is listening on
		// `onSelect`, so an uncontrolled list drives itself.
		if (!isControlled) setUncontrolledActiveId(thread.id);
		onSelect?.(thread);
	}

	function remove(event: MouseEvent, thread: ThreadData) {
		// The delete button is a *sibling* of the row button rather than a child —
		// nesting buttons is invalid HTML — so nothing bubbles into a selection
		// today. Stopping it anyway keeps that true if a consumer ever wraps the
		// row in something clickable of their own.
		event.stopPropagation();
		onDelete?.(thread);
	}

	function relative(timestamp: Date | number): string {
		return formatRelativeTime(timestamp, { now });
	}

	return (
		<div
			ref={ref}
			className={cn(
				"ft-threadlist w-full text-sm",
				onDelete !== undefined && "ft-threadlist-deletable",
				className
			)}
		>
			{threads.length === 0 ? (
				(empty ?? (
					<p className="ft-threadlist-empty text-muted-foreground px-2 py-6 text-center text-xs">
						No conversations yet
					</p>
				))
			) : (
				/*
				 * `role="list"` is stated rather than left implicit: `list-style: none`
				 * strips list semantics in Safari, and how many conversations there are
				 * is half of what this list says.
				 */
				<ul className="ft-threadlist-list" role="list" aria-label={label}>
					{/* Keyed by the identity worked out above, never by the position. */}
					{keyedRows(threads).map(({ thread, key }) => {
						const isActive = activeId !== undefined && thread.id === activeId;
						return (
							<li key={key} className="ft-threadlist-row">
								<button
									type="button"
									className={cn(
										"ft-threadlist-button focus-visible:ring-ring hover:bg-muted/60 flex w-full items-start gap-2 rounded-md py-2 pl-2 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none",
										isActive && "ft-threadlist-active"
									)}
									aria-current={isActive ? "true" : undefined}
									onClick={() => select(thread)}
								>
									{/*
									 * The dot's column is reserved on every row, unread or not, so
									 * the titles stay on one vertical line instead of stepping in
									 * and out as messages are read.
									 */}
									<span
										className={cn(
											"ft-threadlist-dot",
											thread.unread && "ft-threadlist-unread"
										)}
										aria-hidden="true"
									/>
									{thread.unread ? (
										// The dot is colour alone, which says nothing out loud.
										<span className="sr-only">Unread</span>
									) : null}

									{item ? (
										item(thread, isActive)
									) : (
										<span className="ft-threadlist-main min-w-0 flex-1">
											<span className="flex min-w-0 items-baseline gap-2">
												<span
													className={cn(
														"ft-threadlist-title truncate",
														thread.unread && "ft-threadlist-strong"
													)}
													title={thread.title}
												>
													{thread.title}
												</span>
												<time
													className="ft-threadlist-time text-muted-foreground ml-auto shrink-0 text-xs tabular-nums"
													{...timeAttrs(thread.updatedAt)}
												>
													{relative(thread.updatedAt)}
												</time>
											</span>
											{thread.preview ? (
												<span
													className="ft-threadlist-preview text-muted-foreground mt-0.5 block truncate text-xs"
													title={thread.preview}
												>
													{thread.preview}
												</span>
											) : null}
										</span>
									)}
								</button>

								{onDelete ? (
									<button
										type="button"
										className="ft-threadlist-delete text-muted-foreground hover:text-foreground focus-visible:ring-ring grid size-7 place-items-center rounded-md focus-visible:ring-2 focus-visible:outline-none"
										aria-label={`Delete ${thread.title}`}
										onClick={(event) => remove(event, thread)}
									>
										<svg
											className="size-3.5"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											strokeWidth="2"
											strokeLinecap="round"
											strokeLinejoin="round"
											aria-hidden="true"
										>
											<path d="M3 6h18" />
											<path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
											<path d="M19 6v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6" />
											<path d="M10 11v6" />
											<path d="M14 11v6" />
										</svg>
									</button>
								) : null}
							</li>
						);
					})}
				</ul>
			)}
		</div>
	);
});

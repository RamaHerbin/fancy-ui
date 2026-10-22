// Mirrors src/lib/components/docs/examples/thread-list/BasicUsage.svelte.
import { useState } from "react";
import { ThreadList } from "fancy-ui-react";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const now = Date.now();

type Thread = { id: string; title: string; preview?: string; updatedAt: Date | number; unread?: boolean };

const INITIAL: Thread[] = [
	{
		id: "t1",
		title: "Retry policy for billing webhooks",
		preview: "So a 429 should back off exponentially, capped at five minutes.",
		updatedAt: now - 4 * MINUTE,
		unread: true,
	},
	{
		id: "t2",
		title: "Migration plan for the events table",
		preview: "Split it before the backfill, not after.",
		updatedAt: now - 3 * HOUR,
	},
	{
		id: "t3",
		title: "Naming the new endpoint",
		preview: "/v2/runs reads better than /v2/executions.",
		updatedAt: now - 26 * HOUR,
	},
	{
		id: "t4",
		title: "Why the dashboard is slow on Mondays",
		preview: "Every cron lands at 00:00 UTC and they all query the same index.",
		updatedAt: now - 3 * DAY,
	},
	{
		id: "t5",
		title: "Copy pass on the onboarding emails",
		preview: "Three of the four say “simply”.",
		updatedAt: now - 9 * DAY,
	},
];

export default function Scenario() {
	const [threads, setThreads] = useState<Thread[]>(INITIAL);
	const [activeId, setActiveId] = useState("t2");

	const selected = threads.find((thread) => thread.id === activeId);

	function open(thread: Thread) {
		setActiveId(thread.id);
		setThreads((list) =>
			list.map((entry) => (entry.id === thread.id ? { ...entry, unread: false } : entry))
		);
	}

	function remove(thread: Thread) {
		const next = threads.filter((entry) => entry.id !== thread.id);
		setThreads(next);
		if (activeId === thread.id) setActiveId(next[0]?.id ?? "");
	}

	return (
		<>
			<div className="bg-card grid w-full max-w-2xl gap-4 rounded-lg border p-4 sm:grid-cols-[20rem_1fr]">
				<ThreadList
					sound
					threads={threads}
					activeId={activeId}
					onSelect={open}
					onDelete={remove}
					empty={
						<p className="text-muted-foreground px-2 py-6 text-center text-xs">
							Every conversation deleted. Refresh to bring them back.
						</p>
					}
				/>

				<div className="bg-muted/40 flex min-h-40 flex-col justify-center rounded-md p-4">
					{selected ? (
						<>
							<p className="text-foreground/70 text-xs font-medium tracking-wide uppercase">
								Conversation
							</p>
							<p className="mt-1 font-medium">{selected.title}</p>
							<p className="text-foreground/70 mt-1 text-xs">{selected.preview}</p>
						</>
					) : (
						<p className="text-foreground/70 text-xs">Pick a conversation on the left.</p>
					)}
				</div>
			</div>

			<p className="text-muted-foreground mt-3 max-w-2xl text-xs">
				The unread dot clears the moment the thread is opened, and each row reveals its delete
				button on hover — or on focus, if you tab through instead.
			</p>
		</>
	);
}

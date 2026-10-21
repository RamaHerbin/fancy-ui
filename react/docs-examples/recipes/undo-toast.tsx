import { useState } from "react";
import { Button, Toaster, dismissToast, toast } from "fancy-ui-react";

interface Note {
	id: number;
	name: string;
}

const INITIAL: Note[] = [
	{ id: 1, name: "Release checklist" },
	{ id: 2, name: "Meeting notes" },
	{ id: 3, name: "Launch copy" },
];

export function UndoToastExample() {
	const [notes, setNotes] = useState<Note[]>(INITIAL);
	// Stand-in for the request that really deletes a note.
	const [committed, setCommitted] = useState<string[]>([]);

	function remove(note: Note, index: number) {
		// Optimistic: the row leaves right away; nothing is sent yet.
		setNotes((current) => current.filter((n) => n.id !== note.id));

		const id = toast({
			title: `Deleted "${note.name}"`,
			duration: 6000,
			progress: true,
			action: {
				label: "Undo",
				onClick: () => {
					setNotes((current) => [...current.slice(0, index), note, ...current.slice(index)]);
					dismissToast(id);
				},
			},
			// Undo is the only reason that must not commit; letting the toast
			// time out, be dismissed or be pushed out by newer ones all do.
			onClose: (reason) => {
				if (reason !== "action") setCommitted((current) => [...current, note.name]);
			},
		});
	}

	return (
		<>
			<Toaster />
			<div className="flex max-w-sm flex-col gap-2">
				{notes.map((note, index) => (
					<div
						key={note.id}
						className="border-border flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
					>
						<span>{note.name}</span>
						<Button size="sm" variant="outline" onClick={() => remove(note, index)}>
							Delete
						</Button>
					</div>
				))}
				{notes.length === 0 ? (
					<p className="text-muted-foreground text-sm">
						Nothing left. Undo from the toast to bring a note back.
					</p>
				) : null}
				<p className="text-muted-foreground text-xs">Deleted for real: {committed.length}</p>
			</div>
		</>
	);
}

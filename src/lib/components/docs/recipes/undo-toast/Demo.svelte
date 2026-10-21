<script lang="ts">
	import { Button } from "$lib/fancy-ui/button";
	import { Toaster, toast, dismissToast } from "$lib/fancy-ui/toast";

	interface Note {
		id: number;
		name: string;
	}

	let notes = $state<Note[]>([
		{ id: 1, name: "Release checklist" },
		{ id: 2, name: "Meeting notes" },
		{ id: 3, name: "Launch copy" },
	]);

	// Stand-in for the request that really deletes a note.
	let committed = $state<string[]>([]);
	function commitDelete(note: Note) {
		committed = [...committed, note.name];
	}

	function remove(note: Note) {
		const index = notes.findIndex((n) => n.id === note.id);
		// Optimistic: the row leaves right away; nothing is sent yet.
		notes = notes.filter((n) => n.id !== note.id);

		const id = toast({
			title: `Deleted "${note.name}"`,
			duration: 6000,
			progress: true,
			action: {
				label: "Undo",
				onClick: () => {
					notes = [...notes.slice(0, index), note, ...notes.slice(index)];
					dismissToast(id);
				},
			},
			// Undo is the only reason that must not commit; letting the toast
			// time out, be dismissed or be pushed out by newer ones all do.
			onClose: (reason) => {
				if (reason !== "action") commitDelete(note);
			},
		});
	}
</script>

<Toaster />
<div class="flex max-w-sm flex-col gap-2">
	{#each notes as note (note.id)}
		<div
			class="border-border flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
		>
			<span>{note.name}</span>
			<Button size="sm" variant="outline" onclick={() => remove(note)}>Delete</Button>
		</div>
	{:else}
		<p class="text-muted-foreground text-sm">
			Nothing left. Undo from the toast to bring a note back.
		</p>
	{/each}
	<p class="text-muted-foreground text-xs">Deleted for real: {committed.length}</p>
</div>

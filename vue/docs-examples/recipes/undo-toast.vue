<script setup lang="ts">
import { ref } from "vue";
import { Button, Toaster, dismissToast, toast } from "fancy-ui-vue";

interface Note {
	id: number;
	name: string;
}

const notes = ref<Note[]>([
	{ id: 1, name: "Release checklist" },
	{ id: 2, name: "Meeting notes" },
	{ id: 3, name: "Launch copy" },
]);

// Stand-in for the request that really deletes a note.
const committed = ref<string[]>([]);

function remove(note: Note) {
	const index = notes.value.findIndex((n) => n.id === note.id);
	// Optimistic: the row leaves right away; nothing is sent yet.
	notes.value = notes.value.filter((n) => n.id !== note.id);

	const id = toast({
		title: `Deleted "${note.name}"`,
		duration: 6000,
		progress: true,
		action: {
			label: "Undo",
			onClick: () => {
				notes.value = [...notes.value.slice(0, index), note, ...notes.value.slice(index)];
				dismissToast(id);
			},
		},
		// Undo is the only reason that must not commit; letting the toast
		// time out, be dismissed or be pushed out by newer ones all do.
		onClose: (reason) => {
			if (reason !== "action") committed.value = [...committed.value, note.name];
		},
	});
}
</script>

<template>
	<Toaster />
	<div class="flex max-w-sm flex-col gap-2">
		<div
			v-for="note in notes"
			:key="note.id"
			class="border-border flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
		>
			<span>{{ note.name }}</span>
			<Button size="sm" variant="outline" @click="remove(note)">Delete</Button>
		</div>
		<p v-if="notes.length === 0" class="text-muted-foreground text-sm">
			Nothing left. Undo from the toast to bring a note back.
		</p>
		<p class="text-muted-foreground text-xs">Deleted for real: {{ committed.length }}</p>
	</div>
</template>

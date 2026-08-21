<script lang="ts">
	import { Select } from "$lib/fancy-ui/select";
	import {
		DropdownMenu,
		DropdownMenuTrigger,
		DropdownMenuContent,
		DropdownMenuItem,
		DropdownMenuSeparator,
	} from "$lib/fancy-ui/dropdown-menu";
	import { SoundToggle } from "$lib/fancy-ui/sound/index.js";

	const frameworks = [
		{ value: "svelte", label: "Svelte 5" },
		{ value: "react", label: "React" },
		{ value: "vue", label: "Vue" },
	];

	let framework = $state("svelte");
	let lastAction = $state("");
</script>

<div class="flex flex-col gap-4">
	<SoundToggle size="sm" showLabel label="Sound for the menus" />

	<div class="flex flex-wrap items-center gap-4">
		<Select
			options={frameworks}
			bind:value={framework}
			label="Framework"
			placeholder="Choose a framework"
			class="w-[220px]"
			sound
		/>

		<DropdownMenu sound>
			<DropdownMenuTrigger>Actions</DropdownMenuTrigger>
			<DropdownMenuContent>
				<DropdownMenuItem onSelect={() => (lastAction = "Renamed")}>Rename</DropdownMenuItem>
				<DropdownMenuItem onSelect={() => (lastAction = "Duplicated")}>Duplicate</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem variant="destructive" onSelect={() => (lastAction = "Deleted")}>
					Delete
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	</div>

	<!-- The cue is never the only carrier: the chosen action is also written out. -->
	<p class="text-muted-foreground text-sm">
		{lastAction ? `${lastAction} · framework: ${framework}` : `Framework: ${framework}`}
	</p>
</div>

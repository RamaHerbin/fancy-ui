import { useState } from "react";
import { Combobox } from "fancy-ui-react";

const frameworks = [
	{ value: "svelte-5", label: "Svelte 5" },
	{ value: "sveltekit", label: "SvelteKit" },
	{ value: "react", label: "React" },
	{ value: "vue", label: "Vue" },
];

export function ComboboxExample() {
	const [framework, setFramework] = useState("");

	return (
		<Combobox
			sound
			options={frameworks}
			value={framework}
			onValueChange={setFramework}
			label="Framework"
			placeholder="Search…"
		/>
	);
}

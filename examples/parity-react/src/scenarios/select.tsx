// Mirrors src/lib/components/docs/examples/select/BasicUsage.svelte.
import { useState } from "react";
import { Select } from "fancy-ui-react";

const frameworks = [
	{ value: "svelte", label: "Svelte 5" },
	{ value: "react", label: "React" },
	{ value: "vue", label: "Vue" },
];

export default function Scenario() {
	const [framework, setFramework] = useState("svelte");

	return (
		<Select
			sound
			options={frameworks}
			value={framework}
			onValueChange={setFramework}
			label="Framework"
			placeholder="Choose a framework"
			className="w-[220px]"
		/>
	);
}

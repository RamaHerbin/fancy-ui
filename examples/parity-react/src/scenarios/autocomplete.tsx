// Mirrors src/lib/components/docs/examples/autocomplete/BasicUsage.svelte.
import { useState } from "react";
import { Autocomplete } from "fancy-ui-react";

const cities = ["Paris", "Parma", "Prague", "London", "Lisbon", "Lyon"];

export default function Scenario() {
	const [city, setCity] = useState("");

	return (
		<Autocomplete
			sound
			suggestions={cities}
			value={city}
			onValueChange={setCity}
			label="City"
			placeholder="Type a city…"
		/>
	);
}

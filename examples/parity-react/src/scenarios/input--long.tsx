// Parity variant for scripts/parity/states.mjs; mirrors
// src/routes/_parity/[slug]/variants/input--long.svelte.
import { Input } from "fancy-ui-react";

export default function Scenario() {
	return (
		<div className="w-[260px]">
			<Input
				label="Email"
				placeholder="name@example.com"
				defaultValue="a.very.long.address.that.keeps.going.for.the.parity.bench@subdomain.example-company.com"
			/>
		</div>
	);
}

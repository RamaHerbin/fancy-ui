// Mirrors src/lib/components/docs/examples/navbar/BasicUsage.svelte.
import { useState } from "react";
import { Navbar, NavbarLink } from "fancy-ui-react";

export default function Scenario() {
	const [current, setCurrent] = useState("docs");

	return (
		<Navbar
			brand={
				<>
					<span
						className="h-2 w-2 rounded-sm bg-gradient-to-br from-purple-500 to-cyan-400"
						aria-hidden="true"
					></span>
					FancyUI
				</>
			}
		>
			<NavbarLink
				sound
				href="#docs"
				current={current === "docs"}
				onClick={() => setCurrent("docs")}
			>
				Docs
			</NavbarLink>
			<NavbarLink
				sound
				href="#components"
				current={current === "components"}
				onClick={() => setCurrent("components")}
			>
				Components
			</NavbarLink>
			<NavbarLink
				sound
				href="#showcase"
				current={current === "showcase"}
				onClick={() => setCurrent("showcase")}
			>
				Showcase
			</NavbarLink>
		</Navbar>
	);
}

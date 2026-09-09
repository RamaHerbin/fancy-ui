import pkg from "fancy-ui-react/package.json";
import { NavAnchor } from "@/components/NavAnchor";
import { Hero } from "@/components/sections/Hero";
import { Trusted } from "@/components/sections/Trusted";
import { About } from "@/components/sections/About";
import { Projects } from "@/components/sections/Projects";
import { Testimonials } from "@/components/sections/Testimonials";
import { Passions } from "@/components/sections/Passions";
import { Creative } from "@/components/sections/Creative";
import { Contact } from "@/components/sections/Contact";
import { Footer } from "@/components/sections/Footer";

// Server Component. Sections that hold state or pass handlers are client
// modules themselves; everything else renders package components straight
// from here, which is exactly what the package promises.
export default function Home() {
	const version = pkg.version;

	return (
		<>
			<NavAnchor />

			<main id="top">
				<Hero version={version} />
				<Trusted />
				<About />
				<Projects />
				<Testimonials />
				<Passions />
				<Creative />
				<Contact />
			</main>

			<Footer version={version} />
		</>
	);
}

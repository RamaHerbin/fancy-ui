import { AnimatedLogoCloud } from "fancy-ui-react";
import { c } from "@/content/content";

// The stack the package is built on. Text wordmarks, no trademarked glyphs;
// the cloud renders them `brightness-0 dark:invert`, so a black fill is right
// in both themes.
const LOGOS = [
	{ name: "React", path: "/logos/react.svg" },
	{ name: "TypeScript", path: "/logos/typescript.svg" },
	{ name: "Tailwind CSS", path: "/logos/tailwind-css.svg" },
	{ name: "Vite", path: "/logos/vite.svg" },
	{ name: "GSAP", path: "/logos/gsap.svg" },
	{ name: "three.js", path: "/logos/three-js.svg" },
	{ name: "Web Audio", path: "/logos/web-audio.svg" },
];

export function Trusted() {
	return (
		<section id="trusted" className="px-6 py-20">
			<div className="mx-auto max-w-6xl">
				<div className="mb-2 text-center">
					<h2 className="text-foreground text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
						{c("home.trusted.title")}
					</h2>
				</div>
				<AnimatedLogoCloud logos={LOGOS} />
			</div>
		</section>
	);
}

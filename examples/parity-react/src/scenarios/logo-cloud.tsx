// Mirrors src/lib/components/docs/examples/logo-cloud/BasicUsage.svelte.
import { AnimatedLogoCloud } from "fancy-ui-react";

const logos = [
	{ name: "Vercel", path: "https://svgl.app/library/vercel_wordmark.svg" },
	{ name: "Svelte", path: "https://svgl.app/library/svelte.svg" },
	{ name: "Tailwind CSS", path: "https://svgl.app/library/tailwindcss.svg" },
	{ name: "TypeScript", path: "https://svgl.app/library/typescript.svg" },
	{ name: "Prisma", path: "https://svgl.app/library/prisma.svg" },
	{ name: "Stripe", path: "https://svgl.app/library/stripe_wordmark.svg" },
];

export default function Scenario() {
	return (
		<div className="overflow-hidden rounded-lg border">
			<AnimatedLogoCloud title="Trusted by the best" logos={logos} />
		</div>
	);
}

// Mirrors src/lib/components/docs/examples/text-reveal-card/BasicUsage.svelte.
import { TextRevealCard } from "fancy-ui-react";

export default function Scenario() {
	return (
		<TextRevealCard
			text={
				<p className="bg-gradient-to-b from-white to-neutral-300 bg-clip-text py-6 text-[2rem] font-bold text-transparent md:text-[3rem]">
					I know the secret
				</p>
			}
			revealText={
				<p className="py-6 text-[2rem] font-bold text-white/10 md:text-[3rem]">Hover me to see</p>
			}
		>
			<p className="mb-4 text-lg font-bold text-white">Move your mouse to reveal</p>
		</TextRevealCard>
	);
}

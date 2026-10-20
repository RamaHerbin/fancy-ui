// Mirrors src/lib/components/docs/examples/card-3d/BasicUsage.svelte.
import { CardBody, CardContainer, CardItem } from "fancy-ui-react";

export default function Scenario() {
	return (
		<CardContainer className="inter-var">
			<CardBody className="group/card relative h-auto w-auto rounded-xl border border-black/[0.1] bg-gray-50 p-6 sm:w-[30rem] dark:border-white/[0.2] dark:bg-black dark:hover:shadow-2xl dark:hover:shadow-emerald-500/[0.1]">
				<CardItem translateZ={50} className="text-xl font-bold text-neutral-600 dark:text-white">
					Make things float in 3D
				</CardItem>
				<CardItem
					as="p"
					translateZ={60}
					className="mt-2 max-w-sm text-sm text-neutral-500 dark:text-neutral-300"
				>
					Hover over this card to see the 3D depth effect. Each element can have its own translateZ
					value.
				</CardItem>
				<CardItem translateZ={100} className="mt-4 w-full">
					<img
						src="https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=2560&auto=format&fit=crop"
						alt="Forest landscape"
						className="h-60 w-full rounded-xl object-cover group-hover/card:shadow-xl"
					/>
				</CardItem>
				<div className="mt-6 flex items-center justify-between">
					<CardItem
						translateZ={20}
						as="a"
						className="rounded-xl px-4 py-2 text-xs font-normal dark:text-white"
					>
						Try now &rarr;
					</CardItem>
					<CardItem
						translateZ={20}
						as="button"
						className="rounded-xl bg-black px-4 py-2 text-xs font-bold text-white dark:bg-white dark:text-black"
					>
						Sign up
					</CardItem>
				</div>
			</CardBody>
		</CardContainer>
	);
}

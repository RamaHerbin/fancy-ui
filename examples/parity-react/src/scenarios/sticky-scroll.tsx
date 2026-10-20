// Mirrors src/lib/components/docs/examples/sticky-scroll/BasicUsage.svelte.
import { StickyScroll } from "fancy-ui-react";

interface Step {
	eyebrow: string;
	title: string;
	body: string;
	gradient: string;
}

const steps: Step[] = [
	{
		eyebrow: "Step 1",
		title: "Compose",
		body: "Start from a blank canvas or a saved template. Every keystroke auto-saves, so a dropped connection never costs you the draft, and attachments upload quietly in the background while you keep writing.",
		gradient: "from-sky-400 to-blue-600",
	},
	{
		eyebrow: "Step 2",
		title: "Review",
		body: 'A quiet second pass catches what a first draft always misses — a broken link, a missing attachment, a subject line that still says "Draft". Reviewers leave inline notes without ever blocking the sender.',
		gradient: "from-violet-400 to-purple-600",
	},
	{
		eyebrow: "Step 3",
		title: "Send",
		body: "One click hands it to the queue, not the network — retries, rate limits, and delivery receipts are all handled for you. The moment it lands, the thread updates for everyone already watching it.",
		gradient: "from-emerald-400 to-teal-600",
	},
];

export default function Scenario() {
	return (
		<div className="w-full p-6">
			<StickyScroll
				items={steps}
				item={(step, _index, active) => (
					<div
						className={`flex min-h-[22rem] flex-col justify-center gap-3 transition-opacity duration-300${active ? "" : "opacity-40"}`}
					>
						<span className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
							{step.eyebrow}
						</span>
						<h3 className="text-foreground text-2xl font-semibold">{step.title}</h3>
						<p className="text-muted-foreground max-w-md leading-relaxed">{step.body}</p>
					</div>
				)}
				panel={(step) => (
					<div
						className={`flex h-64 w-full items-center justify-center rounded-xl bg-gradient-to-br ${step.gradient}`}
					>
						<span className="text-2xl font-semibold text-white/90">{step.title}</span>
					</div>
				)}
			/>
			<p className="text-muted-foreground mt-6 text-xs">
				Scroll this panel — the sticky preview swaps to match whichever step is centered in view.
			</p>
		</div>
	);
}

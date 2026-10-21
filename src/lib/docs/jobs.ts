import { getComponent } from "$lib/fancy-ui/registry.js";
import type { ComponentMeta } from "$lib/types.js";

/**
 * Components grouped by the job you are hiring them for, rather than by how
 * they are built. A test checks every slug against the registry, so a rename
 * or removal there fails here instead of shipping a dead link.
 */
export interface Job {
	id: string;
	title: string;
	blurb: string;
	slugs: string[];
}

export const JOBS: Job[] = [
	{
		id: "feedback",
		title: "Give feedback",
		blurb: "Tell people what just happened, without getting in the way.",
		slugs: ["toast", "status-morph", "copy-button", "confetti", "skeleton", "typing-indicator"],
	},
	{
		id: "input",
		title: "Collect an input",
		blurb: "Get a value from someone, from a single field to a whole form.",
		slugs: [
			"input",
			"form-field",
			"select",
			"combobox",
			"date-picker",
			"file-upload",
			"slider",
			"checkbox",
		],
	},
	{
		id: "attention",
		title: "Guide attention",
		blurb: "Point at the one thing that matters on the page.",
		slugs: [
			"card-spotlight",
			"glowing-effect",
			"border-beam",
			"pulse-beam",
			"dim-siblings",
			"tooltip",
		],
	},
	{
		id: "navigate",
		title: "Navigate",
		blurb: "Move between pages, sections and states.",
		slugs: ["navbar", "tabs", "breadcrumb", "pagination", "command-menu", "tick-nav", "sidebar"],
	},
	{
		id: "progress",
		title: "Show progress",
		blurb: "Make waiting, steps and scrolling feel measured.",
		slugs: [
			"stepper",
			"scroll-progress",
			"tracing-beam",
			"number-ticker",
			"pixel-loader",
			"timeline",
		],
	},
	{
		id: "surprise",
		title: "Surprise",
		blurb: "Moments of delight for heroes, empty states and landing pages.",
		slugs: [
			"meteors",
			"matrix-rain",
			"fireworks-hdr",
			"glare-card",
			"flip-card",
			"liquid-glass",
			"mosaic-glow",
		],
	},
];

export const jobHref = (slug: string) => `/docs/components/${slug}`;

/** The registry entries behind a job, in the job's order. */
export function jobComponents(job: Job): ComponentMeta[] {
	return job.slugs.flatMap((slug) => {
		const c = getComponent(slug);
		return c ? [c] : [];
	});
}

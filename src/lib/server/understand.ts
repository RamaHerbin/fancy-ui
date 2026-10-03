/**
 * "Describe an interaction" → gallery filters.
 *
 * A visitor's sentence ("a button that glows when I hover it") is turned into
 * the gallery's own closed vocabulary by a structured-decision model: one
 * request asks three single-choice questions over the sentence — which
 * interaction, which style, which object — and every answer comes back as one
 * of our labels with a probability distribution. Nothing is generated, so the
 * result can only ever be a filter the gallery already understands.
 *
 * A facet is applied only when the model is confident; everything else falls
 * back to the plain text search, so a wrong guess costs a chip the visitor
 * can remove, never an empty page.
 *
 * Server-only: the API key never reaches the browser (see the route in
 * src/routes/api/inspiration/understand).
 */

import { choice, type ChoiceResponse, type TypeSafeClient } from "@typesafe-ai/sdk";
import { PUBLISHED } from "$lib/inspiration/catalog.js";
import {
	INTERACTIONS,
	INTERACTION_LABELS,
	STYLES,
	STYLE_LABELS,
	type Interaction,
	type Style,
} from "$lib/inspiration/types.js";

/** Label every question gets for "the sentence does not say". */
const NONE = "none";

/** Below this confidence a facet is not applied (the text search takes over). */
export const MIN_CONFIDENCE = 0.5;
/** A runner-up label is added (OR within the facet) when it is at least this likely… */
export const SECOND_MIN_PROBABILITY = 0.25;
/** …and at least this fraction of the top label's probability. */
export const SECOND_RATIO = 0.6;

const INTERACTION_CRITERIA: Record<Interaction | typeof NONE, string> = {
	hover: "The pointer moves over or near the element; it reacts without a click.",
	press: "The visitor clicks, taps or presses the element.",
	drag: "The visitor drags, swipes, pulls or slides something.",
	type: "The visitor types text into a field.",
	select: "The visitor picks an option, toggles a switch or changes a tab.",
	scroll: "Scrolling the page drives the effect.",
	ambient: "It moves or glows on its own, with no input from the visitor.",
	[NONE]: "The sentence does not say how the visitor interacts.",
};

const STYLE_CRITERIA: Record<Style | typeof NONE, string> = {
	glow: "Light, glow, neon, halos, beams or shine.",
	glass: "Glass, frosted, translucent or refracting surfaces.",
	iridescent: "Rainbow, holographic, oil-slick or multicolour shifting colour.",
	minimal: "Plain, quiet, monochrome, understated.",
	playful: "Bouncy, fun, springy, toy-like.",
	editorial: "Typography-led, magazine-like, refined text.",
	physical: "Feels like a real object: weight, tilt, depth, spring physics.",
	retro: "Pixel, terminal, CRT, old operating systems, vintage.",
	brutal: "Raw, heavy borders, stark blocks.",
	[NONE]: "The sentence does not describe a visual style.",
};

/**
 * Objects come from the catalog itself ("Button — magnetic pull" → "button"),
 * so the question can only answer with a word that matches at least one title.
 */
export function catalogSubjects(
	titles: readonly string[] = PUBLISHED.map((e) => e.title)
): string[] {
	const subjects = new Set<string>();
	for (const title of titles) {
		const head = title.split(" — ")[0]?.trim().toLowerCase();
		if (head && head.length <= 24) subjects.add(head);
	}
	return [...subjects].sort();
}

export function buildQuestions(subjects: readonly string[] = catalogSubjects()) {
	const subjectCriteria: Record<string, string | null> = {
		[NONE]: "No particular kind of element.",
	};
	for (const subject of subjects) subjectCriteria[subject] = null;
	return {
		interaction: choice(
			"How does the visitor trigger the interface element described in the request?",
			INTERACTION_CRITERIA
		),
		style: choice("Which visual style does the request ask for?", STYLE_CRITERIA),
		subject: choice("Which kind of interface element is the request about?", subjectCriteria),
	};
}

export type UnderstandQuestions = ReturnType<typeof buildQuestions>;

export interface UnderstoodChip {
	facet: "interaction" | "style" | "subject";
	value: string;
	label: string;
	/** The model's confidence for this facet, 0–1. */
	confidence: number;
}

export interface Understanding {
	interaction: Interaction[];
	style: Style[];
	/** Becomes the text query (matched against titles); null when unsure. */
	subject: string | null;
	chips: UnderstoodChip[];
}

/** Picks the confident labels of one answer: the top one, plus a close runner-up. */
export function pickLabels(
	answer: Pick<ChoiceResponse, "choice" | "confidence" | "probabilities">
): string[] {
	if (answer.choice === NONE || answer.confidence < MIN_CONFIDENCE) return [];
	const ranked = Object.entries(answer.probabilities as Record<string, number>)
		.filter(([label]) => label !== NONE)
		.sort((a, b) => b[1] - a[1]);
	const [top, second] = ranked;
	if (!top || top[0] !== answer.choice) return [answer.choice];
	const labels = [top[0]];
	if (second && second[1] >= SECOND_MIN_PROBABILITY && second[1] >= top[1] * SECOND_RATIO) {
		labels.push(second[0]);
	}
	return labels;
}

type Answers = {
	interaction: Pick<ChoiceResponse, "choice" | "confidence" | "probabilities">;
	style: Pick<ChoiceResponse, "choice" | "confidence" | "probabilities">;
	subject: Pick<ChoiceResponse, "choice" | "confidence" | "probabilities">;
};

/** Pure: model answers → gallery filters and the chips that explain them. */
export function interpret(answers: Answers): Understanding {
	const interaction = pickLabels(answers.interaction).filter((v): v is Interaction =>
		(INTERACTIONS as readonly string[]).includes(v)
	);
	const style = pickLabels(answers.style).filter((v): v is Style =>
		(STYLES as readonly string[]).includes(v)
	);
	const subject = pickLabels(answers.subject)[0] ?? null;

	const chips: UnderstoodChip[] = [
		...interaction.map((value) => ({
			facet: "interaction" as const,
			value,
			label: INTERACTION_LABELS[value],
			confidence: answers.interaction.confidence,
		})),
		...style.map((value) => ({
			facet: "style" as const,
			value,
			label: STYLE_LABELS[value],
			confidence: answers.style.confidence,
		})),
		...(subject
			? [
					{
						facet: "subject" as const,
						value: subject,
						label: subject[0].toUpperCase() + subject.slice(1),
						confidence: answers.subject.confidence,
					},
				]
			: []),
	];
	return { interaction, style, subject, chips };
}

/** The slice of the client this module needs — lets tests pass a fake. */
export type SystemOneClient = Pick<TypeSafeClient, "systemOne">;

export const QUERY_MIN = 3;
export const QUERY_MAX = 200;

/** One model call. Throws whatever the client throws; the route turns it into a fallback. */
export async function understand(
	client: SystemOneClient,
	query: string,
	options: { timeout?: number; signal?: AbortSignal } = {}
): Promise<Understanding> {
	const { answers } = await client.systemOne(
		{ state: { request: query.trim().slice(0, QUERY_MAX) }, questions: buildQuestions() },
		{ timeout: options.timeout ?? 1500, signal: options.signal, retry: { maxRetries: 0 } }
	);
	return interpret(answers);
}

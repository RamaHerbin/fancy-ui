import { describe, expect, it, vi } from "vitest";
import {
	MIN_CONFIDENCE,
	buildQuestions,
	catalogSubjects,
	interpret,
	pickLabels,
	understand,
	type SystemOneClient,
} from "./understand.js";
import { INTERACTIONS, STYLES } from "$lib/inspiration/types.js";
import { PUBLISHED } from "$lib/inspiration/catalog.js";
import { applyFilters, EMPTY_FILTERS } from "$lib/inspiration/query.js";

const answer = (probabilities: Record<string, number>, confidence = 0.9) => {
	const choice = Object.entries(probabilities).sort((a, b) => b[1] - a[1])[0][0];
	return { choice, confidence, probabilities };
};

describe("catalogSubjects / buildQuestions", () => {
	it("derives object words from the catalog titles", () => {
		expect(
			catalogSubjects(["Button — magnetic pull", "Card — cursor spotlight", "Button — roll"])
		).toEqual(["button", "card"]);
	});

	it("asks three closed questions whose options are the gallery's own vocabulary plus none", () => {
		const q = buildQuestions(["button", "card"]);
		expect(q.interaction.type).toBe("choice");
		expect(Object.keys(q.interaction.criteria).sort()).toEqual([...INTERACTIONS, "none"].sort());
		expect(Object.keys(q.style.criteria).sort()).toEqual([...STYLES, "none"].sort());
		expect(Object.keys(q.subject.criteria).sort()).toEqual(["button", "card", "none"]);
	});

	it("stays within the model's option limit for the real catalog", () => {
		const q = buildQuestions();
		expect(Object.keys(q.subject.criteria).length).toBeLessThanOrEqual(255);
	});
});

describe("pickLabels", () => {
	it("keeps a confident top label", () => {
		expect(pickLabels(answer({ hover: 0.8, press: 0.1, none: 0.1 }))).toEqual(["hover"]);
	});

	it("drops low confidence and `none`", () => {
		expect(
			pickLabels(answer({ hover: 0.4, press: 0.35, none: 0.25 }, MIN_CONFIDENCE - 0.01))
		).toEqual([]);
		expect(pickLabels(answer({ none: 0.9, hover: 0.1 }))).toEqual([]);
	});

	it("adds a close runner-up (OR within the facet)", () => {
		expect(pickLabels(answer({ glow: 0.5, glass: 0.35, none: 0.15 }))).toEqual(["glow", "glass"]);
		expect(pickLabels(answer({ glow: 0.7, glass: 0.2, none: 0.1 }))).toEqual(["glow"]);
	});
});

describe("interpret", () => {
	it("turns answers into filters and explanatory chips", () => {
		const reading = interpret({
			interaction: answer({ hover: 0.85, press: 0.1, none: 0.05 }, 0.82),
			style: answer({ glow: 0.9, none: 0.1 }, 0.88),
			subject: answer({ button: 0.75, card: 0.2, none: 0.05 }, 0.7),
		});
		expect(reading.interaction).toEqual(["hover"]);
		expect(reading.style).toEqual(["glow"]);
		expect(reading.subject).toBe("button");
		expect(reading.chips.map((c) => `${c.facet}:${c.label}`)).toEqual([
			"interaction:Hover",
			"style:Glow",
			"subject:Button",
		]);
	});

	it("never emits a value outside the vocabulary", () => {
		const reading = interpret({
			interaction: answer({ wiggle: 0.9, none: 0.1 }),
			style: answer({ none: 1 }),
			subject: answer({ none: 1 }),
		});
		expect(reading.interaction).toEqual([]);
		expect(reading.chips).toEqual([]);
	});

	it("produces filters that find real catalog entries", () => {
		const reading = interpret({
			interaction: answer({ hover: 0.9, none: 0.1 }),
			style: answer({ glow: 0.9, none: 0.1 }),
			subject: answer({ none: 1 }),
		});
		const results = applyFilters(PUBLISHED, {
			...EMPTY_FILTERS,
			interaction: reading.interaction,
			style: reading.style,
		});
		expect(results.length).toBeGreaterThan(0);
	});
});

describe("understand", () => {
	it("sends the sentence as state with a short, single attempt", async () => {
		const systemOne = vi.fn().mockResolvedValue({
			model: "jev-latest",
			usage: { input_tokens: 10, output_tokens: 3 },
			answers: {
				interaction: answer({ hover: 0.9, none: 0.1 }),
				style: answer({ none: 1 }),
				subject: answer({ none: 1 }),
			},
		});
		const client = { systemOne } as unknown as SystemOneClient;
		const reading = await understand(client, "  a card that reacts on hover  ");
		expect(reading.interaction).toEqual(["hover"]);
		const [request, options] = systemOne.mock.calls[0];
		expect(request.state).toEqual({ request: "a card that reacts on hover" });
		expect(Object.keys(request.questions)).toEqual(["interaction", "style", "subject"]);
		expect(options.retry).toEqual({ maxRetries: 0 });
		expect(options.timeout).toBeLessThanOrEqual(2000);
	});

	it("propagates client errors so the route can fall back", async () => {
		const client = {
			systemOne: vi.fn().mockRejectedValue(new Error("boom")),
		} as unknown as SystemOneClient;
		await expect(understand(client, "a glowing button")).rejects.toThrow("boom");
	});
});

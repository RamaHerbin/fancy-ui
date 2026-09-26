import { render, cleanup, fireEvent } from "@testing-library/vue";
import { defineComponent, h, ref, type PropType } from "vue";
import { afterEach, describe, it, expect, vi } from "vitest";
import type { SourceData } from "../../internals/ai-types.js";
import Sources from "./Sources.vue";
import SourcesTrigger from "./SourcesTrigger.vue";
import SourcesList from "./SourcesList.vue";
import { sound } from "../../sound/sound.js";

const SOURCES: SourceData[] = [
	{
		id: "s1",
		title: "Designing citation surfaces",
		url: "https://docs.example.dev/citations",
		domain: "docs.example.dev",
		snippet: "A citation is a promise that the answer can be checked.",
	},
	{
		id: "s2",
		title: "Attribution in generated answers",
		url: "https://research.example.org/attribution",
		domain: "research.example.org",
	},
	{ id: "s3", title: "Ranking retrieved passages", url: "https://notes.example.net/ranking" },
	{ id: "s4", title: "An uncited note", url: "" },
];

/**
 * The composition rig the Svelte suite keeps in a `.test.svelte` file. Slots
 * that mount components cannot be spelled as strings here, so the parts are
 * exercised through a real render function — which is also the only way to
 * prove they read the context the root actually publishes, rather than one the
 * test invented. The bound `open` is echoed into the DOM so a test can watch
 * `v-model:open` write outwards.
 */
const Harness = defineComponent({
	name: "SourcesHarness",
	props: {
		sources: { type: Array as PropType<SourceData[]>, required: true },
		open: { type: Boolean, default: false },
		label: { type: String, default: undefined },
		onToggle: { type: Function as PropType<(open: boolean) => void>, default: undefined },
		/** Swaps the default card for the local row slot below. */
		customItem: { type: Boolean, default: false },
		sound: { type: Boolean, default: false },
	},
	setup(props) {
		const open = ref(props.open);
		return () => [
			h(
				Sources,
				{
					sources: props.sources,
					open: open.value,
					"onUpdate:open": (next: boolean) => {
						open.value = next;
					},
					onToggle: props.onToggle,
					sound: props.sound,
				},
				{
					default: () => [
						h(SourcesTrigger, { label: props.label }),
						h(
							SourcesList,
							{},
							props.customItem
								? {
										item: ({ source, index }: { source: SourceData; index: number }) =>
											h("span", { "data-testid": "custom-item" }, `${index}:${source.title}`),
									}
								: {}
						),
					],
				}
			),
			h("span", { "data-testid": "bound-open" }, String(open.value)),
		];
	},
});

function trigger(container: Element): HTMLButtonElement {
	return container.querySelector("button") as HTMLButtonElement;
}

function cards(container: Element): NodeListOf<HTMLElement> {
	return container.querySelectorAll(".ft-source-card");
}

function list(container: Element): HTMLElement {
	return container.querySelector("ul") as HTMLElement;
}

describe("Sources", () => {
	afterEach(cleanup);

	it("renders a trigger and a list without being given any children", () => {
		const { container } = render(Sources, { props: { sources: SOURCES } });

		expect(trigger(container)).toBeTruthy();
		expect(trigger(container).getAttribute("aria-expanded")).toBe("false");
		expect(cards(container)).toHaveLength(SOURCES.length);
	});

	it("starts closed, and says so on the root and the region", () => {
		const { container } = render(Sources, { props: { sources: SOURCES } });

		expect((container.querySelector(".ft-sources") as HTMLElement).dataset.open).toBe("false");
		expect(container.querySelector(".ft-sources-list")?.className).not.toContain("ft-open");
		// Collapsed cards are links: leaving them reachable would drop the keyboard
		// into content nobody can see. The attribute is the spelling that carries
		// here — `inert="false"` would still be inert — so its presence is what
		// there is to check, and it is also what applies inertness in a browser.
		expect(list(container).hasAttribute("inert")).toBe(true);
	});

	it("opens on click and reports the new state", async () => {
		const onToggle = vi.fn();
		const { container } = render(Sources, { props: { sources: SOURCES, onToggle } });

		await fireEvent.click(trigger(container));
		expect(trigger(container).getAttribute("aria-expanded")).toBe("true");
		expect(list(container).hasAttribute("inert")).toBe(false);
		expect(onToggle).toHaveBeenLastCalledWith(true);

		await fireEvent.click(trigger(container));
		expect(trigger(container).getAttribute("aria-expanded")).toBe("false");
		expect(onToggle).toHaveBeenLastCalledWith(false);
		expect(onToggle).toHaveBeenCalledTimes(2);
	});

	it("honours an initial open, and follows the prop when it changes", async () => {
		const { container, rerender } = render(Sources, {
			props: { sources: SOURCES, open: true },
		});
		expect(trigger(container).getAttribute("aria-expanded")).toBe("true");

		await rerender({ sources: SOURCES, open: false });
		expect(trigger(container).getAttribute("aria-expanded")).toBe("false");
	});

	it("writes the open state back out through the binding", async () => {
		const { container, getByTestId } = render(Harness, { props: { sources: SOURCES } });
		expect(getByTestId("bound-open").textContent).toBe("false");

		await fireEvent.click(trigger(container));
		expect(getByTestId("bound-open").textContent).toBe("true");

		await fireEvent.click(trigger(container));
		expect(getByTestId("bound-open").textContent).toBe("false");
	});

	it("counts the sources in the trigger label, singular at one", () => {
		const many = render(Sources, { props: { sources: SOURCES } });
		expect(trigger(many.container).textContent).toContain("4 sources");

		cleanup();
		const one = render(Sources, { props: { sources: [SOURCES[0] as SourceData] } });
		expect(trigger(one.container).textContent).toContain("1 source");
		expect(trigger(one.container).textContent).not.toContain("1 sources");
	});

	it("survives an empty source list", () => {
		const { container } = render(Sources, { props: { sources: [] } });

		expect(trigger(container).textContent).toContain("0 sources");
		expect(cards(container)).toHaveLength(0);
		expect(container.querySelector(".ft-sources-stack")).toBeFalsy();
	});

	it("renders one card per source, in order", () => {
		const { container } = render(Sources, { props: { sources: SOURCES, open: true } });
		const titles = [...cards(container)].map((card) =>
			card.querySelector(".ft-source-title")?.textContent?.trim()
		);

		expect(titles).toEqual(SOURCES.map((source) => source.title));
	});

	it("reacts to a new set of sources", async () => {
		const { container, rerender } = render(Sources, { props: { sources: SOURCES } });
		expect(cards(container)).toHaveLength(4);

		await rerender({ sources: SOURCES.slice(0, 2) });
		expect(cards(container)).toHaveLength(2);
		expect(trigger(container).textContent).toContain("2 sources");
	});

	it("lets children replace the default composition entirely", () => {
		const { container } = render(Sources, {
			props: { sources: SOURCES },
			slots: { default: '<p data-testid="custom">Mine</p>' },
		});

		expect(container.querySelector('[data-testid="custom"]')?.textContent).toBe("Mine");
		expect(trigger(container)).toBeFalsy();
		expect(cards(container)).toHaveLength(0);
	});

	it("points the trigger at the region it controls", () => {
		const { container } = render(Sources, { props: { sources: SOURCES } });
		const controls = trigger(container).getAttribute("aria-controls");

		expect(controls).toBeTruthy();
		expect(list(container).id).toBe(controls);
	});

	it("merges custom classes onto the root", () => {
		const { container } = render(Sources, {
			props: { sources: SOURCES, class: "my-sources" },
		});
		const root = container.querySelector(".ft-sources") as HTMLElement;

		expect(root.className).toContain("my-sources");
		expect(root.className).toContain("ft-sources");
	});

	it("composes its parts without warnings", async () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		const error = vi.spyOn(console, "error").mockImplementation(() => {});

		const { container } = render(Harness, { props: { sources: SOURCES } });
		await fireEvent.click(trigger(container));

		expect(cards(container)).toHaveLength(SOURCES.length);
		expect(warn).not.toHaveBeenCalled();
		expect(error).not.toHaveBeenCalled();
		warn.mockRestore();
		error.mockRestore();
	});

	describe("sound", () => {
		afterEach(() => {
			vi.restoreAllMocks();
		});

		it("plays open, then close, exactly once each as the trigger is toggled, with sound enabled", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(Sources, { props: { sources: SOURCES, sound: true } });

			await fireEvent.click(trigger(container));
			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenLastCalledWith("open", undefined);

			await fireEvent.click(trigger(container));
			expect(play).toHaveBeenCalledTimes(2);
			expect(play).toHaveBeenLastCalledWith("close", undefined);
		});

		it("plays nothing by default (sound prop omitted)", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(Sources, { props: { sources: SOURCES } });

			await fireEvent.click(trigger(container));

			expect(play).not.toHaveBeenCalled();
		});

		it("never plays for a v-model:open write that bypasses toggle() — only a real activation goes through it", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { rerender } = render(Sources, { props: { sources: SOURCES, sound: true } });

			await rerender({ sources: SOURCES, open: true, sound: true });

			expect(play).not.toHaveBeenCalled();
		});

		it("does not double-fire: one click plays one cue, not two", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(Sources, { props: { sources: SOURCES, sound: true } });

			await fireEvent.click(trigger(container));

			expect(play).toHaveBeenCalledTimes(1);
		});
	});
});

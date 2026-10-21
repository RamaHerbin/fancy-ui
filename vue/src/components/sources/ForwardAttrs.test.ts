import { render, cleanup, fireEvent } from "@testing-library/vue";
import { defineComponent, h, nextTick, type PropType } from "vue";
import { afterEach, describe, it, expect, vi } from "vitest";

import Sources from "./Sources.vue";
import SourcesTrigger from "./SourcesTrigger.vue";
import SourcesList from "./SourcesList.vue";

afterEach(cleanup);

type Bag = Record<string, unknown>;

const SOURCES = [
	{ id: "1", title: "One", url: "https://one.example/a" },
	{ id: "2", title: "Two", url: "https://two.example/b" },
];

/** The sources trigger carrying a consumer attribute bag inside a real root. */
const Harness = defineComponent({
	name: "ForwardAttrsHarness",
	props: { attrs: { type: Object as PropType<Bag>, default: () => ({}) } },
	setup(props) {
		return () =>
			h(
				Sources,
				{ sources: SOURCES },
				{
					default: () => [h(SourcesTrigger, props.attrs), h(SourcesList)],
				}
			);
	},
});

const trigger = () => document.querySelector(".ft-sources-trigger") as HTMLButtonElement;

describe("SourcesTrigger forwards native attributes", () => {
	it("puts id, data-testid and aria-describedby on the button", () => {
		render(Harness, {
			props: { attrs: { id: "src", "data-testid": "t", "aria-describedby": "hint" } },
		});
		expect(trigger().id).toBe("src");
		expect(trigger().getAttribute("data-testid")).toBe("t");
		expect(trigger().getAttribute("aria-describedby")).toBe("hint");
	});

	it("fires a listener the component does not handle once", async () => {
		const onBlur = vi.fn();
		const onFocus = vi.fn();
		render(Harness, { props: { attrs: { onBlur, onFocus } } });
		await fireEvent.blur(trigger());
		await fireEvent.focus(trigger());
		expect(onBlur).toHaveBeenCalledTimes(1);
		expect(onFocus).toHaveBeenCalledTimes(1);
	});

	it("runs the consumer onClick once, after the list toggled", async () => {
		const onClick = vi.fn();
		render(Harness, { props: { attrs: { onClick } } });
		await fireEvent.click(trigger());
		expect(onClick).toHaveBeenCalledTimes(1);
		expect(trigger().getAttribute("aria-expanded")).toBe("true");
	});

	it("keeps aria-expanded and aria-controls authoritative and type fixed", () => {
		render(Harness, {
			props: { attrs: { "aria-expanded": "true", "aria-controls": "x", type: "submit" } },
		});
		expect(trigger().getAttribute("aria-expanded")).toBe("false");
		expect(trigger().getAttribute("aria-controls")).not.toBe("x");
		expect(trigger().type).toBe("button");
	});

	it("applies an attribute added by a re-render", async () => {
		const { rerender } = render(Harness);
		await rerender({ attrs: { "data-late": "yes" } });
		await nextTick();
		expect(trigger().getAttribute("data-late")).toBe("yes");
	});
});

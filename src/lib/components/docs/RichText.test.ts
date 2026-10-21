import { render, cleanup } from "@testing-library/svelte";
import { afterEach, describe, expect, it } from "vitest";
import { parseRich } from "$lib/i18n/format.js";
import RichText from "./RichText.svelte";

describe("RichText", () => {
	afterEach(() => cleanup());

	it("renders bold, gradient and solid spans and keeps the surrounding text", () => {
		const { container } = render(RichText, {
			props: {
				segments: parseRich(
					"is <grad>{count}</grad> parts, <solid>solid</solid> and <b>bold</b>.",
					{
						count: 152,
					}
				),
			},
		});
		expect(container.textContent).toBe("is 152 parts, solid and bold.");
		expect(container.querySelector("span.grad")?.textContent).toBe("152");
		expect(container.querySelector("span.solid")?.textContent).toBe("solid");
		expect(container.querySelector("strong")?.textContent).toBe("bold");
	});

	it("gives every <link> the href passed in, one value or one per tag", () => {
		const segments = parseRich("a <link>one</link> b <link>two</link>");
		const one = render(RichText, { props: { segments, links: "/docs/x" } });
		expect([...one.container.querySelectorAll("a")].map((a) => a.getAttribute("href"))).toEqual([
			"/docs/x",
			"/docs/x",
		]);
		cleanup();
		const many = render(RichText, { props: { segments, links: ["/a", "/b"] } });
		expect([...many.container.querySelectorAll("a")].map((a) => a.getAttribute("href"))).toEqual([
			"/a",
			"/b",
		]);
	});

	it("never renders markup that is not one of the four tags", () => {
		const { container } = render(RichText, {
			props: {
				segments: parseRich("<img src=x onerror=alert(1)> and {v}", { v: "<script>x</script>" }),
			},
		});
		expect(container.querySelector("img")).toBeNull();
		expect(container.querySelector("script")).toBeNull();
		expect(container.textContent).toContain("<img src=x onerror=alert(1)>");
		expect(container.textContent).toContain("<script>x</script>");
	});
});

import { describe, expect, it } from "vitest";
import { copyCommandFor } from "$lib/copy-source.js";
import { load } from "./+page.server.js";

type Loaded = Exclude<Awaited<ReturnType<typeof load>>, void>;

const run = (slug: string) => load({ params: { slug } } as Parameters<typeof load>[0]) as Loaded;

describe("component page data", () => {
	it("carries a copy source per framework, so the install block offers its copy tab", () => {
		const { copySource } = run("rainbow-button");
		expect(copySource.svelte).toEqual({
			command: copyCommandFor("rainbow-button", "svelte"),
			importLine: 'import { RainbowButton } from "$lib/components/ui/fancy/rainbow-button";',
		});
		expect(copySource.react).toEqual({
			command: copyCommandFor("rainbow-button", "react"),
			importLine:
				'import { RainbowButton } from "@/components/ui/fancy/components/rainbow-button";',
		});
		expect(copySource.vue).toEqual({
			command: copyCommandFor("rainbow-button", "vue"),
			importLine:
				'import { RainbowButton } from "@/components/ui/fancy/components/rainbow-button";',
		});
	});

	it("imports the sound module from where the copy lands", () => {
		const { copySource } = run("sound");
		expect(copySource.react?.importLine).toMatch(/from "@\/components\/ui\/fancy\/sound";$/);
		expect(copySource.vue?.importLine).toMatch(/from "@\/components\/ui\/fancy\/sound";$/);
	});

	it("links the Markdown page of every framework that has one", () => {
		expect(run("rainbow-button").markdown).toEqual({
			svelte: "/docs/components/rainbow-button.md",
			react: "/docs/components/react/rainbow-button.md",
			vue: "/docs/components/vue/rainbow-button.md",
		});
	});

	it("offers nothing for an unknown slug", () => {
		const data = run("definitely-not-a-component");
		expect(data.copySource).toEqual({ svelte: null, react: null, vue: null });
	});
});

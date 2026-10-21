import { describe, expect, it } from "vitest";
import { copyCommandFor } from "$lib/copy-source.js";
import type { FrameworkVariant } from "$lib/server/variants.js";
import { load } from "./+page.server.js";

type Loaded = Exclude<Awaited<ReturnType<typeof load>>, void>;

const run = (slug: string) => load({ params: { slug } } as Parameters<typeof load>[0]) as Loaded;

describe("component page data", () => {
	it("carries a copy line per framework, so the install block offers its copy tab", () => {
		const [svelte, react, vue] = run("rainbow-button").variants;
		expect(svelte).toMatchObject({
			copyLine: copyCommandFor("rainbow-button", "svelte"),
			copyImportLine: 'import { RainbowButton } from "$lib/components/ui/fancy/rainbow-button";',
		});
		expect(react).toMatchObject({
			copyLine: copyCommandFor("rainbow-button", "react"),
			copyImportLine:
				'import { RainbowButton } from "@/components/ui/fancy/components/rainbow-button";',
		});
		expect(vue).toMatchObject({
			copyLine: copyCommandFor("rainbow-button", "vue"),
			copyImportLine:
				'import { RainbowButton } from "@/components/ui/fancy/components/rainbow-button";',
		});
	});

	it("imports the sound module from where the copy lands", () => {
		const [, react, vue] = run("sound").variants;
		expect(react.copyImportLine).toMatch(/from "@\/components\/ui\/fancy\/sound";$/);
		expect(vue.copyImportLine).toMatch(/from "@\/components\/ui\/fancy\/sound";$/);
	});

	it("keeps the copy tab in one place: the variants, not a second page-level table", () => {
		expect(run("rainbow-button")).not.toHaveProperty("copySource");
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
		expect(data.variants.map((v: FrameworkVariant) => v.copyLine)).toEqual([null, null, null]);
	});
});

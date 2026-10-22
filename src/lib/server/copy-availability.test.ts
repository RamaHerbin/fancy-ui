import { describe, expect, it } from "vitest";
import { getAllComponents } from "$lib/fancy-ui/registry.js";
import { copyCommandFor } from "$lib/copy-source.js";
import { FRAMEWORKS } from "$lib/inspiration/types.js";
import { registryOutput, svelteRegistryOutput, vueRegistryOutput } from "./registry/sources.js";
import { copySourceFor, copySourcesFor } from "./copy-availability.js";

const outputs = {
	svelte: svelteRegistryOutput(),
	react: registryOutput(),
	vue: vueRegistryOutput(),
} as const;

describe("copySourceFor", () => {
	it("points each framework at its own registry item, with the command the docs print", () => {
		const svelte = copySourceFor("rainbow-button", "svelte");
		const react = copySourceFor("rainbow-button", "react");
		const vue = copySourceFor("rainbow-button", "vue");
		expect(svelte?.url).toBe("https://fancy-ui.rama.app/r/svelte/rainbow-button.json");
		expect(react?.url).toBe("https://fancy-ui.rama.app/r/rainbow-button.json");
		expect(vue?.url).toBe("https://fancy-ui.rama.app/r/vue/rainbow-button.json");
		expect(svelte?.command).toBe(copyCommandFor("rainbow-button", "svelte"));
		expect(react?.command).toBe(copyCommandFor("rainbow-button", "react"));
		expect(vue?.command).toBe(copyCommandFor("rainbow-button", "vue"));
		expect(svelte?.importPath).toBe("$lib/components/ui/fancy/rainbow-button");
		expect(react?.importPath).toBe("@/components/ui/fancy/components/rainbow-button");
		expect(vue?.importPath).toBe("@/components/ui/fancy/components/rainbow-button");
	});

	it("imports a shared module from where the CLI writes it, not from the components folder", () => {
		// The sound page documents the shared sound module: React and Vue write it
		// next to `components/`, not inside it.
		expect(copySourceFor("sound", "react")?.importPath).toBe("@/components/ui/fancy/sound");
		expect(copySourceFor("sound", "vue")?.importPath).toBe("@/components/ui/fancy/sound");
		expect(copySourceFor("sound", "svelte")?.importPath).toBe("$lib/components/ui/fancy/sound");
	});

	it("returns null when the stack ships no item for the slug", () => {
		for (const fw of FRAMEWORKS) expect(copySourceFor("definitely-not-a-component", fw)).toBeNull();
		// Shared items that are not component pages never become one.
		expect(copySourceFor("internals", "react")).toBeNull();
		expect(copySourceFor("utils", "react")).toBeNull();
	});

	it("offers a copy source exactly for the slugs each registry ships", () => {
		for (const c of getAllComponents()) {
			const sources = copySourcesFor(c.slug);
			for (const fw of FRAMEWORKS) {
				const { items } = outputs[fw];
				const shipped = Object.hasOwn(items, c.slug);
				expect(sources[fw] !== null, `${fw}/${c.slug}`).toBe(shipped);
				if (sources[fw])
					expect(sources[fw]!.url.endsWith(`/${items[c.slug].name}.json`)).toBe(true);
			}
		}
	});
});

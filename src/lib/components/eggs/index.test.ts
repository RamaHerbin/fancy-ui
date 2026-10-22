import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { EGGS, EGG_TOTAL, EGG_IDS } from "./index.js";

const DIR = join(process.cwd(), "src/lib/components/eggs");

describe("egg registry", () => {
	it("has unique, known ids and unique orders", () => {
		const ids = EGGS.map((e) => e.id);
		expect(new Set(ids).size).toBe(ids.length);
		for (const id of ids) expect(EGG_IDS).toContain(id);
		const orders = EGGS.map((e) => e.order);
		expect(new Set(orders).size).toBe(orders.length);
		expect(orders).toEqual([...orders].sort((a, b) => a - b));
	});

	it("gives every egg a title and a hint", () => {
		for (const egg of EGGS) {
			expect(egg.title.trim()).not.toBe("");
			expect(egg.hint.trim()).not.toBe("");
		}
	});

	it("counts only visible eggs", () => {
		expect(EGG_TOTAL).toBe(EGGS.filter((e) => !e.hidden).length);
	});

	it("registers one def per egg folder", () => {
		const folders = readdirSync(DIR, { withFileTypes: true })
			.filter((d) => d.isDirectory() && existsSync(join(DIR, d.name, "index.ts")))
			.map((d) => d.name);
		expect(EGGS.map((e) => e.id).sort()).toEqual(folders.sort());
	});

	it("keeps payloads out of the eager egg defs (dynamic import() only)", () => {
		const forbidden = /(\.svelte["']|\$lib\/fancy-ui|\$lib\/cameleon|canvas-confetti)/;
		const files = readdirSync(DIR, { withFileTypes: true })
			.filter((d) => d.isDirectory())
			.map((d) => join(DIR, d.name, "index.ts"))
			.filter((f) => existsSync(f));
		expect(files.length).toBeGreaterThan(0);
		for (const file of files) {
			const src = readFileSync(file, "utf8");
			// Static `import ... from "x"` / `import "x"` / `export ... from "x"`, not `import("x")`.
			const statics = src.match(/^\s*(?:import|export)\b(?!\s*\()[^;]*?["'][^"']+["']/gm) ?? [];
			for (const stmt of statics) {
				expect(forbidden.test(stmt), `${file}: ${stmt.trim()}`).toBe(false);
			}
		}
	});
});

import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { hasComponent } from "$lib/fancy-ui/registry.js";
import { ENTRIES, MEDIA_MANIFEST, PUBLISHED, featured, isFancyUI } from "./catalog.js";

const demos = import.meta.glob("./demos/*.svelte");
const sources = import.meta.glob("./entries/*.ts", {
	query: "?raw",
	import: "default",
	eager: true,
}) as Record<string, string>;

const staticDir = join(process.cwd(), "static");
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

describe("inspiration catalog", () => {
	it("has no duplicate tags or clues within an entry (they key {#each} blocks)", () => {
		for (const entry of ENTRIES) {
			const lists = {
				styleTags: entry.styleTags,
				interactionTags: entry.interactionTags,
				useCaseTags: entry.useCaseTags,
				clues: entry.analysis.clues,
			};
			for (const [name, list] of Object.entries(lists)) {
				expect(new Set(list).size, `${entry.slug}.${name}`).toBe(list.length);
			}
		}
	});

	it("has unique ids and slugs, and no slug collides with /inspiration/saved", () => {
		const ids = ENTRIES.map((e) => e.id);
		const slugs = ENTRIES.map((e) => e.slug);
		expect(new Set(ids).size).toBe(ids.length);
		expect(new Set(slugs).size).toBe(slugs.length);
		expect(slugs).not.toContain("saved");
	});

	it.each(ENTRIES.map((e) => [e.slug, e] as const))("%s has its required fields", (_, entry) => {
		for (const key of ["id", "slug", "title", "summary", "creator", "sourceUrl"] as const) {
			expect(entry[key], key).toBeTruthy();
		}
		expect(entry.analysis.why).toBeTruthy();
		expect(entry.analysis.whenToUse).toBeTruthy();
		expect(entry.analysis.watch).toBeTruthy();
		expect(entry.analysis.clues.length).toBeGreaterThan(0);
		expect(entry.interactionTags.length).toBeGreaterThan(0);
		expect(entry.addedAt).toMatch(ISO_DATE);
		expect(entry.verifiedAt).toMatch(ISO_DATE);
		expect(entry.verifiedAt >= entry.addedAt).toBe(true);
	});

	it("links only to components that exist, and explains every related link", () => {
		for (const entry of ENTRIES) {
			for (const link of entry.components) {
				expect(hasComponent(link.slug), `${entry.slug} → ${link.slug}`).toBe(true);
				if (link.relation === "related")
					expect(link.note, `${entry.slug} → ${link.slug}`).toBeTruthy();
				if (entry.origin === "external") expect(link.relation, entry.slug).not.toBe("exact");
			}
		}
	});

	it("gives every FancyUI entry a demo module and complete knob defaults", () => {
		for (const entry of ENTRIES.filter(isFancyUI)) {
			expect(demos[`./demos/${entry.demo.module}.svelte`], entry.slug).toBeDefined();
			for (const knob of entry.demo.knobs ?? []) {
				expect(entry.demo.defaults ?? {}, `${entry.slug}.${knob.key}`).toHaveProperty(knob.key);
			}
		}
	});

	it("serves media from /inspiration/ and the file exists", () => {
		for (const entry of ENTRIES) {
			if (!entry.media) continue;
			for (const src of [entry.media.src, entry.media.poster].filter(Boolean) as string[]) {
				expect(src.startsWith("/inspiration/"), `${entry.slug}: ${src}`).toBe(true);
				expect(existsSync(join(staticDir, src)), `${entry.slug}: ${src}`).toBe(true);
			}
		}
	});

	it("publishes an external entry only with licensed media", () => {
		for (const entry of PUBLISHED) {
			if (entry.origin !== "external") continue;
			expect(entry.media, entry.slug).toBeDefined();
			expect(entry.media?.provenance.license, entry.slug).toBeTruthy();
		}
	});

	it("keeps entry files free of value imports", () => {
		for (const [path, source] of Object.entries(sources)) {
			expect(source, path).not.toMatch(/^import (?!type)/m);
		}
	});

	it("has enough published entries for the gallery and the homepage", () => {
		expect(PUBLISHED.length).toBeGreaterThanOrEqual(18);
		expect(featured(6)).toHaveLength(6);
	});

	it("keeps media.json and the posters on disk in sync", () => {
		for (const slug of Object.keys(MEDIA_MANIFEST)) {
			expect(existsSync(join(staticDir, "inspiration", `${slug}.webp`)), slug).toBe(true);
		}
		const posters = readdirSync(join(staticDir, "inspiration")).filter((f) => f.endsWith(".webp"));
		for (const file of posters) {
			expect(MEDIA_MANIFEST, file).toHaveProperty(file.replace(/\.webp$/, ""));
		}
	});
});

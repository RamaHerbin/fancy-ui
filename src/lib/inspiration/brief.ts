/**
 * The "Copy brief" text: everything the detail page knows about a reference,
 * as plain text a designer or a coding agent can paste into their own work.
 *
 * Only facts from the entry and the build-time variant tables go in — absent
 * fields are left out, never filled in — and it ends by asking for an
 * original adaptation, not a copy of the reference.
 */

import type { FrameworkVariant } from "$lib/server/variants.js";
import { absoluteUrl } from "$lib/site.js";
import {
	CODE_AVAILABILITY_LABELS,
	FRAMEWORK_LABELS,
	INTERACTION_LABELS,
	KIND_LABELS,
	STYLE_LABELS,
	type Framework,
	type Reference,
} from "./types.js";

function section(title: string, body: string | undefined): string[] {
	const text = body?.trim();
	return text ? [title, text, ""] : [];
}

export function buildBrief(
	entry: Reference,
	framework: Framework,
	variants: Record<string, FrameworkVariant[]>
): string {
	const lines: string[] = [entry.title];
	if (entry.summary) lines.push(entry.summary);
	lines.push("");

	lines.push(`Reference: ${absoluteUrl(`/inspiration/${entry.slug}`)}`);
	lines.push(`Source: ${absoluteUrl(entry.sourceUrl)}`);
	const by = [entry.creator, entry.product].filter(Boolean).join(" · ");
	if (by) lines.push(`By: ${by}`);

	const pattern = [
		KIND_LABELS[entry.kind],
		entry.interactionTags.map((tag) => INTERACTION_LABELS[tag]).join(", "),
		entry.styleTags.map((tag) => STYLE_LABELS[tag]).join(", "),
	].filter(Boolean);
	lines.push(`Pattern: ${pattern.join(" · ")}`);
	if (entry.codeAvailability !== "unknown") {
		lines.push(`Code of the reference: ${CODE_AVAILABILITY_LABELS[entry.codeAvailability]}`);
	}
	lines.push("");

	const { analysis } = entry;
	lines.push(...section("Behaviour", analysis.why));
	lines.push(...section("When to use it", analysis.whenToUse));
	lines.push(...section("Things to watch", analysis.watch));
	if (analysis.clues.length) {
		lines.push("Implementation clues", ...analysis.clues.map((clue) => `- ${clue}`), "");
	}

	const verified = entry.components.filter((link) => variants[link.slug]);
	if (verified.length) {
		lines.push(`FancyUI components (${FRAMEWORK_LABELS[framework]})`);
		for (const link of verified) {
			const variant = variants[link.slug].find((v) => v.framework === framework);
			const relation = link.relation === "exact" ? "exact match" : "related";
			lines.push(`- ${link.slug} (${relation})`);
			if (link.note) lines.push(`  ${link.note}`);
			if (!variant) continue;
			if (variant.installLine) lines.push(`  Install: ${variant.installLine}`);
			if (variant.importLine) lines.push(`  Import: ${variant.importLine}`);
			if (variant.availability !== "unavailable") {
				lines.push(`  Docs: ${absoluteUrl(variant.docsUrl)}`);
			}
			if (variant.note) lines.push(`  Note: ${variant.note}`);
		}
		lines.push("");
	}

	lines.push(
		"Use this as a reference for the behaviour, not a template: design an original adaptation that fits the product, its content and its visual language."
	);
	return lines.join("\n");
}

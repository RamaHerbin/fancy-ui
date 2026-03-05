import { nanoid } from "nanoid";
import type { PageDocument } from "../../types/page.js";
import type { ContentTransformer, RawContent } from "../types.js";

function slugFromFilename(filename: string): string {
	return filename
		.replace(/\.md$/, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

function extractH1(content: string): string | null {
	const match = content.match(/^#\s+(.+)$/m);
	return match ? match[1].trim() : null;
}

export class MarkdownTransformer implements ContentTransformer {
	readonly name = "Markdown";
	readonly supportedTypes = ["markdown-filesystem"];

	parse(raw: RawContent): PageDocument {
		const now = new Date().toISOString();

		const title = (raw.meta.title as string) || extractH1(raw.content) || "Untitled";
		const slug = (raw.meta.slug as string) || slugFromFilename(raw.id);

		return {
			version: 1,
			meta: {
				title,
				slug,
				description: (raw.meta.description as string) || undefined,
				status: "draft",
				createdAt: (raw.meta.createdAt as string) || now,
				updatedAt: (raw.meta.updatedAt as string) || now,
			},
			body: [
				{
					id: nanoid(),
					type: "_section",
					props: { padding: "py-16 px-4", maxWidth: "max-w-6xl" },
					children: [
						{
							id: nanoid(),
							type: "_rich-text",
							props: { content: raw.content, class: "" },
						},
					],
				},
			],
		};
	}
}

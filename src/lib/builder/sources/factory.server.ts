import { env } from "$env/dynamic/private";
import { getSourceRegistry } from "./registry.server.js";
import { MarkdownFilesystemSource } from "./implementations/markdown-filesystem.server.js";
import { MarkdownTransformer } from "./transformers/markdown.server.js";

let _initialized = false;

/**
 * Initialize content sources from environment variables.
 * Called lazily on first access. Idempotent.
 */
export function initializeSources(): void {
	if (_initialized) return;
	_initialized = true;

	const registry = getSourceRegistry();

	const markdownDir = env.MARKDOWN_SOURCE_DIR;
	if (markdownDir) {
		registry.register("markdown-fs", {
			source: new MarkdownFilesystemSource(markdownDir),
			transformer: new MarkdownTransformer(),
			enabled: true,
		});
	}
}

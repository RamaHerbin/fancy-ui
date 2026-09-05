/*
 * The two renderer components sit one directory below the parser they consume,
 * and that nesting is load-bearing.
 *
 * `Markdown.tsx` and `markdown.ts` differ only in case. Emitted side by side
 * into one flat output directory they are the same path on a case-insensitive
 * filesystem (macOS, Windows), and the declaration build — `tsc -p
 * tsconfig.build.json`, which compiles all of `src`, not just the entry graph —
 * wrote a single `dist/internals/markdown.d.ts` holding the parser's types with
 * this module's `Markdown` / `MarkdownProps` silently gone. The bundle half
 * (`preserveModules`, `entryFileNames: "[name].js"`) would collide the same way
 * the moment a component imported this file.
 *
 * Nesting keeps the two emitted paths distinct; the file names themselves are
 * unchanged, and `../markdown.js` names the parser unambiguously from here.
 */
import { Fragment, type ReactNode } from "react";
import { cn } from "../../utils.js";
import { parseMarkdown, type BlockToken } from "../markdown.js";
import { MarkdownInline } from "./MarkdownInline.js";
import "./markdown.css";

export interface MarkdownProps {
	/** Markdown source. Safe to update on every streamed chunk. */
	text?: string;
	className?: string;
	/**
	 * Already-parsed blocks, used when the component renders itself for a
	 * blockquote. Consumers pass `text`.
	 */
	blocks?: BlockToken[];
	/**
	 * Rendered inline at the very end of the document — a streaming caret, say.
	 * Every block here is block-level, so a caret placed after the component
	 * would sit on its own line instead of trailing the last character; this
	 * puts it inside the last paragraph, heading or list item instead. A
	 * document ending in code, a table, a rule, or nothing at all has no inline
	 * tail to hold it, and drops it.
	 */
	trailingCursor?: ReactNode;
}

/**
 * One block token. `cursor` is only ever passed for the last block of the
 * document; every other block receives `undefined` and renders no tail.
 */
function renderBlock(block: BlockToken, cursor: ReactNode): ReactNode {
	switch (block.type) {
		case "paragraph":
			return (
				<p className="ft-md-p">
					<MarkdownInline tokens={block.children} />
					{cursor}
				</p>
			);
		case "heading": {
			const Heading = `h${block.depth}` as const;
			return (
				<Heading className="ft-md-h" data-depth={block.depth}>
					<MarkdownInline tokens={block.children} />
					{cursor}
				</Heading>
			);
		}
		case "code":
			return (
				<pre className="ft-md-pre" data-lang={block.lang || undefined}>
					<code>{block.text}</code>
				</pre>
			);
		case "list": {
			const items = block.items.map((item, itemIndex) => (
				<li key={itemIndex}>
					<MarkdownInline tokens={item} />
					{itemIndex === block.items.length - 1 ? cursor : undefined}
				</li>
			));
			return block.ordered ? (
				<ol className="ft-md-ol" start={block.start}>
					{items}
				</ol>
			) : (
				<ul className="ft-md-ul">{items}</ul>
			);
		}
		case "blockquote":
			return (
				<blockquote className="ft-md-quote">
					<Markdown blocks={block.children} trailingCursor={cursor} />
				</blockquote>
			);
		case "table":
			return (
				<div className="ft-md-table-scroll">
					<table className="ft-md-table">
						<thead>
							<tr>
								{block.header.map((cell, i) => (
									<th key={i} style={{ textAlign: block.align[i] ?? undefined }}>
										<MarkdownInline tokens={cell} />
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{block.rows.map((row, rowIndex) => (
								<tr key={rowIndex}>
									{row.map((cell, i) => (
										<td key={i} style={{ textAlign: block.align[i] ?? undefined }}>
											<MarkdownInline tokens={cell} />
										</td>
									))}
								</tr>
							))}
						</tbody>
					</table>
				</div>
			);
		case "hr":
			return <hr className="ft-md-hr" />;
	}
}

export function Markdown({ text = "", className, blocks, trailingCursor }: MarkdownProps) {
	const nodes = blocks ?? parseMarkdown(text);
	const lastIndex = nodes.length - 1;

	return (
		<div className={cn("ft-md", className)}>
			{nodes.map((block, index) => (
				// Blocks have no identity beyond their position; a streamed document
				// is re-parsed and re-rendered whole on every chunk.
				<Fragment key={index}>
					{renderBlock(block, index === lastIndex ? trailingCursor : undefined)}
				</Fragment>
			))}
		</div>
	);
}

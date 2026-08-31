import { Fragment, type ReactNode } from "react";
import type { InlineToken } from "../markdown.js";
import "./markdown.css";

export interface MarkdownInlineProps {
	tokens: InlineToken[];
}

/**
 * One inline token. Never builds an HTML string — the token tree is walked and
 * turned into elements directly, which is what keeps `sanitizeHref`
 * load-bearing and anything unrecognised a plain text node.
 */
function renderToken(token: InlineToken): ReactNode {
	switch (token.type) {
		case "text":
			return token.text;
		case "code":
			return <code className="ft-md-code">{token.text}</code>;
		case "strong":
			return (
				<strong>
					<MarkdownInline tokens={token.children} />
				</strong>
			);
		case "em":
			return (
				<em>
					<MarkdownInline tokens={token.children} />
				</em>
			);
		case "del":
			return (
				<del>
					<MarkdownInline tokens={token.children} />
				</del>
			);
		case "link":
			// A rejected destination keeps the label and loses the anchor.
			return token.href !== null ? (
				<a
					className="ft-md-link"
					href={token.href}
					rel="noopener noreferrer nofollow ugc"
					target="_blank"
				>
					<MarkdownInline tokens={token.children} />
				</a>
			) : (
				<MarkdownInline tokens={token.children} />
			);
	}
}

export function MarkdownInline({ tokens }: MarkdownInlineProps) {
	return (
		<>
			{tokens.map((token, index) => (
				// A token list has no stable identity of its own; the index is the
				// only key available, and the tree is re-rendered wholesale on every
				// streamed chunk anyway.
				<Fragment key={index}>{renderToken(token)}</Fragment>
			))}
		</>
	);
}

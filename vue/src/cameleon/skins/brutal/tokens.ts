/**
 * Brutal skin tokens — "Swiss Grid × Playful Brutalism × Editorial".
 * Every value is transcribed from the in-repo design reference
 * (vendor/design-refs/brutal/FancyUI-Intro-CV-Style.dc.html) — do not eyeball
 * or round these; the docs skin is calibrated against that file pixel for pixel.
 * Paper palette, ink borders, five flat accents, Archivo + Space Mono.
 */
export const brutalTokens: Record<string, string> = {
	"--skin-page-bg": "#F4EEE0",
	"--skin-page-fg": "#141414",
	"--skin-paper": "#F4EEE0",
	"--skin-card": "#FBF7EB",
	"--skin-surface": "#FFFCF2",
	"--skin-ink": "#141414",
	"--skin-line": "#141414",
	"--skin-blue": "#1B6EF3",
	// Darker blue, used by the reference for `a:hover` only — the single shade
	// of an accent in the whole system, hence the numeric suffix.
	"--skin-blue-700": "#144FB0",
	"--skin-red": "#E5372B",
	"--skin-yellow": "#F5B40C",
	"--skin-green": "#12A147",
	"--skin-purple": "#8E55E9",
	"--skin-font-sans": "'Archivo', Helvetica, Arial, sans-serif",
	"--skin-font-mono": "'Space Mono', monospace",
};

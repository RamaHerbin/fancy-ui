/**
 * Retro OS skin tokens — "hard-shadow desktop chrome" palette.
 * Desk/panel/card paper stack, ink borders, five flat accents, Archivo +
 * IBM Plex Mono + Silkscreen.
 *
 * Paper stack note: the desk (#E5DCC2) is the surface OUTSIDE the window; the
 * window itself is #F1E9D4 (--skin-page-bg / --skin-paper), panels are #FAF5E6
 * (--skin-card) and inputs/stages are #FDFAF0 (--skin-surface).
 *
 * Accent mapping note: the design has exactly five accents and no purple.
 * --skin-yellow carries the gold accent #B8912B (the lighter #ECD77F is a
 * fill tint, not an accent, and lives in per-skin CSS instead of tokens).
 * --skin-purple is filled by the dark-yellow #7D6414 stand-in so consumers
 * of the shared five-accent contract still get a fifth distinct color.
 */
export const retroOsTokens: Record<string, string> = {
	"--skin-desk": "#E5DCC2",
	"--skin-page-bg": "#F1E9D4",
	"--skin-page-fg": "#191308",
	"--skin-paper": "#F1E9D4",
	"--skin-card": "#FAF5E6",
	"--skin-surface": "#FDFAF0",
	"--skin-ink": "#191308",
	"--skin-line": "#191308",
	"--skin-muted": "#5C5340",
	"--skin-blue": "#3F62A7",
	"--skin-red": "#A0442F",
	"--skin-yellow": "#B8912B",
	"--skin-green": "#3A6B42",
	"--skin-purple": "#7D6414",
	"--skin-font-sans": "'Archivo', ui-sans-serif, system-ui, sans-serif",
	"--skin-font-mono": "'IBM Plex Mono', ui-monospace, SFMono-Regular, monospace",
	"--skin-font-pixel": "'Silkscreen', 'IBM Plex Mono', monospace",
};

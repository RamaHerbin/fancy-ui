/**
 * English message catalog — the source of truth for docs UI strings.
 *
 * Every other locale in `src/lib/i18n/messages/<code>.ts` is a translation of
 * these exact keys. Keep keys stable; when adding UI text, add a key here first.
 * Registry component descriptions are intentionally NOT translated here (they
 * stay English as the machine-facing source feeding /llms.txt and the copilot).
 */

export const en = {
	// Sidebar / nav
	"nav.gettingStarted": "Getting Started",
	"nav.components": "Components",
	"nav.docsSuffix": "docs",
	"a11y.closeSidebar": "Close sidebar",
	"a11y.toggleSidebar": "Toggle sidebar",

	// Getting-started page titles
	"page.introduction": "Introduction",
	"page.installation": "Installation",
	"page.theming": "Theming",
	"page.themeGenerator": "Theme Generator",
	"page.changelog": "Changelog",

	// Header
	"header.search": "Search...",
	"a11y.github": "GitHub",
	"a11y.changeTheme": "Change theme",
	"a11y.changeLanguage": "Change language",
	"theme.heading": "Theme",
	"theme.system": "System",
	"language.heading": "Language",

	// Command search
	"search.placeholder": "Search components and pages...",
	"search.noResults": "No results found",
	"search.esc": "ESC",

	// Component page
	"comp.preview": "Preview",
	"comp.code": "Code",
	"comp.installation": "Installation",
	"comp.usage": "Usage",
	"comp.props": "Props",
	"comp.slots": "Slots",
	"comp.links": "Links",
	"comp.sourceCode": "Source Code",
	"comp.inspiredBy": "Inspired by",
	"comp.examples": "Examples",
	"status.stable": "Stable",

	// Tables
	"table.prop": "Prop",
	"table.type": "Type",
	"table.default": "Default",
	"table.description": "Description",
	"table.slot": "Slot",

	// Copy buttons
	"action.copy": "Copy",
	"action.copied": "Copied!",

	// Table of contents
	"toc.onThisPage": "On this page",

	// Theme toggle (aria)
	"theme.switchToLight": "Switch to light mode",
	"theme.switchToDark": "Switch to dark mode",

	// Components gallery
	"gallery.title": "Components",
	"gallery.subtitle":
		"{count} beautifully animated components for Svelte 5. Browse, search, and find what you need.",
	"gallery.statComponents": "Components",
	"gallery.statCategories": "Categories",
	"gallery.statTypescript": "TypeScript",
	"gallery.filterPlaceholder": "Filter components...",
	"gallery.all": "All",
	"gallery.noMatch": "No components match your search.",

	// Theme-generator page
	"tg.metaDescription": "Tune FancyUI's OKLCh design tokens live and copy the CSS into your app.",
	"tg.intro":
		"Tune FancyUI's design tokens and watch the components react in real time. When it looks right, copy the generated CSS into your app's stylesheet (e.g. src/app.css). Colors use the OKLCh color space; the rainbow palette uses HSL.",
	"tg.seeTheming": "For the full token reference, see",
	"tg.presets": "Presets",
	"tg.base": "Base",
	"tg.light": "Light",
	"tg.dark": "Dark",
	"tg.primary": "Primary",
	"tg.accent": "Accent",
	"tg.lightness": "Lightness",
	"tg.chroma": "Chroma",
	"tg.hue": "Hue",
	"tg.radius": "Radius",
	"tg.motion": "Motion",
	"tg.rainbowPalette": "Rainbow palette",
	"tg.livePreview": "Live preview",
	"tg.cardSurface": "Card surface",
	"tg.cardSurfaceDesc": "Uses --card, --foreground, --border and --radius.",
	"tg.primaryAction": "Primary action",
	"tg.accentBadge": "Accent badge",
	"tg.beamDesc": "Beam colors follow Primary → Accent.",
	"tg.generatedCss": "Generated CSS",
	"tg.copyCss": "Copy CSS",
	"tg.copied": "Copied",

	// Category labels (docs-only overlay; registry stays English)
	"category.buttons": "Buttons",
	"category.cards": "Cards",
	"category.backgrounds": "Backgrounds",
	"category.text": "Text & Typography",
	"category.layout": "Layout",
	"category.feedback": "Feedback",
	"category.data-display": "Data Display",
	"category.navigation": "Navigation",
	"category.media": "Media",
	"category.effects": "Effects",
} as const;

export type Messages = typeof en;
export type MessageKey = keyof Messages;

export default en;

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
	"nav.home": "Home",
	"nav.docsSuffix": "docs",
	"a11y.closeSidebar": "Close sidebar",
	"a11y.toggleSidebar": "Toggle sidebar",
	"a11y.breadcrumb": "Breadcrumb",

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
	"skin.heading": "Skin",
	"skin.standard": "Standard",
	"skin.brutal": "Brutal",
	"skin.retroOs": "Retro OS",
	"a11y.changeSkin": "Change skin",

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
	"comp.related": "Related components",
	"comp.previous": "Previous",
	"comp.next": "Next",
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
	"gallery.intro":
		"Every component is built natively for Svelte 5 with runes, styled with Tailwind CSS v4, typed with TypeScript, and ships with a live preview and copy-paste examples. Install the package once and own the code.",
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
	"category.ai-chat": "AI Chat",
	"category.ai-agents": "AI Agents",

	// Introduction page
	"intro.title": "Introduction",
	"intro.metaTitle": "Introduction",
	"intro.leadPre": "is a collection of",
	"intro.leadHighlight": "{count} animated",
	"intro.leadHighlight2": "interactive UI components",
	"intro.leadPost": "built natively for Svelte 5.",
	"intro.pill.svelte": "Svelte 5 Native",
	"intro.pill.animation": "Animation-first",
	"intro.pill.copyPaste": "Copy-paste friendly",
	"intro.pill.tailwind": "Tailwind CSS 4",
	"intro.pill.typescript": "TypeScript",
	"intro.philosophy.heading": "Philosophy",
	"intro.philosophy.card1.title": "Svelte 5 native",
	"intro.philosophy.card1.desc": "Built with runes. No legacy APIs.",
	"intro.philosophy.card2.title": "Animation-first",
	"intro.philosophy.card2.desc": "Every component ships with polished animations out of the box.",
	"intro.philosophy.card3.title": "Copy-paste friendly",
	"intro.philosophy.card3.desc": "Use as a package or copy the source directly.",
	"intro.philosophy.card4.title": "Tailwind CSS 4",
	"intro.philosophy.card4.desc": "Styled with utility classes and CSS custom properties.",
	"intro.philosophy.card5.title": "TypeScript",
	"intro.philosophy.card5.desc": "Full type safety with exported prop interfaces.",
	"intro.quickStart.heading": "Quick Start",
	"intro.quickStart.step1.title": "Install",
	"intro.quickStart.step1.desc": "Add FancyUI to your project.",
	"intro.quickStart.step2.title": "Import",
	"intro.quickStart.step2.desc": "Import the components you need.",
	"intro.quickStart.step3.title": "Use",
	"intro.quickStart.step3.desc": "Drop it in your Svelte components.",
	"intro.whatsIncluded.heading": "What's Included",
	"intro.whatsIncluded.body": "{count} components across 10 categories:",
	"intro.category.buttons": "Buttons",
	"intro.category.cards": "Cards",
	"intro.category.text": "Text",
	"intro.category.backgrounds": "Backgrounds",
	"intro.category.effects": "Effects",
	"intro.category.layout": "Layout",
	"intro.category.navigation": "Navigation",
	"intro.category.dataDisplay": "Data Display",
	"intro.category.feedback": "Feedback",
	"intro.category.media": "Media",
	"intro.stats.buttons": "Rainbow, ripple, shimmer and friends. Buttons that beg to be clicked.",
	"intro.stats.cards":
		"Carousels, bento grids, 3D tilts. Ways to present content without boring anyone.",
	"intro.stats.effects":
		"Cursors, trails, animated text. The little touches that make the difference.",
	"sidebar.starTitle": "Star on GitHub",
	"sidebar.starBody": "If you like FancyUI, give it a star!",
	"rail.nextPage": "Next page",
	"intro.nextSteps.heading": "Next Steps",
	"intro.nextSteps.installation": "Installation",
	"intro.nextSteps.theming": "Theming",
	"intro.nextSteps.components": "Browse Components",
	"intro.cta.title": "New to FancyUI?",
	"intro.cta.body":
		"Check out the <strong>Theme Generator</strong> to customize colors and see components react in real time.",
	"intro.cta.button": "Try Theme Generator",

	// Core components workspace (sidebar groups, categories, status)
	"group.core": "Core",
	"group.fancy": "Fancy",
	"category.actions": "Actions",
	"category.forms": "Forms",
	"category.overlays": "Overlays",
	"category.display": "Display",
	"status.inProgress": "In progress",

	// Installation page
	"install.metaTitle": "Installation",
	"install.title": "Installation",
	"install.lead":
		"Add FancyUI to a SvelteKit project in three steps: install the package, import the stylesheet, render a component.",
	"install.pill.svelte": "Svelte 5",
	"install.pill.tailwind": "Tailwind CSS 4",
	"install.pill.node": "Node.js 20.19+",
	"install.pill.typescript": "TypeScript",
	"install.prerequisites.heading": "Prerequisites",
	"install.prerequisites.body":
		"FancyUI targets the current Svelte toolchain. Check these three before installing.",
	"install.prerequisites.card1.title": "SvelteKit",
	"install.prerequisites.card1.version": "Svelte 5",
	"install.prerequisites.card1.desc":
		"Components are written with runes, so Svelte 5 is required. Svelte 4 projects will not compile them.",
	"install.prerequisites.card2.title": "Tailwind CSS",
	"install.prerequisites.card2.version": "v4",
	"install.prerequisites.card2.desc":
		"Styling relies on Tailwind v4 utilities and CSS custom properties.",
	"install.prerequisites.card3.title": "Node.js",
	"install.prerequisites.card3.version": "20.19+",
	"install.prerequisites.card3.desc":
		"Required by the SvelteKit and Vite versions FancyUI builds against.",
	"install.steps.heading": "Install",
	"install.steps.body":
		"Pick your package manager, wire up the stylesheet, then render your first component.",
	"install.step1.title": "Install the package",
	"install.step1.desc":
		"One package for every component. Switch tabs to copy the command for your package manager.",
	"install.step2.title": "Import the stylesheet",
	"install.step2.desc": "Add the FancyUI stylesheet right after your Tailwind import.",
	"install.step2.caption": "In your global stylesheet, usually src/app.css.",
	"install.step3.title": "Render a component",
	"install.step3.desc": "Import from the package root and drop it into your markup.",
	"install.tailwind.heading": "Tailwind CSS setup",
	"install.tailwind.body":
		"FancyUI is built on Tailwind CSS v4, which is configured in CSS instead of a JavaScript config file. If Tailwind already works in your project, there is nothing else to configure.",
	"install.tailwind.order":
		"Import order matters: Tailwind first, FancyUI second, so FancyUI's layers and custom properties resolve on top of the defaults.",
	"install.tailwind.note":
		"The stylesheet carries the design tokens every component reads: colors, radii and animation timings. Without it, components render unstyled.",
	"install.usage.heading": "Usage",
	"install.usage.body":
		"Every component is a named export of the package root, so there are no per-component import paths to remember.",
	"install.usage.note":
		"Each component's page lists its props, live examples and accessibility notes.",
	"install.typescript.heading": "TypeScript",
	"install.typescript.body":
		"Prop types are exported next to each component, so you can type wrappers and shared presets.",
	"install.typescript.note":
		"Types ship inside the package. There is no separate types package to install.",
	"install.peerDeps.heading": "Peer dependencies",
	"install.peerDeps.body": "FancyUI expects these to already exist in your project:",
	"install.peerDeps.colPackage": "Package",
	"install.peerDeps.colVersion": "Version",
	"install.peerDeps.bundled":
		"A few components need extra runtime libraries. These ship with the package, so there is nothing more to install:",
	"install.peerDeps.bundledNote": "They are only pulled in by the components that use them.",
	"install.nextSteps.heading": "Next steps",
	"install.nextSteps.components.title": "Browse components",
	"install.nextSteps.components.desc":
		"{count} components with live previews, props and copy-paste examples.",
	"install.nextSteps.theming.title": "Theming",
	"install.nextSteps.theming.desc":
		"Override the design tokens so every component matches your brand in light and dark mode.",

	// Theming page
	"theming.metaTitle": "Theming",
	"theming.title": "Theming",
	"theming.lead":
		"Every FancyUI component reads its colors, radii and timings from CSS custom properties in the OKLCh color space — override a token and the whole library follows.",
	"theming.pill.oklch": "OKLCh color space",
	"theming.pill.shadcn": "shadcn-svelte compatible",
	"theming.pill.dark": "Dark mode",
	"theming.pill.tokens": "Design tokens",
	"theming.generator.body":
		"Prefer to tune it visually? The Theme Generator adjusts these tokens with live sliders and hands you the CSS.",
	"theming.generator.cta": "Open the Theme Generator",
	"theming.cssSetup.heading": "CSS setup",
	"theming.cssSetup.body":
		"Import the FancyUI stylesheet in your app's global CSS, usually src/app.css:",
	"theming.colors.heading": "Color system",
	"theming.colors.body": "All colors use the OKLCh color space for perceptually uniform gradients:",
	"theming.colors.note":
		"Token names follow shadcn-svelte conventions, so an existing shadcn theme drops in unchanged.",
	"theming.dark.heading": "Dark mode",
	"theming.dark.body":
		"Dark mode is activated by the .dark class on a parent element. FancyUI overrides every token:",
	"theming.motion.heading": "Animation tokens",
	"theming.motion.body": "Control animation timing globally:",
	"theming.easing.heading": "Easing functions",
	"theming.easing.body": "Easing curves are tokens too, shared by every component transition:",
	"theming.rainbow.heading": "Rainbow gradients",
	"theming.rainbow.body": "Used by RainbowButton, GradientButton and other gradient effects:",
	"theming.customizing.heading": "Customizing",
	"theming.customizing.body": "Override any token in your own CSS to change the look:",
	"theming.customizing.note":
		"Tokens cascade: override them globally in :root, or scope them to a wrapper element to theme a single section.",
	"theming.nextSteps.heading": "Next steps",
	"theming.nextSteps.generator.title": "Theme Generator",
	"theming.nextSteps.generator.desc":
		"Tune every token with live sliders and copy the finished CSS.",
	"theming.nextSteps.components.title": "Browse components",
	"theming.nextSteps.components.desc": "See the tokens at work across the full component gallery.",

	// Changelog page
	"changelog.metaTitle": "Changelog",
	"changelog.title": "Changelog",
	"changelog.lead": "Every FancyUI release and what changed in it, newest first.",
	"changelog.latest": "Latest",
	"changelog.major": "Major changes",
	"changelog.minor": "Minor changes",
	"changelog.patch": "Patch changes",
	// Retro OS docs chrome
	"retro.explorer": "Explorer",
	"retro.start": "Start",
	"retro.tagline": "Animated components for Svelte 5 — copy-paste friendly.",
} as const;
export type Messages = typeof en;
export type MessageKey = keyof Messages;
/**
 * Shape every translated catalog must satisfy: all of en's keys, string
 * values. `satisfies Catalog` on a catalog literal turns a missing, extra,
 * or typo'd key into a compile error (enforced by scripts/check-i18n.mjs).
 */
export type Catalog = Record<MessageKey, string>;
export default en;

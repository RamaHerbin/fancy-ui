/**
 * English message catalog — the source of truth for docs UI strings.
 *
 * Every other locale in `src/lib/i18n/messages/<code>.ts` is a translation of
 * these exact keys. Keep keys stable; when adding UI text, add a key here first.
 * Registry component descriptions are intentionally NOT translated here (they
 * stay English as the machine-facing source feeding /llms.txt and the copilot).
 *
 * Conventions (details in CONTRIBUTING.md, "Translations"):
 * - `{name}` placeholders are filled by `t(key, { name })`.
 * - Counts are plural messages: flat keys `<base>.one` / `<base>.other` (every
 *   other locale uses its own CLDR categories), read with `tn(base, n)`.
 * - Inline markup uses a closed tag set: `<b>`, `<grad>`, `<solid>`, `<link>`,
 *   rendered by `tx()` + `<RichText>`; there is no raw HTML.
 * - A `/** @context ... *\/` comment above a key tells translators where the
 *   text appears; `node scripts/i18n-context.mjs` exports them to messages/context.json.
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
	/** @context Title of the Introduction page: sidebar entry, breadcrumb, browser tab and page heading. */
	"page.introduction": "Introduction",
	/** @context Title of the Installation page: sidebar entry, breadcrumb, browser tab and page heading. */
	"page.installation": "Installation",
	/** @context Title of the Theming page (design tokens, colors, dark mode): sidebar entry, breadcrumb, browser tab and page heading. Also the text of the link in tg.intro. */
	"page.theming": "Theming",
	/** @context Title of the Theme Generator page, an interactive tool that edits the design tokens and outputs CSS: sidebar entry, breadcrumb, browser tab and page heading. */
	"page.themeGenerator": "Theme Generator",
	/** @context Title of the Changelog page (release notes): sidebar entry, breadcrumb, browser tab and page heading. */
	"page.changelog": "Changelog",

	// Header
	"header.search": "Search...",
	"a11y.github": "GitHub",
	"a11y.changeTheme": "Change theme",
	"a11y.changeLanguage": "Change language",
	"theme.heading": "Theme",
	"theme.system": "System",
	"language.heading": "Language",
	/** @context Heading of the skin picker in the header menu. A skin is a visual style of the docs chrome (standard, brutal, retro). */
	"skin.heading": "Skin",
	/** @context Name of the default skin. */
	"skin.standard": "Standard",
	/** @context Name of the bold skin with thick borders and hard shadows. */
	"skin.brutal": "Brutal",
	/** @context Name of the skin that mimics an old desktop operating system. OS stays as is. */
	"skin.retroOs": "Retro OS",
	/** @context Small badge next to a skin name marking it as experimental. */
	"skin.beta": "Beta",
	"a11y.changeSkin": "Change skin",
	"a11y.sound": "Sound",

	// Command search
	"search.placeholder": "Search components and pages...",
	"search.noResults": "No results found",
	"search.esc": "ESC",
	/** @context Shown in the empty search state, above a list of suggested searches taken from the jobs.* labels. Ends with a colon in English. */
	"search.tryInstead": "Try one of these instead:",
	/** @context Heading of the browse-by-need section (components page and command search); it groups the jobs.* labels below. */
	"jobs.heading": "Browse by what you need",
	/** @context Browse-by-need label for components that give the user feedback (toasts, tooltips, loaders). Imperative phrase; same vocabulary as category.feedback. */
	"jobs.feedback": "Give feedback",
	/** @context Browse-by-need label for components that collect an input from the user (fields, pickers, toggles). Imperative phrase; same vocabulary as category.forms. */
	"jobs.input": "Collect an input",
	/** @context Browse-by-need label for components that draw the eye to something (spotlights, highlights, beams). Imperative phrase. */
	"jobs.attention": "Guide attention",
	/** @context Browse-by-need label for components that move the user around (menus, tabs, breadcrumbs). Imperative phrase; same vocabulary as category.navigation. */
	"jobs.navigate": "Navigate",
	/** @context Browse-by-need label for components that show how far a task has got (bars, steppers, counters). Imperative phrase. */
	"jobs.progress": "Show progress",
	/** @context Browse-by-need label for purely decorative, delightful effects. Imperative phrase; same vocabulary as category.effects. */
	"jobs.surprise": "Surprise",

	// Component page
	"comp.preview": "Preview",
	"comp.code": "Code",
	"comp.installation": "Installation",
	"install.framework": "Framework",
	"install.sourceOnly": "Not on npm yet — this port lives in the repository.",
	"install.unavailable": "No port of this component for this framework yet.",
	"install.copySource": "Copy source",
	"install.copySourceNote": "Copies the component source into your project; you own the code.",
	"comp.usage": "Usage",
	"comp.props": "Props",
	"comp.slots": "Slots",
	"comp.links": "Links",
	"comp.sourceCode": "Source Code",
	/** @context Label before the credit link on a component page. A courtesy credit to the work the component draws on; never phrase it as ported or copied. */
	"comp.inspiredBy": "Inspired by",
	"comp.examples": "Examples",
	"comp.related": "Related components",
	/** @context Eyebrow above the previous page link in the pager, and the accessible name of the "scroll to previous items" arrow in carousel previews. A short direction word. */
	"comp.previous": "Previous",
	/** @context Eyebrow above the next page link in the pager, and the accessible name of the "scroll to next items" arrow in carousel previews. A short direction word. */
	"comp.next": "Next",
	/** @context Status chip on a component page and card: the component API is settled. */
	"status.stable": "Stable",

	// Tables
	"table.prop": "Prop",
	"table.type": "Type",
	"table.default": "Default",
	"table.description": "Description",
	"table.slot": "Slot",
	"table.event": "Event",
	"table.payload": "Payload",
	/** @context Screen-reader label before the React or Vue name of a Svelte prop. {framework} is Svelte, React or Vue and stays untranslated. */
	"table.portName": "Name in {framework}",
	/** @context Tooltip and screen-reader text for a prop whose React or Vue name cannot be derived from the naming rules; it points at the written list of differences. */
	"table.portNameUnknown":
		"Not derivable by the naming rules; see the differences from the Svelte API.",
	"comp.events": "Events",
	"comp.copyMarkdown": "Copy as Markdown",
	"comp.editions": "Available for {editions}.",

	// Copy buttons
	"action.copy": "Copy",
	"action.copied": "Copied!",

	// Table of contents
	"toc.onThisPage": "On this page",

	// Components gallery
	"gallery.title": "Components",
	"gallery.subtitle":
		"{count} beautifully animated components for Svelte 5, React and Vue. Browse, search, and find what you need.",
	"gallery.intro":
		"Components are available for Svelte 5, React and Vue, styled with Tailwind CSS v4 and typed with TypeScript. Every page has a live preview and copy-paste Svelte examples, with React and Vue usage where available. Install the package once and own the code.",
	"gallery.filterPlaceholder": "Filter components...",
	"gallery.all": "All",
	"gallery.noMatch": "No components match your search.",
	"gallery.meta":
		"{components} components · {categories} categories · Svelte 5 · React · Vue · TypeScript",
	/** @context Result count above the component grid after filtering. Plural message: {count} is the number of matching components. */
	"gallery.results.one": "{count} result",
	/** @context Result count above the component grid after filtering. Plural message: {count} is the number of matching components. */
	"gallery.results.other": "{count} results",
	"gallery.clearFilters": "Clear filters",
	"gallery.clearSearch": "Clear search",
	"gallery.searchHint": "Press / to search",
	"gallery.groupLabel": "Component group",
	"gallery.categoryLabel": "Categories",
	"gallery.desc.buttons": "Interactive buttons with rich hover and press motion",
	"gallery.desc.cards": "Cards and containers that react to the pointer",
	"gallery.desc.backgrounds": "Animated and decorative backgrounds",
	"gallery.desc.text": "Text animations and typographic effects",
	"gallery.desc.layout": "Layout primitives and structural components",
	"gallery.desc.feedback": "Tooltips, toasts, loaders, and other feedback",
	"gallery.desc.data-display": "Lists, timelines, and collections of data",
	"gallery.desc.navigation": "Menus, tabs, links, and wayfinding",
	"gallery.desc.media": "Image, video, and media display",
	"gallery.desc.effects": "Visual effects and decorative motion",
	"gallery.desc.ai-chat": "Messages, composers, threads, and streaming text",
	"gallery.desc.ai-agents": "Reasoning, tool use, plans, and human-in-the-loop cards",
	"gallery.desc.actions": "Buttons, toggles, and other action primitives",
	"gallery.desc.forms": "Inputs and primitives for capturing user input",
	"gallery.desc.overlays": "Dialogs, popovers, menus, and sheets",
	"gallery.desc.display": "Badges, avatars, and status display",

	// Theme-generator page
	"tg.metaDescription": "Tune FancyUI's OKLCh design tokens live and copy the CSS into your app.",
	/** @context Theme Generator introduction paragraph. <link>...</link> wraps the link to the Theming page; it ends the sentence. Keep the tag. */
	"tg.intro":
		"Tune FancyUI's design tokens and watch the components react in real time. When it looks right, copy the generated CSS into your app's stylesheet (e.g. src/app.css). Colors use the OKLCh color space; the rainbow palette uses HSL. For the full token reference, see <link>Theming</link>.",
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
	/** @context Caption of a preview card whose animated border follows the two tuned colors. {primary} and {accent} are the translated labels of tg.primary and tg.accent. The arrow shows direction from the first colour to the second and is not mirrored in right-to-left text: in Arabic and Persian use the left-pointing arrow, or reword without one. */
	"tg.beamDesc": "Beam colors follow {primary} → {accent}.",
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
	"intro.pill.animation": "Animation-first",
	"intro.pill.copyPaste": "Copy-paste friendly",
	"intro.pill.tailwind": "Tailwind CSS 4",
	"intro.pill.typescript": "TypeScript",
	"intro.philosophy.heading": "Philosophy",
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
	"intro.quickStart.step3.title": "Use",
	"intro.whatsIncluded.heading": "What's Included",
	/** @context Sentence before the category list on the Introduction page. Plural on {count} (components); {categories} is the number of categories. The noun that follows {categories} may also change with the number in some languages (Arabic, Polish, Czech): reword freely, for example "in categories: {categories}", so that no inflected noun depends on it. */
	"intro.whatsIncluded.body.one": "{count} component across {categories} categories:",
	/** @context Sentence before the category list on the Introduction page. Plural on {count} (components); {categories} is the number of categories. The noun that follows {categories} may also change with the number in some languages (Arabic, Polish, Czech): reword freely, for example "in categories: {categories}", so that no inflected noun depends on it. */
	"intro.whatsIncluded.body.other": "{count} components across {categories} categories:",
	"intro.category.buttons": "Buttons",
	"intro.category.cards": "Cards",
	"intro.category.effects": "Effects",
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
	/** @context Call-to-action body on the Introduction page. <b>...</b> wraps the name of the Theme Generator page and renders bold. */
	"intro.cta.body":
		"Check out the <b>Theme Generator</b> to customize colors and see components react in real time.",
	"intro.cta.button": "Try Theme Generator",

	// Core components workspace (sidebar groups, categories, status)
	"group.core": "Core",
	"group.fancy": "Fancy",
	"category.actions": "Actions",
	"category.forms": "Forms",
	"category.overlays": "Overlays",
	"category.display": "Display",
	/** @context Status chip on a component page and card: the component exists but its API may still change. */
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
		"FancyUI targets current toolchains. Check these three before installing.",
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
		"Required by the current build tooling FancyUI is tested against.",
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
		"Import order matters: Tailwind first, FancyUI second. Place the FancyUI import before your own @custom-variant dark, otherwise FancyUI's replaces yours.",
	"install.tailwind.note":
		"The entry provides default colour tokens (background, primary, border and the rest) and a dark variant. Your own :root and .dark blocks override them: redefine the CSS variables and your values win.",
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
	"theming.pill.shadcn": "Standard token names",
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
		"Token names follow the widely used semantic convention (background, foreground, primary, …), so an existing theme with the same variable names drops in unchanged.",
	"theming.dark.heading": "Dark mode",
	"theming.dark.body":
		"Dark mode follows the operating-system preference by default. Put the .dark class on <html> or any ancestor to force dark, or .light to force light; the dark: utilities and every token follow. To customise the dark values, override them under .dark:",
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
	"comp.snippetSvelteOnly":
		"A full example for this framework is not written yet; only the Svelte version has one for now.",
	"comp.copyMarkdownSvelte": "Copy as Markdown (Svelte)",
	"comp.markdownSvelteOnly": "The Markdown export describes the Svelte version only.",
	"comp.apiNoticeReact":
		"This API reference uses the Svelte names. In React, class becomes className, on* handlers are camelCase (onclick becomes onClick) and snippets become ReactNode props or render functions.",
	"comp.apiNoticeVue":
		"This API reference uses the Svelte names. In Vue, snippets become slots and bindable props become v-model:name.",
	"comp.apiNoticeLink": "Differences from the Svelte API",
	"install.lead.react":
		"Add FancyUI to a React project in three steps: install the package, import the stylesheet, render a component.",
	"install.lead.vue":
		"Add FancyUI to a Vue project in three steps: install the package, import the stylesheet, render a component.",
	"install.pill.react": "React 18+",
	"install.pill.vue": "Vue 3.5+",
	"install.prerequisites.card1.title.react": "React",
	"install.prerequisites.card1.version.react": "18 / 19",
	"install.prerequisites.card1.desc.react":
		"Supports React 18 and 19. Components ship as client modules, so Server Components can import them directly.",
	"install.prerequisites.card1.title.vue": "Vue",
	"install.prerequisites.card1.version.vue": "3.5+",
	"install.prerequisites.card1.desc.vue":
		"Components are Vue 3.5 single-file components, so Vue 3.5.2 or later is required.",

	// Docs audit: chrome, contribution, status, recipes, errors, SEO
	/** @context Skip link, first focusable element of every docs page; jumps to the main content. */
	"a11y.skipToContent": "Skip to content",
	/** @context aria-label of the breadcrumb nav in the docs header. */
	"a11y.docsBreadcrumb": "Documentation breadcrumb",
	/** @context aria-label of the previous/next page navigation at the bottom of a page. */
	"a11y.prevNext": "Previous and next pages",
	/** @context aria-label of the icon-only search button shown on narrow screens. */
	"a11y.search": "Search",
	/** @context aria-label of the close button in the command search dialog. */
	"search.a11y.close": "Close search",
	/** @context aria-label / title of the wordmark link in the docs sidebar that returns to the landing page. */
	"nav.backToSite": "Back to FancyUI home",
	/** @context Sidebar entry and breadcrumb label for the recipes index. */
	"nav.recipes": "Recipes",
	/** @context Docs footer link to the contributing guide. */
	"footer.contribute": "Contribute",
	/** @context Docs footer link to the GitHub issue tracker. Product term, often kept as is. */
	"footer.issues": "Issues",
	/** @context Docs footer link to the GitHub Discussions board. */
	"footer.discussions": "Discussions",
	/** @context Docs footer link to the security policy. */
	"footer.security": "Security",
	/** @context Docs footer link to the code of conduct. */
	"footer.conduct": "Code of conduct",
	/** @context Docs footer link to the release notes. */
	"footer.changelog": "Changelog",
	/** @context Docs footer: label before the three package version badges (Svelte, React, Vue). */
	"footer.versions": "Versions",
	/** @context Docs footer: label before the one-line install command for the selected framework. */
	"footer.install": "Install",
	/** @context Docs footer: license note next to the copyright line. */
	"footer.license": "MIT license",
	/** @context Page action link that opens the source file in the GitHub editor. */
	"comp.editPage": "Edit this page",
	/** @context Page action link that opens a pre-filled GitHub issue about the current page. */
	"comp.reportIssue": "Report an issue",
	/** @context Pre-filled issue title. {name} is the page or component name. Keep the [docs] prefix. */
	"comp.issueTitle": "[docs] {name}",
	/** @context Introduction lead sentence, rendered right after the FancyUI wordmark. {count} is the number of components and is highlighted by <grad>. Keep the tags and the placeholder. */
	"intro.lead":
		"is a collection of <grad>{count}</grad> animated, interactive UI components for Svelte 5, React and Vue, built on the same design tokens.",
	/** @context Introduction quick-start step 2 text; the code sample below it changes with the selected framework. */
	"intro.importHint": "Import the components you need. The import path follows your framework.",
	/** @context Installation prerequisites note about the optional SvelteKit peer dependency. */
	"install.kitOptional":
		"SvelteKit is optional: FancyUI works in any Svelte 5 project built with Vite.",
	/** @context Theming page instruction above the per-framework stylesheet import snippet. */
	"theming.cssPerFramework":
		"Import the stylesheet for your framework: each package ships its own.",
	/** @context Introduction pill listing the supported frameworks. Framework names stay as written. */
	"intro.pill.frameworks": "Svelte 5, React, Vue",
	/** @context Introduction philosophy card 1 title: the three frameworks. Names stay as written. */
	"intro.philosophy.card1.title": "Svelte, React & Vue",
	/** @context Introduction philosophy card 1 body: how the components are written per framework. Keep the API names (runes, hooks, Composition API) as written. */
	"intro.philosophy.card1.desc":
		"Written natively for each framework: runes in Svelte, hooks in React, the Composition API in Vue.",
	/** @context Introduction quick-start step 3 description, shown above a usage code sample. */
	"intro.quickStart.step3.desc": "Drop it into your components.",
	/** @context Small tag after a peer dependency that is optional, in the Installation peer table. */
	"install.peerDeps.optional": "optional",
	/** @context Status chip for a component announced but not built yet. */
	"status.planned": "Planned",
	/** @context Status chip for a component that is scheduled for removal. */
	"status.deprecated": "Deprecated",
	/** @context Chip on a component page. {version} is a semver number such as 0.15.0. */
	"comp.sinceVersion": "New in v{version}",
	/** @context Banner shown on the page of a deprecated component. */
	"comp.deprecatedNotice": "This component is deprecated and may be removed in a future release.",
	/** @context Credit line when the inspiration has no URL. {name} is the credited author or project. */
	"comp.inspiredByNoLink": "Inspired by {name}",
	/** @context Title of the recipes index page. */
	"recipes.title": "Recipes",
	/** @context Lead paragraph of the recipes index page. */
	"recipes.lead":
		"Step-by-step compositions that combine several components into a finished interface.",
	/** @context Per-recipe count of components it uses, shown on its card. {count} is a number. */
	"recipes.components": "Components: {count}",
	/** @context Heading of the 404 error page. */
	"error.notFoundTitle": "Page not found",
	/** @context Heading of the generic error page. */
	"error.genericTitle": "Something went wrong",
	/** @context Body text of the 404 error page. */
	"error.notFoundBody": "The page you are looking for does not exist or has moved.",
	/** @context Body text of the generic error page. */
	"error.genericBody": "An unexpected error occurred. Try again, or head back to the docs.",
	/** @context Heading of the 401 error page. */
	"error.unauthorizedTitle": "Sign in required",
	/** @context Body text of the 401 error page. */
	"error.unauthorizedBody": "You need to be signed in to use this page.",
	/** @context Error page action: go to the landing page. */
	"error.home": "Back to home",
	/** @context Error page action: go to the components gallery. */
	"error.browse": "Browse components",
	/** @context Error page action: open the command search. */
	"error.search": "Search the docs",
	/** @context Error page action: open a pre-filled GitHub issue about this URL. */
	"error.report": "Report a broken link",
	/** @context Shown in place of a live preview whose module failed to load. */
	"comp.previewFailed": "This preview could not be loaded.",
	/** @context Standalone demo page, component without a preview. */
	"demo.noPreview": "No preview is available for this component yet.",
	/** @context Standalone demo page, unknown component slug. */
	"demo.notFound": "Component not found.",
	/** @context Heading of the numbered steps section of a recipe. */
	"recipes.steps": "Steps",
	/** @context Heading of the common-mistakes section of a recipe. */
	"recipes.pitfalls": "Pitfalls",
	/** @context Heading of the section listing the components a recipe uses. */
	"recipes.componentsUsed": "Components used",
	/** @context Meta description of the Installation page. */
	"seo.installation":
		"Install FancyUI for Svelte 5, React or Vue: add the package, import the stylesheet and render your first component.",
	/** @context Meta description of the Theming page. */
	"seo.theming":
		"Customize FancyUI with design tokens: OKLCh colors, radius, motion and dark mode, for Svelte 5, React and Vue.",
	/** @context Meta description of the Theme Generator page. */
	"seo.themeGenerator":
		"Tune FancyUI's OKLCh design tokens live and copy the generated CSS into your app.",
	/** @context Meta description of the Changelog page. */
	"seo.changelog": "Release notes for the FancyUI packages for Svelte 5, React and Vue.",
} as const;
export type Messages = typeof en;
type EnKey = keyof Messages;
export type PluralCategory = "zero" | "one" | "two" | "few" | "many" | "other";
/**
 * Base of every plural message: `foo` for the pair `foo.one` / `foo.other`.
 * Read with `tn("foo", n)`; never with `t()`.
 */
export type PluralKey = EnKey extends infer K ? (K extends `${infer B}.other` ? B : never) : never;
type PluralLeaf = `${PluralKey}.${PluralCategory}`;
/** Every message `t()` / `tx()` can read: all keys except the plural variants. */
export type MessageKey = Exclude<EnKey, PluralLeaf>;
/**
 * Shape every translated catalog must satisfy: all of en's keys, string
 * values. `satisfies Catalog` on a catalog literal turns a missing, extra,
 * or typo'd key into a compile error (enforced by scripts/check-i18n.mjs).
 *
 * Plural messages are flat keys `<base>.<category>` using the CLDR categories
 * of the locale: `.other` is always required, the other categories are
 * optional here and checked per locale by scripts/check-i18n.mjs.
 */
export type Catalog = Record<MessageKey | `${PluralKey}.other`, string> &
	Partial<Record<PluralLeaf, string>>;
export default en;

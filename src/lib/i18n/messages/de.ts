// German (de) — machine-translated draft. TODO: native review.
import type { Catalog } from "./en.js";

export default {
	// Sidebar / nav
	"nav.gettingStarted": "Erste Schritte",
	"nav.components": "Komponenten",
	"nav.home": "Startseite",
	"nav.docsSuffix": "Doku",
	"a11y.closeSidebar": "Seitenleiste schließen",
	"a11y.toggleSidebar": "Seitenleiste umschalten",
	"a11y.breadcrumb": "Brotkrümelnavigation",

	// Getting-started page titles
	"page.introduction": "Einführung",
	"page.installation": "Installation",
	"page.theming": "Themes",
	"page.themeGenerator": "Theme-Generator",
	"page.changelog": "Änderungsprotokoll",

	// Header
	"header.search": "Suchen...",
	"a11y.github": "GitHub",
	"a11y.changeTheme": "Theme ändern",
	"a11y.changeLanguage": "Sprache ändern",
	"theme.heading": "Theme",
	"theme.system": "System",
	"language.heading": "Sprache",

	// Command search
	"search.placeholder": "Komponenten und Seiten durchsuchen...",
	"search.noResults": "Keine Ergebnisse gefunden",
	"search.esc": "ESC",
	"search.tryInstead": "Probiere stattdessen eine dieser Suchen:",
	"jobs.heading": "Nach Bedarf stöbern",
	"jobs.feedback": "Feedback geben",
	"jobs.input": "Eingabe erfassen",
	"jobs.attention": "Aufmerksamkeit lenken",
	"jobs.navigate": "Navigieren",
	"jobs.progress": "Fortschritt zeigen",
	"jobs.surprise": "Überraschen",

	// Component page
	"comp.preview": "Vorschau",
	"comp.code": "Code",
	"comp.installation": "Installation",
	"install.framework": "Framework",
	"install.sourceOnly": "Noch nicht auf npm — diese Portierung liegt im Repository.",
	"install.unavailable": "Für dieses Framework gibt es noch keine Portierung dieser Komponente.",
	"install.copySource": "Quelle kopieren",
	"install.copySourceNote":
		"Kopiert den Komponentenquellcode in dein Projekt; der Code gehört dir.",
	"comp.usage": "Verwendung",
	"comp.props": "Props",
	"comp.slots": "Slots",
	"comp.links": "Links",
	"comp.sourceCode": "Quellcode",
	"comp.inspiredBy": "Inspiriert von",
	"comp.examples": "Beispiele",
	"comp.related": "Verwandte Komponenten",
	"comp.previous": "Zurück",
	"comp.next": "Weiter",
	"status.stable": "Stabil",

	// Tables
	"table.prop": "Prop",
	"table.type": "Typ",
	"table.default": "Standard",
	"table.description": "Beschreibung",
	"table.slot": "Slot",
	"table.event": "Event",
	"table.payload": "Daten",
	"table.portName": "Name in {framework}",
	"table.portNameUnknown":
		"Nicht aus den Benennungsregeln ableitbar; siehe die Unterschiede zur Svelte-API.",
	"comp.events": "Events",
	"comp.copyMarkdown": "Als Markdown kopieren",

	// Copy buttons
	"action.copy": "Kopieren",
	"action.copied": "Kopiert!",

	// Table of contents
	"toc.onThisPage": "Auf dieser Seite",

	// Theme toggle (aria)
	"theme.switchToLight": "Zum hellen Modus wechseln",
	"theme.switchToDark": "Zum dunklen Modus wechseln",

	// Components gallery
	"gallery.title": "Komponenten",
	"gallery.subtitle":
		"{count} wunderschön animierte Komponenten für Svelte 5, React, Vue. Durchstöbere, suche und finde, was du brauchst.",
	"gallery.intro":
		"Die Komponenten gibt es für Svelte 5, React und Vue, mit Tailwind CSS v4 gestylt und mit TypeScript typisiert. Jede Seite hat eine Live-Vorschau und Svelte-Beispiele zum Kopieren, dazu React- und Vue-Nutzung, wo vorhanden. Installiere das Paket einmal und der Code gehört dir.",
	"gallery.filterPlaceholder": "Komponenten filtern...",
	"gallery.all": "Alle",
	"gallery.noMatch": "Keine Komponenten entsprechen deiner Suche.",
	"gallery.meta":
		"{components} Komponenten · {categories} Kategorien · Svelte 5 · React · Vue · TypeScript",
	"gallery.results": "{count} Ergebnisse",
	"gallery.resultOne": "1 Ergebnis",
	"gallery.clearFilters": "Filter zurücksetzen",
	"gallery.clearSearch": "Suche löschen",
	"gallery.searchHint": "Drücke /, um zu suchen",
	"gallery.groupLabel": "Komponentengruppe",
	"gallery.categoryLabel": "Kategorien",
	"gallery.desc.buttons": "Interaktive Buttons mit ausdrucksstarken Hover- und Klick-Animationen",
	"gallery.desc.cards": "Karten und Container, die auf den Mauszeiger reagieren",
	"gallery.desc.backgrounds": "Animierte und dekorative Hintergründe",
	"gallery.desc.text": "Textanimationen und typografische Effekte",
	"gallery.desc.layout": "Layout-Primitive und strukturelle Komponenten",
	"gallery.desc.feedback": "Tooltips, Toasts, Loader und weiteres Feedback",
	"gallery.desc.data-display": "Listen, Zeitleisten und Datensammlungen",
	"gallery.desc.navigation": "Menüs, Tabs, Links und Orientierungshilfen",
	"gallery.desc.media": "Anzeige von Bildern, Videos und Medien",
	"gallery.desc.effects": "Visuelle Effekte und dekorative Bewegung",
	"gallery.desc.ai-chat": "Nachrichten, Eingabefelder, Threads und Streaming-Text",
	"gallery.desc.ai-agents": "Reasoning, Tool-Nutzung, Pläne und Human-in-the-Loop-Karten",
	"gallery.desc.actions": "Buttons, Schalter und weitere Aktions-Primitive",
	"gallery.desc.forms": "Eingaben und Primitive zur Erfassung von Nutzereingaben",
	"gallery.desc.overlays": "Dialoge, Popovers, Menüs und Sheets",
	"gallery.desc.display": "Badges, Avatare und Statusanzeigen",

	// Theme-generator page
	"tg.metaDescription":
		"Passe FancyUIs OKLCh-Design-Tokens live an und kopiere das CSS in deine App.",
	"tg.intro":
		"Passe FancyUIs Design-Tokens an und beobachte, wie die Komponenten in Echtzeit reagieren. Wenn es passt, kopiere das generierte CSS in das Stylesheet deiner App (z. B. src/app.css). Farben verwenden den OKLCh-Farbraum; die Regenbogen-Palette verwendet HSL.",
	"tg.seeTheming": "Die vollständige Token-Referenz findest du unter",
	"tg.presets": "Voreinstellungen",
	"tg.base": "Basis",
	"tg.light": "Hell",
	"tg.dark": "Dunkel",
	"tg.primary": "Primär",
	"tg.accent": "Akzent",
	"tg.lightness": "Helligkeit",
	"tg.chroma": "Chroma",
	"tg.hue": "Farbton",
	"tg.radius": "Radius",
	"tg.motion": "Bewegung",
	"tg.rainbowPalette": "Regenbogen-Palette",
	"tg.livePreview": "Live-Vorschau",
	"tg.cardSurface": "Kartenoberfläche",
	"tg.cardSurfaceDesc": "Verwendet --card, --foreground, --border und --radius.",
	"tg.primaryAction": "Primäraktion",
	"tg.accentBadge": "Akzent-Badge",
	"tg.beamDesc": "Beam-Farben folgen Primary → Accent.",
	"tg.generatedCss": "Generiertes CSS",
	"tg.copyCss": "CSS kopieren",
	"tg.copied": "Kopiert",

	// Category labels (docs-only overlay; registry stays English)
	"category.buttons": "Buttons",
	"category.cards": "Karten",
	"category.backgrounds": "Hintergründe",
	"category.text": "Text & Typografie",
	"category.layout": "Layout",
	"category.feedback": "Feedback",
	"category.data-display": "Datenanzeige",
	"category.navigation": "Navigation",
	"category.media": "Medien",
	"category.effects": "Effekte",
	"category.ai-chat": "KI-Chat",
	"category.ai-agents": "KI-Agenten",

	// Introduction (redesigned page)
	"intro.title": "Einführung",
	"intro.metaTitle": "Einführung",
	"intro.leadPre": "ist eine Sammlung von",
	"intro.leadHighlight": "{count} animierten",
	"intro.leadHighlight2": "interaktiven UI-Komponenten",
	"intro.leadPost": "und wurde nativ für Svelte 5 entwickelt.",
	"intro.pill.svelte": "Svelte 5 nativ",
	"intro.pill.animation": "Animation zuerst",
	"intro.pill.copyPaste": "Copy-and-paste-freundlich",
	"intro.pill.tailwind": "Tailwind CSS 4",
	"intro.pill.typescript": "TypeScript",
	"intro.philosophy.heading": "Philosophie",
	"intro.philosophy.card1.title": "Svelte 5 nativ",
	"intro.philosophy.card1.desc": "Mit Runes gebaut. Keine veralteten APIs.",
	"intro.philosophy.card2.title": "Animation zuerst",
	"intro.philosophy.card2.desc":
		"Jede Komponente wird mit ausgefeilten Animationen sofort einsatzbereit geliefert.",
	"intro.philosophy.card3.title": "Copy-and-paste-freundlich",
	"intro.philosophy.card3.desc": "Als Paket verwenden oder den Quellcode direkt kopieren.",
	"intro.philosophy.card4.title": "Tailwind CSS 4",
	"intro.philosophy.card4.desc": "Gestaltet mit Utility-Klassen und CSS-Custom-Properties.",
	"intro.philosophy.card5.title": "TypeScript",
	"intro.philosophy.card5.desc": "Vollständige Typsicherheit mit exportierten Prop-Interfaces.",
	"intro.quickStart.heading": "Schnellstart",
	"intro.quickStart.step1.title": "Installieren",
	"intro.quickStart.step1.desc": "Füge FancyUI zu deinem Projekt hinzu.",
	"intro.quickStart.step2.title": "Importieren",
	"intro.quickStart.step2.desc": "Importiere die benötigten Komponenten.",
	"intro.quickStart.step3.title": "Verwenden",
	"intro.quickStart.step3.desc": "Füge sie in deine Svelte-Komponenten ein.",
	"intro.whatsIncluded.heading": "Was enthalten ist",
	"intro.whatsIncluded.body": "{count} Komponenten in {categories} Kategorien:",
	"intro.category.buttons": "Buttons",
	"intro.category.cards": "Karten",
	"intro.category.text": "Text",
	"intro.category.backgrounds": "Hintergründe",
	"intro.category.effects": "Effekte",
	"intro.category.layout": "Layout",
	"intro.category.navigation": "Navigation",
	"intro.category.dataDisplay": "Datenanzeige",
	"intro.category.feedback": "Feedback",
	"intro.category.media": "Medien",
	"intro.stats.buttons": "Rainbow, Ripple, Shimmer und Co. Buttons, die zum Klicken einladen.",
	"intro.stats.cards":
		"Karussells, Bento-Raster, 3D-Effekte. Inhalte präsentieren, ohne zu langweilen.",
	"intro.stats.effects":
		"Cursor, Spuren, animierte Texte. Die kleinen Details, die den Unterschied machen.",
	"sidebar.starTitle": "Stern auf GitHub",
	"sidebar.starBody": "Wenn dir FancyUI gefällt, gib einen Stern!",
	"rail.nextPage": "Nächste Seite",
	"intro.nextSteps.heading": "Nächste Schritte",
	"intro.nextSteps.installation": "Installation",
	"intro.nextSteps.theming": "Themes",
	"intro.nextSteps.components": "Komponenten durchsuchen",
	"intro.cta.title": "Neu bei FancyUI?",
	"intro.cta.body":
		"Schau dir den <strong>Theme-Generator</strong> an, um Farben anzupassen und zu sehen, wie Komponenten in Echtzeit reagieren.",
	"intro.cta.button": "Theme-Generator ausprobieren",

	// Core components workspace (sidebar groups, categories, status)
	"group.core": "Core",
	"group.fancy": "Fancy",
	"category.actions": "Aktionen",
	"category.forms": "Formulare",
	"category.overlays": "Overlays",
	"category.display": "Anzeige",
	"status.inProgress": "In Arbeit",

	// Installation (redesigned page)
	"install.metaTitle": "Installation",
	"install.title": "Installation",
	"install.lead":
		"Füge FancyUI in drei Schritten zu einem SvelteKit-Projekt hinzu: Paket installieren, Stylesheet importieren, Komponente rendern.",
	"install.pill.svelte": "Svelte 5",
	"install.pill.tailwind": "Tailwind CSS 4",
	"install.pill.node": "Node.js 20.19+",
	"install.pill.typescript": "TypeScript",
	"install.prerequisites.heading": "Voraussetzungen",
	"install.prerequisites.body":
		"FancyUI zielt auf aktuelle Toolchains. Prüfe diese drei Punkte vor der Installation.",
	"install.prerequisites.card1.title": "SvelteKit",
	"install.prerequisites.card1.version": "Svelte 5",
	"install.prerequisites.card1.desc":
		"Die Komponenten sind mit Runes geschrieben, daher ist Svelte 5 erforderlich. Svelte-4-Projekte kompilieren sie nicht.",
	"install.prerequisites.card2.title": "Tailwind CSS",
	"install.prerequisites.card2.version": "v4",
	"install.prerequisites.card2.desc":
		"Das Styling basiert auf Tailwind-v4-Utilities und CSS-Custom-Properties.",
	"install.prerequisites.card3.title": "Node.js",
	"install.prerequisites.card3.version": "20.19+",
	"install.prerequisites.card3.desc":
		"Wird von den aktuellen Build-Werkzeugen benötigt, gegen die FancyUI getestet wird.",
	"install.steps.heading": "Installieren",
	"install.steps.body":
		"Wähle deinen Paketmanager, binde das Stylesheet ein und rendere dann deine erste Komponente.",
	"install.step1.title": "Paket installieren",
	"install.step1.desc":
		"Ein Paket für alle Komponenten. Wechsle den Tab, um den Befehl für deinen Paketmanager zu kopieren.",
	"install.step2.title": "Stylesheet importieren",
	"install.step2.desc": "Füge das FancyUI-Stylesheet direkt nach deinem Tailwind-Import hinzu.",
	"install.step2.caption": "In deinem globalen Stylesheet, üblicherweise src/app.css.",
	"install.step3.title": "Komponente rendern",
	"install.step3.desc": "Importiere aus dem Paket-Root und füge sie in dein Markup ein.",
	"install.tailwind.heading": "Tailwind-CSS-Setup",
	"install.tailwind.body":
		"FancyUI baut auf Tailwind CSS v4 auf, das in CSS statt in einer JavaScript-Konfigurationsdatei konfiguriert wird. Wenn Tailwind in deinem Projekt bereits funktioniert, gibt es nichts weiter einzurichten.",
	"install.tailwind.order":
		"Die Import-Reihenfolge ist wichtig: zuerst Tailwind, dann FancyUI. Setze den FancyUI-Import vor dein eigenes @custom-variant dark, sonst ersetzt das von FancyUI deines.",
	"install.tailwind.note":
		"Der Einstiegspunkt liefert Standard-Farb-Tokens (background, primary, border und weitere) sowie eine Dark-Variante. Deine eigenen :root- und .dark-Blöcke überschreiben sie: Definiere die CSS-Variablen neu, und deine Werte gelten.",
	"install.usage.heading": "Verwendung",
	"install.usage.body":
		"Jede Komponente ist ein benannter Export des Paket-Roots, es gibt also keine Importpfade pro Komponente zu merken.",
	"install.usage.note":
		"Die Seite jeder Komponente listet ihre Props, Live-Beispiele und Hinweise zur Barrierefreiheit auf.",
	"install.typescript.heading": "TypeScript",
	"install.typescript.body":
		"Die Prop-Typen werden neben jeder Komponente exportiert, sodass du Wrapper und gemeinsame Presets typisieren kannst.",
	"install.typescript.note":
		"Die Typen sind im Paket enthalten. Es gibt kein separates Typen-Paket zu installieren.",
	"install.peerDeps.heading": "Peer-Dependencies",
	"install.peerDeps.body": "FancyUI erwartet, dass diese bereits in deinem Projekt vorhanden sind:",
	"install.peerDeps.colPackage": "Paket",
	"install.peerDeps.colVersion": "Version",
	"install.peerDeps.bundled":
		"Einige Komponenten benötigen zusätzliche Laufzeit-Bibliotheken. Diese werden mit dem Paket ausgeliefert, es gibt also nichts weiter zu installieren:",
	"install.peerDeps.bundledNote": "Sie werden nur von den Komponenten geladen, die sie verwenden.",
	"install.nextSteps.heading": "Nächste Schritte",
	"install.nextSteps.components.title": "Komponenten durchsuchen",
	"install.nextSteps.components.desc":
		"{count} Komponenten mit Live-Vorschauen, Props und Copy-and-paste-Beispielen.",
	"install.nextSteps.theming.title": "Themes",
	"install.nextSteps.theming.desc":
		"Überschreibe die Design-Tokens, damit jede Komponente im hellen und dunklen Modus zu deiner Marke passt.",

	// Theming page
	"theming.metaTitle": "Themes",
	"theming.title": "Themes",
	"theming.lead":
		"Jede FancyUI-Komponente liest ihre Farben, Radien und Timings aus CSS-Custom-Properties im OKLCh-Farbraum — überschreibe einen Token, und die ganze Bibliothek zieht mit.",
	"theming.pill.oklch": "OKLCh-Farbraum",
	"theming.pill.shadcn": "Standardisierte Token-Namen",
	"theming.pill.dark": "Dunkler Modus",
	"theming.pill.tokens": "Design-Tokens",
	"theming.generator.body":
		"Lieber visuell abstimmen? Der Theme-Generator passt diese Tokens mit Live-Reglern an und liefert dir das CSS.",
	"theming.generator.cta": "Theme-Generator öffnen",
	"theming.cssSetup.heading": "CSS-Setup",
	"theming.cssSetup.body":
		"Importiere das FancyUI-Stylesheet in das globale Stylesheet deiner App, üblicherweise src/app.css:",
	"theming.colors.heading": "Farbsystem",
	"theming.colors.body":
		"Alle Farben nutzen den OKLCh-Farbraum für wahrnehmungsgleichmäßige Verläufe:",
	"theming.colors.note":
		"Die Token-Namen folgen der gängigen semantischen Konvention (background, foreground, primary, …), sodass ein bestehendes Theme mit denselben Variablennamen unverändert übernommen wird.",
	"theming.dark.heading": "Dunkler Modus",
	"theming.dark.body":
		"Der dunkle Modus folgt standardmäßig der Systemeinstellung. Setze die Klasse .dark auf <html> oder einen beliebigen Vorfahren, um Dunkel zu erzwingen, oder .light, um Hell zu erzwingen; die dark:-Utilities und jeder Token folgen. Um die dunklen Werte anzupassen, überschreibe sie unter .dark:",
	"theming.motion.heading": "Animations-Tokens",
	"theming.motion.body": "Steuere das Animations-Timing global:",
	"theming.easing.heading": "Easing-Funktionen",
	"theming.easing.body":
		"Auch Easing-Kurven sind Tokens – gemeinsam genutzt von jedem Komponenten-Übergang:",
	"theming.rainbow.heading": "Regenbogen-Verläufe",
	"theming.rainbow.body":
		"Verwendet von RainbowButton, GradientButton und weiteren Verlaufseffekten:",
	"theming.customizing.heading": "Anpassen",
	"theming.customizing.body":
		"Überschreibe einen beliebigen Token in deinem eigenen CSS, um das Aussehen zu ändern:",
	"theming.customizing.note":
		"Tokens kaskadieren: Überschreibe sie global in :root, oder grenze sie auf ein Wrapper-Element ein, um nur einen Bereich zu gestalten.",
	"theming.nextSteps.heading": "Nächste Schritte",
	"theming.nextSteps.generator.title": "Theme-Generator",
	"theming.nextSteps.generator.desc":
		"Stelle jeden Token mit Live-Reglern ein und kopiere das fertige CSS.",
	"theming.nextSteps.components.title": "Komponenten durchsuchen",
	"theming.nextSteps.components.desc":
		"Sieh die Tokens in der gesamten Komponenten-Galerie in Aktion.",

	// Changelog page
	"changelog.metaTitle": "Änderungsprotokoll",
	"changelog.title": "Änderungsprotokoll",
	"changelog.lead": "Jedes FancyUI-Release und was sich darin geändert hat, neueste zuerst.",
	"changelog.latest": "Neueste",
	"changelog.major": "Größere Änderungen",
	"changelog.minor": "Kleinere Änderungen",
	"changelog.patch": "Patch-Änderungen",
	// Cameleon docs skins
	"skin.heading": "Skin",
	"skin.standard": "Standard",
	"skin.brutal": "Brutal",
	"skin.retroOs": "Retro OS",
	"skin.beta": "Beta",
	"a11y.changeSkin": "Skin wechseln",
	"a11y.sound": "Ton",
	"retro.explorer": "Explorer",
	"retro.start": "Start",
	"retro.tagline": "Animierte Komponenten für Svelte 5 — zum Kopieren und Einfügen.",
	"comp.snippetSvelteOnly":
		"Ein vollständiges Beispiel für dieses Framework gibt es noch nicht; vorerst hat nur die Svelte-Version eines.",
	"comp.copyMarkdownSvelte": "Als Markdown kopieren (Svelte)",
	"comp.markdownSvelteOnly": "Der Markdown-Export beschreibt nur die Svelte-Version.",
	"comp.apiNoticeReact":
		"Diese API-Referenz verwendet die Svelte-Namen. In React wird class zu className, on*-Handler werden in camelCase geschrieben (onclick wird zu onClick) und Snippets werden zu ReactNode-Props oder Render-Funktionen.",
	"comp.apiNoticeVue":
		"Diese API-Referenz verwendet die Svelte-Namen. In Vue werden Snippets zu Slots und bindbare Props zu v-model:name.",
	"comp.apiNoticeLink": "Unterschiede zur Svelte-API",
	"install.lead.react":
		"Füge FancyUI in drei Schritten zu einem React-Projekt hinzu: Paket installieren, Stylesheet importieren, Komponente rendern.",
	"install.lead.vue":
		"Füge FancyUI in drei Schritten zu einem Vue-Projekt hinzu: Paket installieren, Stylesheet importieren, Komponente rendern.",
	"install.pill.react": "React 18+",
	"install.pill.vue": "Vue 3.5+",
	"install.prerequisites.card1.title.react": "React",
	"install.prerequisites.card1.version.react": "18 / 19",
	"install.prerequisites.card1.desc.react":
		"Unterstützt React 18 und 19. Die Komponenten werden als Client-Module ausgeliefert, sodass Server Components sie direkt importieren können.",
	"install.prerequisites.card1.title.vue": "Vue",
	"install.prerequisites.card1.version.vue": "3.5+",
	"install.prerequisites.card1.desc.vue":
		"Die Komponenten sind Vue-3.5-Single-File-Components, daher wird Vue 3.5.2 oder neuer benötigt.",

	// Docs audit: chrome, contribution, status, recipes, errors, SEO (native translations, pending review)
	"a11y.skipToContent": "Zum Inhalt springen",
	"a11y.docsBreadcrumb": "Brotkrümelnavigation der Dokumentation",
	"a11y.prevNext": "Vorherige und nächste Seite",
	"a11y.search": "Suchen",
	"search.a11y.close": "Suche schließen",
	"nav.backToSite": "Zurück zur FancyUI-Startseite",
	"nav.recipes": "Rezepte",
	"toc.show": "Inhaltsverzeichnis anzeigen",
	"footer.docs": "Doku",
	"footer.contribute": "Mitwirken",
	"footer.issues": "Issues",
	"footer.discussions": "Diskussionen",
	"footer.security": "Sicherheit",
	"footer.conduct": "Verhaltenskodex",
	"footer.changelog": "Changelog",
	"footer.versions": "Versionen",
	"footer.install": "Installation",
	"footer.license": "MIT-Lizenz",
	"comp.editPage": "Seite bearbeiten",
	"comp.reportIssue": "Problem melden",
	"comp.issueTitle": "[docs] {name}",
	"intro.leadNeutral":
		"ist eine Sammlung von {count} animierten, interaktiven UI-Komponenten für Svelte 5, React und Vue, die auf denselben Design-Tokens aufbauen.",
	"intro.importHint":
		"Importiere die Komponenten, die du brauchst. Der Importpfad richtet sich nach deinem Framework.",
	"install.kitOptional":
		"SvelteKit ist optional: FancyUI funktioniert in jedem Svelte-5-Projekt, das mit Vite gebaut wird.",
	"theming.cssPerFramework":
		"Importiere das Stylesheet für dein Framework: Jedes Paket bringt sein eigenes mit.",
	"status.planned": "Geplant",
	"status.deprecated": "Veraltet",
	"comp.sinceVersion": "Neu in v{version}",
	"comp.deprecatedNotice":
		"Diese Komponente ist veraltet und kann in einer zukünftigen Version entfernt werden.",
	"comp.inspiredByNoLink": "Inspiriert von {name}",
	"recipes.title": "Rezepte",
	"recipes.lead":
		"Schritt-für-Schritt-Kompositionen, die mehrere Komponenten zu einer fertigen Oberfläche verbinden.",
	"recipes.components": "Komponenten: {count}",
	"error.notFoundTitle": "Seite nicht gefunden",
	"error.genericTitle": "Etwas ist schiefgelaufen",
	"error.notFoundBody": "Die gesuchte Seite existiert nicht oder wurde verschoben.",
	"error.genericBody":
		"Es ist ein unerwarteter Fehler aufgetreten. Versuche es erneut oder gehe zurück zur Dokumentation.",
	"error.unauthorizedTitle": "Anmeldung erforderlich",
	"error.unauthorizedBody": "Du musst angemeldet sein, um diese Seite zu nutzen.",
	"error.home": "Zur Startseite",
	"error.browse": "Komponenten durchsuchen",
	"error.search": "Die Dokumentation durchsuchen",
	"error.report": "Defekten Link melden",
	"comp.previewFailed": "Diese Vorschau konnte nicht geladen werden.",
	"demo.noPreview": "Für diese Komponente gibt es noch keine Vorschau.",
	"demo.notFound": "Komponente nicht gefunden.",
	"recipes.steps": "Schritte",
	"recipes.pitfalls": "Stolperfallen",
	"recipes.componentsUsed": "Verwendete Komponenten",
	"seo.introduction":
		"FancyUI ist eine Bibliothek animierter, interaktiver UI-Komponenten für Svelte 5, React und Vue. Erfahre, was enthalten ist und wie du loslegst.",
	"seo.installation":
		"Installiere FancyUI für Svelte 5, React oder Vue: Paket hinzufügen, Stylesheet importieren und die erste Komponente rendern.",
	"seo.theming":
		"Passe FancyUI mit Design-Tokens an: OKLCh-Farben, Radius, Bewegung und Dark Mode für Svelte 5, React und Vue.",
	"seo.themeGenerator":
		"Stimme die OKLCh-Design-Tokens von FancyUI live ab und kopiere das erzeugte CSS in deine App.",
	"seo.changelog": "Versionshinweise zu den FancyUI-Paketen für Svelte 5, React und Vue.",
} satisfies Catalog;

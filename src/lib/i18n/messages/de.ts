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
	"page.theming": "Theme-Anpassung",
	"page.themeGenerator": "Theme-Generator",
	"page.changelog": "Änderungsprotokoll",

	// Header
	"header.search": "Suchen …",
	"a11y.github": "GitHub",
	"a11y.changeTheme": "Theme wechseln",
	"a11y.changeLanguage": "Sprache wechseln",
	"theme.heading": "Theme",
	"theme.system": "System",
	"language.heading": "Sprache",

	// Command search
	"search.placeholder": "Komponenten und Seiten durchsuchen …",
	"search.noResults": "Keine Ergebnisse gefunden",
	"search.esc": "ESC",
	"search.tryInstead": "Probier es stattdessen hiermit:",
	"jobs.heading": "Nach Anwendungsfall stöbern",
	"jobs.feedback": "Feedback geben",
	"jobs.input": "Eingaben erfassen",
	"jobs.attention": "Aufmerksamkeit lenken",
	"jobs.navigate": "Navigieren",
	"jobs.progress": "Fortschritt anzeigen",
	"jobs.surprise": "Überraschen",

	// Component page
	"comp.preview": "Vorschau",
	"comp.code": "Code",
	"comp.installation": "Installation",
	"install.framework": "Framework",
	"install.sourceOnly": "Noch nicht auf npm – diese Portierung gibt es bisher nur im Repository.",
	"install.unavailable": "Für dieses Framework gibt es noch keine Portierung dieser Komponente.",
	"install.copySource": "Quellcode kopieren",
	"install.copySourceNote":
		"Kopiert den Quellcode der Komponente in dein Projekt; der Code gehört dann dir.",
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
	"table.default": "Standardwert",
	"table.description": "Beschreibung",
	"table.slot": "Slot",
	"table.event": "Ereignis",
	"table.payload": "Nutzdaten",
	"table.portName": "Bezeichnung in {framework}",
	"table.portNameUnknown":
		"Lässt sich nicht aus den Benennungsregeln ableiten; siehe die Unterschiede zur Svelte-API.",
	"comp.events": "Ereignisse",
	"comp.copyMarkdown": "Als Markdown kopieren",

	// Copy buttons
	"action.copy": "Kopieren",
	"action.copied": "Kopiert!",

	// Table of contents
	"toc.onThisPage": "Auf dieser Seite",

	// Components gallery
	"gallery.title": "Komponenten",
	"gallery.subtitle":
		"{count} wunderschön animierte Komponenten für Svelte 5, React und Vue. Stöbere, suche und finde, was du brauchst.",
	"gallery.intro":
		"Die Komponenten gibt es für Svelte 5, React und Vue, gestylt mit Tailwind CSS v4 und typisiert mit TypeScript. Jede Seite bietet eine Live-Vorschau und Svelte-Beispiele zum Kopieren, dazu die Verwendung in React und Vue, wo verfügbar. Installiere das Paket einmal, und der Code gehört dir.",
	"gallery.filterPlaceholder": "Komponenten filtern …",
	"gallery.all": "Alle",
	"gallery.noMatch": "Keine Komponente passt zu deiner Suche.",
	"gallery.meta":
		"{components} Komponenten · {categories} Kategorien · Svelte 5 · React · Vue · TypeScript",
	"gallery.results.one": "{count} Ergebnis",
	"gallery.results.other": "{count} Ergebnisse",
	"gallery.clearFilters": "Filter zurücksetzen",
	"gallery.clearSearch": "Suche löschen",
	"gallery.searchHint": "Drücke /, um zu suchen",
	"gallery.groupLabel": "Komponentengruppe",
	"gallery.categoryLabel": "Kategorien",
	"gallery.desc.buttons": "Interaktive Buttons mit ausdrucksstarken Hover- und Klick-Animationen",
	"gallery.desc.cards": "Karten und Container, die auf den Mauszeiger reagieren",
	"gallery.desc.backgrounds": "Animierte und dekorative Hintergründe",
	"gallery.desc.text": "Textanimationen und typografische Effekte",
	"gallery.desc.layout": "Layout-Grundbausteine und strukturelle Komponenten",
	"gallery.desc.feedback": "Tooltips, Toasts, Ladeanzeigen und weiteres Feedback",
	"gallery.desc.data-display": "Listen, Zeitleisten und Datensammlungen",
	"gallery.desc.navigation": "Menüs, Tabs, Links und Orientierungshilfen",
	"gallery.desc.media": "Bilder, Videos und weitere Medien",
	"gallery.desc.effects": "Visuelle Effekte und dekorative Bewegung",
	"gallery.desc.ai-chat": "Nachrichten, Eingabefelder, Threads und gestreamter Text",
	"gallery.desc.ai-agents":
		"Denkschritte, Werkzeugnutzung, Pläne und Karten für menschliche Freigaben",
	"gallery.desc.actions": "Buttons, Schalter und weitere Grundbausteine für Aktionen",
	"gallery.desc.forms": "Eingabefelder und Grundbausteine zum Erfassen von Nutzereingaben",
	"gallery.desc.overlays": "Dialoge, Popovers, Menüs und Sheets",
	"gallery.desc.display": "Badges, Avatare und Statusanzeigen",

	// Theme-generator page
	"tg.metaDescription":
		"Passe die OKLCh-Design-Tokens von FancyUI live an und kopiere das CSS in deine App.",
	"tg.intro":
		"Passe die Design-Tokens von FancyUI an und sieh zu, wie die Komponenten in Echtzeit reagieren. Wenn alles passt, kopiere das generierte CSS in das Stylesheet deiner App (z. B. src/app.css). Farben verwenden den OKLCh-Farbraum, die Regenbogenpalette verwendet HSL. Die vollständige Token-Referenz findest du unter <link>Theme-Anpassung</link>.",
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
	"tg.rainbowPalette": "Regenbogenpalette",
	"tg.livePreview": "Live-Vorschau",
	"tg.cardSurface": "Kartenoberfläche",
	"tg.cardSurfaceDesc": "Verwendet --card, --foreground, --border und --radius.",
	"tg.primaryAction": "Primäraktion",
	"tg.accentBadge": "Akzent-Badge",
	"tg.beamDesc": "Die Farben des Strahls folgen {primary} → {accent}.",
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

	// Introduction page
	"intro.title": "Einführung",
	"intro.metaTitle": "Einführung",
	"intro.pill.animation": "Animation im Mittelpunkt",
	"intro.pill.copyPaste": "Einfach zu kopieren",
	"intro.pill.tailwind": "Tailwind CSS 4",
	"intro.pill.typescript": "TypeScript",
	"intro.philosophy.heading": "Philosophie",
	"intro.philosophy.card2.title": "Animation im Mittelpunkt",
	"intro.philosophy.card2.desc": "Jede Komponente bringt ausgefeilte Animationen direkt mit.",
	"intro.philosophy.card3.title": "Einfach zu kopieren",
	"intro.philosophy.card3.desc": "Als Paket verwenden oder den Quellcode direkt kopieren.",
	"intro.philosophy.card4.title": "Tailwind CSS 4",
	"intro.philosophy.card4.desc": "Gestaltet mit Utility-Klassen und CSS-Custom-Properties.",
	"intro.philosophy.card5.title": "TypeScript",
	"intro.philosophy.card5.desc": "Vollständige Typsicherheit mit exportierten Prop-Interfaces.",
	"intro.quickStart.heading": "Schnellstart",
	"intro.quickStart.step1.title": "Installieren",
	"intro.quickStart.step1.desc": "Füge FancyUI zu deinem Projekt hinzu.",
	"intro.quickStart.step2.title": "Importieren",
	"intro.quickStart.step3.title": "Verwenden",
	"intro.whatsIncluded.heading": "Lieferumfang",
	"intro.whatsIncluded.body.one": "{count} Komponente in {categories} Kategorien:",
	"intro.whatsIncluded.body.other": "{count} Komponenten in {categories} Kategorien:",
	"intro.category.buttons": "Buttons",
	"intro.category.cards": "Karten",
	"intro.category.effects": "Effekte",
	"intro.stats.buttons": "Rainbow, Ripple, Shimmer und Co. Buttons, die geklickt werden wollen.",
	"intro.stats.cards":
		"Karussells, Bento-Raster, 3D-Kippeffekte. So präsentierst du Inhalte, ohne jemanden zu langweilen.",
	"intro.stats.effects":
		"Cursor, Spuren, animierte Texte. Die kleinen Details, die den Unterschied machen.",
	"sidebar.starTitle": "Auf GitHub einen Stern geben",
	"sidebar.starBody": "Wenn dir FancyUI gefällt, gib dem Projekt einen Stern!",
	"rail.nextPage": "Nächste Seite",
	"intro.nextSteps.heading": "Nächste Schritte",
	"intro.nextSteps.installation": "Installation",
	"intro.nextSteps.theming": "Theme-Anpassung",
	"intro.nextSteps.components": "Komponenten entdecken",
	"intro.cta.title": "Neu bei FancyUI?",
	"intro.cta.body":
		"Schau dir den <b>Theme-Generator</b> an, um Farben anzupassen und zu sehen, wie die Komponenten in Echtzeit reagieren.",
	"intro.cta.button": "Theme-Generator ausprobieren",

	// Core components workspace (sidebar groups, categories, status)
	"group.core": "Core",
	"group.fancy": "Fancy",
	"category.actions": "Aktionen",
	"category.forms": "Formulare",
	"category.overlays": "Overlays",
	"category.display": "Anzeige",
	"status.inProgress": "In Arbeit",

	// Installation page
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
		"FancyUI setzt auf aktuelle Toolchains. Prüfe vor der Installation diese drei Punkte.",
	"install.prerequisites.card1.title": "SvelteKit",
	"install.prerequisites.card1.version": "Svelte 5",
	"install.prerequisites.card1.desc":
		"Die Komponenten sind mit Runes geschrieben, daher ist Svelte 5 erforderlich. In Svelte-4-Projekten lassen sie sich nicht kompilieren.",
	"install.prerequisites.card2.title": "Tailwind CSS",
	"install.prerequisites.card2.version": "v4",
	"install.prerequisites.card2.desc":
		"Das Styling basiert auf Tailwind-v4-Utilities und CSS-Custom-Properties.",
	"install.prerequisites.card3.title": "Node.js",
	"install.prerequisites.card3.version": "20.19+",
	"install.prerequisites.card3.desc":
		"Wird von den aktuellen Build-Werkzeugen benötigt, mit denen FancyUI getestet wird.",
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
	"install.step3.desc": "Importiere sie aus dem Paket-Root und setze sie in dein Markup ein.",
	"install.tailwind.heading": "Einrichtung von Tailwind CSS",
	"install.tailwind.body":
		"FancyUI baut auf Tailwind CSS v4 auf, das direkt in CSS konfiguriert wird statt in einer JavaScript-Konfigurationsdatei. Wenn Tailwind in deinem Projekt bereits funktioniert, musst du nichts weiter einrichten.",
	"install.tailwind.order":
		"Die Importreihenfolge ist wichtig: zuerst Tailwind, dann FancyUI. Setze den FancyUI-Import vor dein eigenes @custom-variant dark, sonst ersetzt die Variante von FancyUI deine.",
	"install.tailwind.note":
		"Der Einstiegspunkt liefert Standard-Farbtokens (background, primary, border und weitere) sowie eine dark-Variante. Deine eigenen :root- und .dark-Blöcke überschreiben sie: Definiere die CSS-Variablen neu, und deine Werte setzen sich durch.",
	"install.usage.heading": "Verwendung",
	"install.usage.body":
		"Jede Komponente ist ein benannter Export des Paket-Roots, du musst dir also keine Importpfade pro Komponente merken.",
	"install.usage.note":
		"Auf der Seite jeder Komponente findest du ihre Props, Live-Beispiele und Hinweise zur Barrierefreiheit.",
	"install.typescript.heading": "TypeScript",
	"install.typescript.body":
		"Die Prop-Typen werden neben jeder Komponente exportiert, sodass du Wrapper und gemeinsame Presets typisieren kannst.",
	"install.typescript.note":
		"Die Typen sind im Paket enthalten. Ein separates Typen-Paket musst du nicht installieren.",
	"install.peerDeps.heading": "Peer-Dependencies",
	"install.peerDeps.body": "FancyUI erwartet, dass diese bereits in deinem Projekt vorhanden sind:",
	"install.peerDeps.colPackage": "Paket",
	"install.peerDeps.colVersion": "Version",
	"install.peerDeps.bundled":
		"Einige Komponenten benötigen zusätzliche Laufzeitbibliotheken. Diese sind im Paket enthalten, du musst also nichts weiter installieren:",
	"install.peerDeps.bundledNote":
		"Sie werden nur von den Komponenten eingebunden, die sie verwenden.",
	"install.nextSteps.heading": "Nächste Schritte",
	"install.nextSteps.components.title": "Komponenten entdecken",
	"install.nextSteps.components.desc":
		"{count} Komponenten mit Live-Vorschauen, Props und Beispielen zum Kopieren.",
	"install.nextSteps.theming.title": "Theme-Anpassung",
	"install.nextSteps.theming.desc":
		"Überschreibe die Design-Tokens, damit jede Komponente im hellen und im dunklen Modus zu deiner Marke passt.",

	// Theming page
	"theming.metaTitle": "Theme-Anpassung",
	"theming.title": "Theme-Anpassung",
	"theming.lead":
		"Jede FancyUI-Komponente liest ihre Farben, Radien und Animationszeiten aus CSS-Custom-Properties im OKLCh-Farbraum – überschreibe ein Token, und die ganze Bibliothek zieht mit.",
	"theming.pill.oklch": "OKLCh-Farbraum",
	"theming.pill.shadcn": "Gängige Token-Namen",
	"theming.pill.dark": "Dunkler Modus",
	"theming.pill.tokens": "Design-Tokens",
	"theming.generator.body":
		"Lieber visuell abstimmen? Der Theme-Generator passt diese Tokens mit Live-Reglern an und liefert dir das CSS.",
	"theming.generator.cta": "Theme-Generator öffnen",
	"theming.cssSetup.heading": "CSS einrichten",
	"theming.cssSetup.body":
		"Importiere das FancyUI-Stylesheet in das globale CSS deiner App, üblicherweise src/app.css:",
	"theming.colors.heading": "Farbsystem",
	"theming.colors.body":
		"Alle Farben nutzen den OKLCh-Farbraum für wahrnehmungsgleichmäßige Verläufe:",
	"theming.colors.note":
		"Die Token-Namen folgen der verbreiteten semantischen Konvention (background, foreground, primary, …), sodass ein bestehendes Theme mit denselben Variablennamen ohne Änderungen passt.",
	"theming.dark.heading": "Dunkler Modus",
	"theming.dark.body":
		"Der dunkle Modus folgt standardmäßig der Einstellung des Betriebssystems. Setze die Klasse .dark auf <html> oder ein beliebiges übergeordnetes Element, um den dunklen Modus zu erzwingen, oder .light für den hellen; die dark:-Utilities und alle Tokens ziehen mit. Um die dunklen Werte anzupassen, überschreibe sie unter .dark:",
	"theming.motion.heading": "Animations-Tokens",
	"theming.motion.body": "Steuere die Animationszeiten global:",
	"theming.easing.heading": "Easing-Funktionen",
	"theming.easing.body":
		"Auch Easing-Kurven sind Tokens, die alle Komponentenübergänge gemeinsam nutzen:",
	"theming.rainbow.heading": "Regenbogenverläufe",
	"theming.rainbow.body":
		"Verwendet von RainbowButton, GradientButton und weiteren Verlaufseffekten:",
	"theming.customizing.heading": "Anpassen",
	"theming.customizing.body":
		"Überschreibe ein beliebiges Token in deinem eigenen CSS, um das Aussehen zu ändern:",
	"theming.customizing.note":
		"Tokens kaskadieren: Überschreibe sie global in :root oder beschränke sie auf ein Wrapper-Element, um nur einen einzelnen Bereich zu gestalten.",
	"theming.nextSteps.heading": "Nächste Schritte",
	"theming.nextSteps.generator.title": "Theme-Generator",
	"theming.nextSteps.generator.desc":
		"Stelle jedes Token mit Live-Reglern ein und kopiere das fertige CSS.",
	"theming.nextSteps.components.title": "Komponenten entdecken",
	"theming.nextSteps.components.desc":
		"Sieh dir die Tokens in der gesamten Komponentengalerie in Aktion an.",

	// Changelog page
	"changelog.metaTitle": "Änderungsprotokoll",
	"changelog.title": "Änderungsprotokoll",
	"changelog.lead": "Jedes FancyUI-Release und was sich darin geändert hat, das neueste zuerst.",
	"changelog.latest": "Aktuell",
	"changelog.major": "Größere Änderungen",
	"changelog.minor": "Kleinere Änderungen",
	"changelog.patch": "Patch-Änderungen",
	// Docs skins
	"skin.heading": "Skin",
	"skin.standard": "Standard",
	"skin.brutal": "Brutal",
	"skin.retroOs": "Retro OS",
	"skin.beta": "Beta",
	"a11y.changeSkin": "Skin wechseln",
	"a11y.sound": "Ton",
	"retro.explorer": "Explorer",
	"retro.start": "Start",
	"retro.tagline": "Animierte Komponenten für Svelte 5 – zum Kopieren und Einfügen.",
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
		"Die Komponenten sind Single-File-Components für Vue 3.5, daher ist Vue 3.5.2 oder neuer erforderlich.",

	// Framework-neutral Introduction and Installation copy
	"intro.pill.frameworks": "Svelte 5, React und Vue",
	"intro.philosophy.card1.title": "Svelte, React und Vue",
	"intro.philosophy.card1.desc":
		"Für jedes Framework nativ geschrieben: Runes in Svelte, Hooks in React, die Composition API in Vue.",
	"intro.quickStart.step3.desc": "Füge sie in deine Komponenten ein.",
	"install.peerDeps.optional": "nicht erforderlich",

	// Chrome, contribution, status, recipes, errors, SEO
	"a11y.skipToContent": "Zum Inhalt springen",
	"a11y.docsBreadcrumb": "Brotkrümelnavigation der Dokumentation",
	"a11y.prevNext": "Vorherige und nächste Seite",
	"a11y.search": "Suchen",
	"search.a11y.close": "Suche schließen",
	"nav.backToSite": "Zurück zur FancyUI-Startseite",
	"nav.recipes": "Rezepte",
	"footer.contribute": "Mitwirken",
	"footer.issues": "Issues",
	"footer.discussions": "Diskussionen",
	"footer.security": "Sicherheit",
	"footer.conduct": "Verhaltenskodex",
	"footer.changelog": "Änderungsprotokoll",
	"footer.versions": "Versionen",
	"footer.install": "Installation",
	"footer.license": "MIT-Lizenz",
	"comp.editPage": "Diese Seite bearbeiten",
	"comp.reportIssue": "Problem melden",
	"comp.issueTitle": "[docs] {name}",
	"intro.lead":
		"ist eine Sammlung von <grad>{count}</grad> animierten, interaktiven UI-Komponenten für Svelte 5, React und Vue, die auf denselben Design-Tokens aufbauen.",
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
		"Schritt-für-Schritt-Anleitungen, die mehrere Komponenten zu einer fertigen Oberfläche kombinieren.",
	"recipes.components": "Komponenten: {count}",
	"error.notFoundTitle": "Seite nicht gefunden",
	"error.genericTitle": "Etwas ist schiefgelaufen",
	"error.notFoundBody": "Die gesuchte Seite existiert nicht oder wurde verschoben.",
	"error.genericBody":
		"Es ist ein unerwarteter Fehler aufgetreten. Versuche es erneut oder kehre zur Dokumentation zurück.",
	"error.unauthorizedTitle": "Anmeldung erforderlich",
	"error.unauthorizedBody": "Du musst angemeldet sein, um diese Seite zu nutzen.",
	"error.home": "Zur Startseite",
	"error.browse": "Komponenten entdecken",
	"error.search": "Dokumentation durchsuchen",
	"error.report": "Defekten Link melden",
	"comp.previewFailed": "Diese Vorschau konnte nicht geladen werden.",
	"demo.noPreview": "Für diese Komponente gibt es noch keine Vorschau.",
	"demo.notFound": "Komponente nicht gefunden.",
	"recipes.steps": "Schritte",
	"recipes.pitfalls": "Stolperfallen",
	"recipes.componentsUsed": "Verwendete Komponenten",
	"seo.installation":
		"Installiere FancyUI für Svelte 5, React oder Vue: Paket hinzufügen, Stylesheet importieren und die erste Komponente rendern.",
	"seo.theming":
		"Passe FancyUI mit Design-Tokens an: OKLCh-Farben, Radius, Bewegung und dunkler Modus, für Svelte 5, React und Vue.",
	"seo.themeGenerator":
		"Stimme die OKLCh-Design-Tokens von FancyUI live ab und kopiere das erzeugte CSS in deine App.",
	"seo.changelog": "Versionshinweise zu den FancyUI-Paketen für Svelte 5, React und Vue.",
} satisfies Catalog;

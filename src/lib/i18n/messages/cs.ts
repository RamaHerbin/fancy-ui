import type { Catalog } from "./en.js";

export default {
	// Sidebar / nav
	"nav.gettingStarted": "Začínáme",
	"nav.components": "Komponenty",
	"nav.home": "Domů",
	"nav.docsSuffix": "dokumentace",
	"a11y.closeSidebar": "Zavřít postranní panel",
	"a11y.toggleSidebar": "Přepnout postranní panel",
	"a11y.breadcrumb": "Drobečková navigace",

	// Getting-started page titles
	"page.introduction": "Úvod",
	"page.installation": "Instalace",
	"page.theming": "Motivy",
	"page.themeGenerator": "Generátor motivů",
	"page.changelog": "Seznam změn",

	// Header
	"header.search": "Hledat…",
	"a11y.github": "GitHub",
	"a11y.changeTheme": "Změnit motiv",
	"a11y.changeLanguage": "Změnit jazyk",
	"theme.heading": "Motiv",
	"theme.system": "Systémový",
	"language.heading": "Jazyk",

	// Command search
	"search.placeholder": "Hledat komponenty a stránky…",
	"search.noResults": "Nic nenalezeno",
	"search.esc": "ESC",
	"search.tryInstead": "Možná pomůže některý z těchto dotazů:",
	"jobs.heading": "Procházet podle účelu",
	"jobs.feedback": "Poskytnout zpětnou vazbu",
	"jobs.input": "Získat vstup od uživatele",
	"jobs.attention": "Upoutat pozornost",
	"jobs.navigate": "Navigovat",
	"jobs.progress": "Zobrazit průběh",
	"jobs.surprise": "Překvapit efekty",

	// Component page
	"comp.preview": "Náhled",
	"comp.code": "Kód",
	"comp.installation": "Instalace",
	"install.framework": "Framework",
	"install.sourceOnly": "Zatím není na npm — tato verze je k dispozici v repozitáři.",
	"install.unavailable": "Verze této komponenty pro tento framework zatím neexistuje.",
	"install.copySource": "Kopírovat zdrojový kód",
	"install.copySourceNote": "Zkopíruje zdrojový kód komponenty do projektu; kód pak patří vám.",
	"comp.usage": "Použití",
	"comp.props": "Vlastnosti",
	"comp.slots": "Sloty",
	"comp.links": "Odkazy",
	"comp.sourceCode": "Zdrojový kód",
	"comp.inspiredBy": "Inspirováno",
	"comp.examples": "Příklady",
	"comp.related": "Související komponenty",
	"comp.previous": "Předchozí",
	"comp.next": "Další",
	"status.stable": "Stabilní",

	// Tables
	"table.prop": "Vlastnost",
	"table.type": "Typ",
	"table.default": "Výchozí",
	"table.description": "Popis",
	"table.slot": "Slot",
	"table.event": "Událost",
	"table.payload": "Data",
	"table.portName": "Název pro {framework}",
	"table.portNameUnknown":
		"Nelze odvodit podle pravidel pojmenování; viz rozdíly oproti API Svelte.",
	"comp.events": "Události",
	"comp.copyMarkdown": "Kopírovat jako Markdown",

	// Copy buttons
	"action.copy": "Kopírovat",
	"action.copied": "Zkopírováno!",

	// Table of contents
	"toc.onThisPage": "Na této stránce",

	// Components gallery
	"gallery.title": "Komponenty",
	"gallery.subtitle":
		"{count} krásně animovaných komponent pro Svelte 5, React a Vue. Stačí procházet, hledat a vybrat tu pravou.",
	"gallery.intro":
		"Komponenty jsou k dispozici pro Svelte 5, React a Vue, stylované pomocí Tailwind CSS v4 a typované v TypeScriptu. Každá stránka nabízí živý náhled, příklady pro Svelte ke zkopírování a tam, kde existují, i ukázky použití pro React a Vue. Balíček stačí nainstalovat jednou a kód pak patří vám.",
	"gallery.filterPlaceholder": "Filtrovat komponenty…",
	"gallery.all": "Vše",
	"gallery.noMatch": "Hledání neodpovídají žádné komponenty.",
	"gallery.meta":
		"{components} komponent · {categories} kategorií · Svelte 5 · React · Vue · TypeScript",
	"gallery.results.one": "{count} výsledek",
	"gallery.results.few": "{count} výsledky",
	"gallery.results.many": "{count} výsledku",
	"gallery.results.other": "{count} výsledků",
	"gallery.clearFilters": "Zrušit filtry",
	"gallery.clearSearch": "Vymazat hledání",
	"gallery.searchHint": "Klávesa / spustí hledání",
	"gallery.groupLabel": "Skupina komponent",
	"gallery.categoryLabel": "Kategorie",
	"gallery.desc.buttons": "Interaktivní tlačítka s výrazným pohybem při najetí a stisku",
	"gallery.desc.cards": "Karty a kontejnery, které reagují na ukazatel",
	"gallery.desc.backgrounds": "Animovaná a dekorativní pozadí",
	"gallery.desc.text": "Animace textu a typografické efekty",
	"gallery.desc.layout": "Základní prvky rozvržení a strukturální komponenty",
	"gallery.desc.feedback": "Tooltipy, oznámení, indikátory načítání a další zpětná vazba",
	"gallery.desc.data-display": "Seznamy, časové osy a kolekce dat",
	"gallery.desc.navigation": "Menu, záložky, odkazy a orientace na stránce",
	"gallery.desc.media": "Zobrazení obrázků, videa a dalších médií",
	"gallery.desc.effects": "Vizuální efekty a dekorativní pohyb",
	"gallery.desc.ai-chat": "Zprávy, pole pro psaní, vlákna a streamovaný text",
	"gallery.desc.ai-agents": "Uvažování, volání nástrojů, plány a karty ke schválení člověkem",
	"gallery.desc.actions": "Tlačítka, přepínače a další základní akční prvky",
	"gallery.desc.forms": "Vstupní pole a základní prvky pro zadávání dat uživatelem",
	"gallery.desc.overlays": "Dialogy, vyskakovací okna, menu a vysouvací panely",
	"gallery.desc.display": "Štítky, avatary a zobrazení stavu",

	// Theme-generator page
	"tg.metaDescription":
		"Živé ladění design tokenů OKLCh knihovny FancyUI a zkopírování CSS přímo do aplikace.",
	"tg.intro":
		"Zde lze ladit design tokeny FancyUI a sledovat, jak komponenty reagují v reálném čase. Jakmile je výsledek hotový, stačí vygenerované CSS zkopírovat do šablony stylů aplikace (např. src/app.css). Barvy používají barevný prostor OKLCh, duhová paleta HSL. Úplný přehled tokenů je na stránce <link>Motivy</link>.",
	"tg.presets": "Předvolby",
	"tg.base": "Základní režim",
	"tg.light": "Světlý",
	"tg.dark": "Tmavý",
	"tg.primary": "Primární",
	"tg.accent": "Akcentová",
	"tg.lightness": "Světlost",
	"tg.chroma": "Sytost",
	"tg.hue": "Odstín",
	"tg.radius": "Zaoblení",
	"tg.motion": "Pohyb",
	"tg.rainbowPalette": "Duhová paleta",
	"tg.livePreview": "Živý náhled",
	"tg.cardSurface": "Povrch karty",
	"tg.cardSurfaceDesc": "Používá --card, --foreground, --border a --radius.",
	"tg.primaryAction": "Primární akce",
	"tg.accentBadge": "Akcentový štítek",
	"tg.beamDesc": "Barvy paprsku: {primary} → {accent}.",
	"tg.generatedCss": "Vygenerované CSS",
	"tg.copyCss": "Kopírovat CSS",
	"tg.copied": "Zkopírováno",

	// Category labels (docs-only overlay; registry stays English)
	"category.buttons": "Tlačítka",
	"category.cards": "Karty",
	"category.backgrounds": "Pozadí",
	"category.text": "Text a typografie",
	"category.layout": "Rozvržení",
	"category.feedback": "Zpětná vazba",
	"category.data-display": "Zobrazení dat",
	"category.navigation": "Navigace",
	"category.media": "Média",
	"category.effects": "Efekty",
	"category.ai-chat": "AI chat",
	"category.ai-agents": "AI agenti",

	// Introduction page
	"intro.title": "Úvod",
	"intro.metaTitle": "Úvod",
	"intro.pill.animation": "Animace na prvním místě",
	"intro.pill.copyPaste": "Připraveno ke zkopírování",
	"intro.pill.tailwind": "Tailwind CSS 4",
	"intro.pill.typescript": "TypeScript",
	"intro.philosophy.heading": "Filozofie",
	"intro.philosophy.card2.title": "Animace na prvním místě",
	"intro.philosophy.card2.desc": "Každá komponenta má vyladěné animace hned po instalaci.",
	"intro.philosophy.card3.title": "Připraveno ke zkopírování",
	"intro.philosophy.card3.desc":
		"Jako balíček, nebo jako zdrojový kód zkopírovaný přímo do projektu.",
	"intro.philosophy.card4.title": "Tailwind CSS 4",
	"intro.philosophy.card4.desc": "Stylováno utilitními třídami a proměnnými CSS.",
	"intro.philosophy.card5.title": "TypeScript",
	"intro.philosophy.card5.desc": "Plná typová bezpečnost s exportovanými rozhraními vlastností.",
	"intro.quickStart.heading": "Rychlý start",
	"intro.quickStart.step1.title": "Instalace",
	"intro.quickStart.step1.desc": "Přidání FancyUI do projektu.",
	"intro.quickStart.step2.title": "Import",
	"intro.quickStart.step3.title": "Použití",
	"intro.whatsIncluded.heading": "Co je součástí",
	"intro.whatsIncluded.body.one": "{count} komponenta zařazená do {categories} kategorií:",
	"intro.whatsIncluded.body.few": "{count} komponenty zařazené do {categories} kategorií:",
	"intro.whatsIncluded.body.many": "{count} komponenty zařazené do {categories} kategorií:",
	"intro.whatsIncluded.body.other": "{count} komponent zařazených do {categories} kategorií:",
	"intro.category.buttons": "Tlačítka",
	"intro.category.cards": "Karty",
	"intro.category.effects": "Efekty",
	"intro.stats.buttons": "Rainbow, ripple, shimmer a spol. Tlačítka, která si říkají o kliknutí.",
	"intro.stats.cards":
		"Karusely, bento mřížky, 3D náklony. Způsoby, jak prezentovat obsah a nikoho nenudit.",
	"intro.stats.effects": "Kurzory, stopy, animovaný text. Drobnosti, které dělají rozdíl.",
	"sidebar.starTitle": "Hvězdička na GitHubu",
	"sidebar.starBody": "Líbí se FancyUI? Hvězdička na GitHubu potěší!",
	"rail.nextPage": "Další stránka",
	"intro.nextSteps.heading": "Další kroky",
	"intro.nextSteps.installation": "Instalace",
	"intro.nextSteps.theming": "Motivy",
	"intro.nextSteps.components": "Procházet komponenty",
	"intro.cta.title": "Poprvé s FancyUI?",
	"intro.cta.body":
		"<b>Generátor motivů</b> umožňuje upravit barvy a sledovat, jak komponenty reagují v reálném čase.",
	"intro.cta.button": "Vyzkoušet Generátor motivů",

	// Core components workspace (sidebar groups, categories, status)
	"group.core": "Core",
	"group.fancy": "Fancy",
	"category.actions": "Akce",
	"category.forms": "Formuláře",
	"category.overlays": "Překryvné prvky",
	"category.display": "Zobrazovací prvky",
	"status.inProgress": "Ve vývoji",

	// Installation page
	"install.metaTitle": "Instalace",
	"install.title": "Instalace",
	"install.lead":
		"Přidání FancyUI do projektu SvelteKit ve třech krocích: instalace balíčku, import šablony stylů a vykreslení komponenty.",
	"install.pill.svelte": "Svelte 5",
	"install.pill.tailwind": "Tailwind CSS 4",
	"install.pill.node": "Node.js 20.19+",
	"install.pill.typescript": "TypeScript",
	"install.prerequisites.heading": "Požadavky",
	"install.prerequisites.body":
		"FancyUI cílí na aktuální nástroje. Před instalací je dobré ověřit tyto tři věci.",
	"install.prerequisites.card1.title": "SvelteKit",
	"install.prerequisites.card1.version": "Svelte 5",
	"install.prerequisites.card1.desc":
		"Komponenty jsou napsané pomocí runes, takže je vyžadován Svelte 5. Projekty na Svelte 4 je nezkompilují.",
	"install.prerequisites.card2.title": "Tailwind CSS",
	"install.prerequisites.card2.version": "v4",
	"install.prerequisites.card2.desc": "Stylování stojí na utilitách Tailwindu v4 a proměnných CSS.",
	"install.prerequisites.card3.title": "Node.js",
	"install.prerequisites.card3.version": "20.19+",
	"install.prerequisites.card3.desc":
		"Vyžadují ho aktuální nástroje pro sestavení, se kterými se FancyUI testuje.",
	"install.steps.heading": "Instalace",
	"install.steps.body":
		"Stačí zvolit správce balíčků, připojit šablonu stylů a vykreslit první komponentu.",
	"install.step1.title": "Instalace balíčku",
	"install.step1.desc":
		"Jeden balíček pro všechny komponenty. Na záložkách je připravený příkaz pro každého správce balíčků.",
	"install.step2.title": "Import šablony stylů",
	"install.step2.desc": "Šablona stylů FancyUI patří hned za import Tailwindu.",
	"install.step2.caption": "V globální šabloně stylů, obvykle src/app.css.",
	"install.step3.title": "Vykreslení komponenty",
	"install.step3.desc": "Komponentu stačí importovat z kořene balíčku a vložit do kódu stránky.",
	"install.tailwind.heading": "Nastavení Tailwind CSS",
	"install.tailwind.body":
		"FancyUI staví na Tailwind CSS v4, který se konfiguruje v CSS, nikoli v konfiguračním souboru JavaScriptu. Pokud Tailwind v projektu už funguje, není třeba nic dalšího nastavovat.",
	"install.tailwind.order":
		"Na pořadí importů záleží: nejprve Tailwind, potom FancyUI. Import FancyUI patří před vlastní @custom-variant dark, jinak varianta z FancyUI přepíše tu vlastní.",
	"install.tailwind.note":
		"Vstupní bod poskytuje výchozí barevné tokeny (background, primary, border a další) a tmavou variantu. Vlastní bloky :root a .dark je přepíšou: stačí znovu definovat proměnné CSS a platit budou vlastní hodnoty.",
	"install.usage.heading": "Použití",
	"install.usage.body":
		"Každá komponenta je pojmenovaným exportem z kořene balíčku, takže není nutné pamatovat si importní cesty jednotlivých komponent.",
	"install.usage.note":
		"Stránka každé komponenty uvádí její vlastnosti, živé ukázky a poznámky k přístupnosti.",
	"install.typescript.heading": "TypeScript",
	"install.typescript.body":
		"Typy vlastností se exportují vedle každé komponenty, takže lze typovat obalové komponenty i sdílené předvolby.",
	"install.typescript.note":
		"Typy jsou součástí balíčku. Samostatný balíček s typy není potřeba instalovat.",
	"install.peerDeps.heading": "Peer závislosti",
	"install.peerDeps.body": "FancyUI předpokládá, že tyto balíčky už v projektu jsou:",
	"install.peerDeps.colPackage": "Balíček",
	"install.peerDeps.colVersion": "Verze",
	"install.peerDeps.bundled":
		"Několik komponent potřebuje další běhové knihovny. Ty jsou součástí balíčku, takže není potřeba nic dalšího instalovat:",
	"install.peerDeps.bundledNote": "Načítají je pouze komponenty, které je používají.",
	"install.nextSteps.heading": "Další kroky",
	"install.nextSteps.components.title": "Procházet komponenty",
	"install.nextSteps.components.desc":
		"{count} komponent s živými náhledy, vlastnostmi a příklady ke zkopírování.",
	"install.nextSteps.theming.title": "Motivy",
	"install.nextSteps.theming.desc":
		"Přepsáním design tokenů lze sladit všechny komponenty s vlastní značkou ve světlém i tmavém režimu.",

	// Theming page
	"theming.metaTitle": "Motivy",
	"theming.title": "Motivy",
	"theming.lead":
		"Každá komponenta FancyUI čte barvy, zaoblení a časování z proměnných CSS v barevném prostoru OKLCh — stačí přepsat token a celá knihovna se přizpůsobí.",
	"theming.pill.oklch": "Barevný prostor OKLCh",
	"theming.pill.shadcn": "Standardní názvy tokenů",
	"theming.pill.dark": "Tmavý režim",
	"theming.pill.tokens": "Design tokeny",
	"theming.generator.body":
		"Raději vizuálně? Generátor motivů upravuje tyto tokeny živými posuvníky a vydá hotové CSS.",
	"theming.generator.cta": "Otevřít Generátor motivů",
	"theming.cssSetup.heading": "Nastavení CSS",
	"theming.cssSetup.body":
		"Šablonu stylů FancyUI stačí importovat do globálního CSS aplikace, obvykle src/app.css:",
	"theming.colors.heading": "Systém barev",
	"theming.colors.body":
		"Všechny barvy používají barevný prostor OKLCh, který zajišťuje percepčně rovnoměrné gradienty:",
	"theming.colors.note":
		"Názvy tokenů odpovídají rozšířené sémantické konvenci (background, foreground, primary, …), takže existující motiv se stejnými názvy proměnných funguje beze změny.",
	"theming.dark.heading": "Tmavý režim",
	"theming.dark.body":
		"Tmavý režim se ve výchozím stavu řídí nastavením operačního systému. Třída .dark na <html> nebo na libovolném předkovi vynutí tmavý režim, třída .light světlý; utility dark: i všechny tokeny se přizpůsobí. Tmavé hodnoty lze upravit jejich přepsáním pod .dark:",
	"theming.motion.heading": "Tokeny animací",
	"theming.motion.body": "Globální řízení časování animací:",
	"theming.easing.heading": "Funkce plynulosti",
	"theming.easing.body":
		"Křivky plynulosti jsou také tokeny a sdílejí je přechody všech komponent:",
	"theming.rainbow.heading": "Duhové gradienty",
	"theming.rainbow.body": "Používají je RainbowButton, GradientButton a další gradientové efekty:",
	"theming.customizing.heading": "Přizpůsobení",
	"theming.customizing.body":
		"Libovolný token lze přepsat ve vlastním CSS a změnit tak podobu komponent:",
	"theming.customizing.note":
		"Tokeny se kaskádově dědí: lze je přepsat globálně v :root nebo je omezit na obalový prvek a upravit tak jedinou sekci.",
	"theming.nextSteps.heading": "Další kroky",
	"theming.nextSteps.generator.title": "Generátor motivů",
	"theming.nextSteps.generator.desc":
		"Každý token lze vyladit živými posuvníky a hotové CSS zkopírovat.",
	"theming.nextSteps.components.title": "Procházet komponenty",
	"theming.nextSteps.components.desc": "Tokeny v akci napříč celou galerií komponent.",

	// Changelog page
	"changelog.metaTitle": "Seznam změn",
	"changelog.title": "Seznam změn",
	"changelog.lead": "Všechna vydání FancyUI a jejich změny, od nejnovějších.",
	"changelog.latest": "Nejnovější",
	"changelog.major": "Zásadní změny",
	"changelog.minor": "Menší změny",
	"changelog.patch": "Opravy",

	// Docs skins
	"skin.heading": "Vzhled",
	"skin.standard": "Standardní",
	"skin.brutal": "Brutalistní",
	"skin.retroOs": "Retro OS",
	"skin.beta": "Beta",
	"a11y.changeSkin": "Změnit vzhled",
	"a11y.sound": "Zvuk",
	"retro.explorer": "Průzkumník",
	"retro.start": "Start",
	"retro.tagline": "Animované komponenty pro Svelte 5 — připravené ke zkopírování.",
	"comp.snippetSvelteOnly":
		"Úplný příklad pro tento framework zatím chybí; prozatím ho má jen verze pro Svelte.",
	"comp.copyMarkdownSvelte": "Kopírovat jako Markdown (Svelte)",
	"comp.markdownSvelteOnly": "Export do Markdownu popisuje pouze verzi pro Svelte.",
	"comp.apiNoticeReact":
		"Tato reference API používá názvy ze Svelte. V Reactu se z class stává className, obslužné funkce on* se píší v camelCase (z onclick je onClick) a ze snippetů se stávají vlastnosti typu ReactNode nebo renderovací funkce.",
	"comp.apiNoticeVue":
		"Tato reference API používá názvy ze Svelte. Ve Vue se ze snippetů stávají sloty a z vázatelných vlastností v-model:name.",
	"comp.apiNoticeLink": "Rozdíly oproti API Svelte",
	"install.lead.react":
		"Přidání FancyUI do projektu React ve třech krocích: instalace balíčku, import šablony stylů a vykreslení komponenty.",
	"install.lead.vue":
		"Přidání FancyUI do projektu Vue ve třech krocích: instalace balíčku, import šablony stylů a vykreslení komponenty.",
	"install.pill.react": "React 18+",
	"install.pill.vue": "Vue 3.5+",
	"install.prerequisites.card1.title.react": "React",
	"install.prerequisites.card1.version.react": "18 / 19",
	"install.prerequisites.card1.desc.react":
		"Podporuje React 18 i 19. Komponenty se dodávají jako klientské moduly, takže je mohou přímo importovat i Server Components.",
	"install.prerequisites.card1.title.vue": "Vue",
	"install.prerequisites.card1.version.vue": "3.5+",
	"install.prerequisites.card1.desc.vue":
		"Komponenty jsou psané jako jednosouborové komponenty Vue 3.5, proto je potřeba Vue 3.5.2 nebo novější.",

	// Framework-neutral Introduction and Installation copy
	"intro.pill.frameworks": "Svelte 5, React a Vue",
	"intro.philosophy.card1.title": "Svelte, React a Vue",
	"intro.philosophy.card1.desc":
		"Napsáno nativně pro každý framework: runes ve Svelte, hooks v Reactu a Composition API ve Vue.",
	"intro.quickStart.step3.desc": "Stačí ji vložit do vlastních komponent.",
	"install.peerDeps.optional": "volitelný",

	// Chrome, contribution, status, recipes, errors, SEO
	"a11y.skipToContent": "Přeskočit na obsah",
	"a11y.docsBreadcrumb": "Drobečková navigace dokumentace",
	"a11y.prevNext": "Předchozí a další stránka",
	"a11y.search": "Hledat",
	"search.a11y.close": "Zavřít vyhledávání",
	"nav.backToSite": "Zpět na úvodní stránku FancyUI",
	"nav.recipes": "Recepty",
	"footer.contribute": "Jak přispět",
	"footer.issues": "Issues",
	"footer.discussions": "Diskuze",
	"footer.security": "Zabezpečení",
	"footer.conduct": "Kodex chování",
	"footer.changelog": "Seznam změn",
	"footer.versions": "Verze",
	"footer.install": "Instalace",
	"footer.license": "Licence MIT",
	"comp.editPage": "Upravit tuto stránku",
	"comp.reportIssue": "Nahlásit problém",
	"comp.issueTitle": "[docs] {name}",
	"intro.lead":
		"je kolekce <grad>{count}</grad> animovaných interaktivních UI komponent pro Svelte 5, React a Vue, postavených na společných design tokenech.",
	"intro.importHint":
		"Stačí importovat potřebné komponenty. Cesta importu se liší podle frameworku.",
	"install.kitOptional":
		"SvelteKit je volitelný: FancyUI funguje v jakémkoli projektu Svelte 5 sestaveném pomocí Vite.",
	"theming.cssPerFramework":
		"Šablona stylů se importuje podle frameworku: každý balíček má vlastní.",
	"status.planned": "Plánovaná",
	"status.deprecated": "Zastaralá",
	"comp.sinceVersion": "Nové ve verzi {version}",
	"comp.deprecatedNotice":
		"Tato komponenta je zastaralá a v některém z budoucích vydání může být odstraněna.",
	"comp.inspiredByNoLink": "Inspirace: {name}",
	"recipes.title": "Recepty",
	"recipes.lead": "Postupy krok za krokem, které skládají několik komponent do hotového rozhraní.",
	"recipes.components": "Komponenty: {count}",
	"error.notFoundTitle": "Stránka nenalezena",
	"error.genericTitle": "Něco se pokazilo",
	"error.notFoundBody": "Hledaná stránka neexistuje nebo byla přesunuta.",
	"error.genericBody":
		"Došlo k neočekávané chybě. Pomoci může nový pokus nebo návrat do dokumentace.",
	"error.unauthorizedTitle": "Vyžadováno přihlášení",
	"error.unauthorizedBody": "Tato stránka je dostupná jen po přihlášení.",
	"error.home": "Zpět na úvod",
	"error.browse": "Procházet komponenty",
	"error.search": "Prohledat dokumentaci",
	"error.report": "Nahlásit nefunkční odkaz",
	"comp.previewFailed": "Tento náhled se nepodařilo načíst.",
	"demo.noPreview": "Pro tuto komponentu zatím není k dispozici náhled.",
	"demo.notFound": "Komponenta nenalezena.",
	"recipes.steps": "Kroky",
	"recipes.pitfalls": "Časté chyby",
	"recipes.componentsUsed": "Použité komponenty",
	"seo.installation":
		"Instalace FancyUI pro Svelte 5, React nebo Vue: přidání balíčku, import šablony stylů a vykreslení první komponenty.",
	"seo.theming":
		"Přizpůsobení FancyUI pomocí design tokenů: barvy OKLCh, zaoblení, pohyb a tmavý režim pro Svelte 5, React a Vue.",
	"seo.themeGenerator":
		"Živé ladění design tokenů OKLCh knihovny FancyUI a zkopírování vygenerovaného CSS do aplikace.",
	"seo.changelog": "Poznámky k vydání balíčků FancyUI pro Svelte 5, React a Vue.",
} satisfies Catalog;

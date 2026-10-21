// Czech (cs) — machine-translated draft. TODO: native review.
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
	"page.theming": "Vzhled",
	"page.themeGenerator": "Generátor motivů",
	"page.changelog": "Seznam změn",

	// Header
	"header.search": "Hledat...",
	"a11y.github": "GitHub",
	"a11y.changeTheme": "Změnit motiv",
	"a11y.changeLanguage": "Změnit jazyk",
	"theme.heading": "Motiv",
	"theme.system": "Systémový",
	"language.heading": "Jazyk",

	// Command search
	"search.placeholder": "Hledat komponenty a stránky...",
	"search.noResults": "Nebyly nalezeny žádné výsledky",
	"search.esc": "ESC",
	"search.tryInstead": "Zkuste raději některý z těchto dotazů:",
	"jobs.heading": "Procházet podle toho, co potřebujete",
	"jobs.feedback": "Zpětná vazba",
	"jobs.input": "Sběr vstupu",
	"jobs.attention": "Nasměrování pozornosti",
	"jobs.navigate": "Navigace",
	"jobs.progress": "Zobrazení průběhu",
	"jobs.surprise": "Překvapení",

	// Component page
	"comp.preview": "Náhled",
	"comp.code": "Kód",
	"comp.installation": "Instalace",
	"install.framework": "Framework",
	"install.sourceOnly": "Zatím není na npm — tato verze je v repozitáři.",
	"install.unavailable": "Pro tento framework zatím tato komponenta neexistuje.",
	"install.copySource": "Kopírovat zdroj",
	"install.copySourceNote": "Zkopíruje zdroj komponenty do vašeho projektu; kód je váš.",
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
	"table.portName": "Název v {framework}",
	"table.portNameUnknown": "Nelze odvodit z pravidel pojmenování; viz rozdíly oproti API Svelte.",
	"comp.events": "Události",
	"comp.copyMarkdown": "Kopírovat jako Markdown",
	"comp.editions": "K dispozici pro {editions}.",

	// Copy buttons
	"action.copy": "Kopírovat",
	"action.copied": "Zkopírováno!",

	// Table of contents
	"toc.onThisPage": "Na této stránce",

	// Components gallery
	"gallery.title": "Komponenty",
	"gallery.subtitle":
		"{count} krásně animovaných komponent pro Svelte 5, React, Vue. Procházejte, vyhledávejte a najděte, co potřebujete.",
	"gallery.intro":
		"Komponenty jsou dostupné pro Svelte 5, React a Vue, ostylované pomocí Tailwind CSS v4 a otypované v TypeScriptu. Každá stránka má živý náhled a příklady pro Svelte ke zkopírování, a kde je to k dispozici, i použití pro React a Vue. Balíček nainstalujete jednou a kód je váš.",
	"gallery.filterPlaceholder": "Filtrovat komponenty...",
	"gallery.all": "Vše",
	"gallery.noMatch": "Vašemu hledání neodpovídají žádné komponenty.",
	"gallery.meta":
		"{components} komponent · {categories} kategorií · Svelte 5 · React · Vue · TypeScript",
	"gallery.results.one": "{count} výsledek",
	"gallery.results.few": "Výsledků: {count}",
	"gallery.results.many": "Výsledků: {count}",
	"gallery.results.other": "Výsledků: {count}",
	"gallery.clearFilters": "Zrušit filtry",
	"gallery.clearSearch": "Vymazat hledání",
	"gallery.searchHint": "Stiskněte / pro hledání",
	"gallery.groupLabel": "Skupina komponent",
	"gallery.categoryLabel": "Kategorie",
	"gallery.desc.buttons": "Interaktivní tlačítka s bohatým pohybem při najetí a stisknutí",
	"gallery.desc.cards": "Karty a kontejnery, které reagují na ukazatel",
	"gallery.desc.backgrounds": "Animovaná a dekorativní pozadí",
	"gallery.desc.text": "Animace textu a typografické efekty",
	"gallery.desc.layout": "Layoutové primitivy a strukturální komponenty",
	"gallery.desc.feedback": "Popisky, toasty, loadery a další zpětná vazba",
	"gallery.desc.data-display": "Seznamy, časové osy a kolekce dat",
	"gallery.desc.navigation": "Menu, karty, odkazy a orientace",
	"gallery.desc.media": "Zobrazení obrázků, videa a médií",
	"gallery.desc.effects": "Vizuální efekty a dekorativní pohyb",
	"gallery.desc.ai-chat": "Zprávy, editory, vlákna a streamovaný text",
	"gallery.desc.ai-agents": "Uvažování, použití nástrojů, plány a karty se schválením člověkem",
	"gallery.desc.actions": "Tlačítka, přepínače a další akční primitivy",
	"gallery.desc.forms": "Vstupy a primitivy pro zadávání uživatelských dat",
	"gallery.desc.overlays": "Dialogy, popovery, menu a panely",
	"gallery.desc.display": "Odznaky, avatary a zobrazení stavu",

	// Theme-generator page
	"tg.metaDescription":
		"Nastavte živě designové tokeny OKLCh ve FancyUI a zkopírujte CSS do své aplikace.",
	"tg.intro":
		"Nastavte designové tokeny FancyUI a sledujte, jak komponenty reagují v reálném čase. Až bude vzhled odpovídat, zkopírujte vygenerované CSS do stylesheetu své aplikace (např. src/app.css). Barvy používají barevný prostor OKLCh; duhová paleta používá HSL. Úplnou referenci tokenů najdete v <link>Vzhled</link>.",
	"tg.presets": "Předvolby",
	"tg.base": "Základní",
	"tg.light": "Světlý",
	"tg.dark": "Tmavý",
	"tg.primary": "Primární",
	"tg.accent": "Akcent",
	"tg.lightness": "Světlost",
	"tg.chroma": "Sytost",
	"tg.hue": "Odstín",
	"tg.radius": "Zaoblení",
	"tg.motion": "Pohyb",
	"tg.rainbowPalette": "Duhová paleta",
	"tg.livePreview": "Živý náhled",
	"tg.cardSurface": "Povrch karty",
	"tg.cardSurfaceDesc": "Používá --card, --foreground, --border a --radius.",
	"tg.primaryAction": "Primární akce",
	"tg.accentBadge": "Akcentní štítek",
	"tg.beamDesc": "Barvy paprsku odpovídají {primary} → {accent}.",
	"tg.generatedCss": "Vygenerované CSS",
	"tg.copyCss": "Kopírovat CSS",
	"tg.copied": "Zkopírováno",

	// Category labels (docs-only overlay; registry stays English)
	"category.buttons": "Tlačítka",
	"category.cards": "Karty",
	"category.backgrounds": "Pozadí",
	"category.text": "Text a typografie",
	"category.layout": "Rozvržení",
	"category.feedback": "Zpětná vazba",
	"category.data-display": "Zobrazení dat",
	"category.navigation": "Navigace",
	"category.media": "Média",
	"category.effects": "Efekty",
	"category.ai-chat": "AI chat",
	"category.ai-agents": "AI agenti",

	// Introduction (redesigned page)
	"intro.title": "Úvod",
	"intro.pill.animation": "Animace na prvním místě",
	"intro.pill.copyPaste": "Vhodné pro kopírování",
	"intro.pill.tailwind": "Tailwind CSS 4",
	"intro.pill.typescript": "TypeScript",
	"intro.philosophy.heading": "Filozofie",
	"intro.philosophy.card2.title": "Animace na prvním místě",
	"intro.philosophy.card2.desc": "Každá komponenta je od začátku vybavena vyladěnými animacemi.",
	"intro.philosophy.card3.title": "Vhodné pro kopírování",
	"intro.philosophy.card3.desc": "Použijte jako balíček nebo zkopírujte zdrojový kód přímo.",
	"intro.philosophy.card4.title": "Tailwind CSS 4",
	"intro.philosophy.card4.desc": "Stylováno pomocí utility tříd a vlastních CSS proměnných.",
	"intro.philosophy.card5.title": "TypeScript",
	"intro.philosophy.card5.desc": "Plná typová bezpečnost s exportovanými rozhraními vlastností.",
	"intro.quickStart.heading": "Rychlý start",
	"intro.quickStart.step1.title": "Instalace",
	"intro.quickStart.step1.desc": "Přidejte FancyUI do svého projektu.",
	"intro.quickStart.step2.title": "Import",
	"intro.quickStart.step3.title": "Použití",
	"intro.whatsIncluded.heading": "Co je součástí",
	"intro.whatsIncluded.body.one": "{count} komponent napříč {categories} kategoriemi:",
	"intro.whatsIncluded.body.few": "{count} komponent napříč {categories} kategoriemi:",
	"intro.whatsIncluded.body.many": "{count} komponent napříč {categories} kategoriemi:",
	"intro.whatsIncluded.body.other": "{count} komponent napříč {categories} kategoriemi:",
	"intro.category.buttons": "Tlačítka",
	"intro.category.cards": "Karty",
	"intro.category.effects": "Efekty",
	"intro.stats.buttons": "Rainbow, Ripple, Shimmer a spol. Tlačítka, na která chcete kliknout.",
	"intro.stats.cards": "Karusely, bento mřížky, 3D efekty. Jak prezentovat obsah, aniž by nudil.",
	"intro.stats.effects": "Kurzory, stopy, animované texty. Drobné detaily, které dělají rozdíl.",
	"sidebar.starTitle": "Hvězdička na GitHubu",
	"sidebar.starBody": "Pokud se vám FancyUI líbí, dejte mu hvězdičku!",
	"rail.nextPage": "Další stránka",
	"intro.nextSteps.heading": "Další kroky",
	"intro.nextSteps.installation": "Instalace",
	"intro.nextSteps.theming": "Vzhled",
	"intro.nextSteps.components": "Procházet komponenty",
	"intro.cta.title": "Začínáte s FancyUI?",
	"intro.cta.body":
		"Podívejte se na <b>Generátor motivů</b>, přizpůsobte si barvy a sledujte, jak komponenty reagují v reálném čase.",
	"intro.cta.button": "Vyzkoušet Generátor motivů",

	// Core components workspace (sidebar groups, categories, status)
	"group.core": "Core",
	"group.fancy": "Fancy",
	"category.actions": "Akce",
	"category.forms": "Formuláře",
	"category.overlays": "Překryvy",
	"category.display": "Zobrazení",
	"status.inProgress": "Ve vývoji",

	// Installation (redesigned page)
	"install.metaTitle": "Instalace",
	"install.title": "Instalace",
	"install.lead":
		"Přidejte FancyUI do projektu SvelteKit ve třech krocích: nainstalujte balíček, importujte stylesheet, vykreslete komponentu.",
	"install.pill.svelte": "Svelte 5",
	"install.pill.tailwind": "Tailwind CSS 4",
	"install.pill.node": "Node.js 20.19+",
	"install.pill.typescript": "TypeScript",
	"install.prerequisites.heading": "Předpoklady",
	"install.prerequisites.body":
		"FancyUI cílí na aktuální nástroje. Před instalací zkontrolujte tyto tři věci.",
	"install.prerequisites.card1.title": "SvelteKit",
	"install.prerequisites.card1.version": "Svelte 5",
	"install.prerequisites.card1.desc":
		"Komponenty jsou napsané pomocí runes, takže je vyžadován Svelte 5. Projekty na Svelte 4 je nezkompilují.",
	"install.prerequisites.card2.title": "Tailwind CSS",
	"install.prerequisites.card2.version": "v4",
	"install.prerequisites.card2.desc":
		"Stylování spoléhá na utility třídy Tailwind v4 a vlastní CSS proměnné.",
	"install.prerequisites.card3.title": "Node.js",
	"install.prerequisites.card3.version": "20.19+",
	"install.prerequisites.card3.desc":
		"Vyžadován aktuálními build nástroji, proti kterým se FancyUI testuje.",
	"install.steps.heading": "Instalace",
	"install.steps.body":
		"Zvolte správce balíčků, zapojte stylesheet a pak vykreslete svou první komponentu.",
	"install.step1.title": "Nainstalujte balíček",
	"install.step1.desc":
		"Jeden balíček pro všechny komponenty. Přepněte záložku a zkopírujte příkaz pro svého správce balíčků.",
	"install.step2.title": "Importujte stylesheet",
	"install.step2.desc": "Přidejte stylesheet FancyUI hned za import Tailwindu.",
	"install.step2.caption": "Ve vašem globálním stylesheetu, obvykle src/app.css.",
	"install.step3.title": "Vykreslete komponentu",
	"install.step3.desc": "Importujte z kořene balíčku a vložte ji do svého markupu.",
	"install.tailwind.heading": "Nastavení Tailwind CSS",
	"install.tailwind.body":
		"FancyUI staví na Tailwind CSS v4, který se konfiguruje v CSS místo v JavaScriptovém konfiguračním souboru. Pokud už Tailwind ve vašem projektu funguje, není potřeba nic dalšího nastavovat.",
	"install.tailwind.order":
		"Pořadí importů je důležité: nejprve Tailwind, potom FancyUI. Import FancyUI umístěte před vlastní @custom-variant dark, jinak ten z FancyUI nahradí váš.",
	"install.tailwind.note":
		"Vstupní bod poskytuje výchozí barevné tokeny (background, primary, border a další) a tmavou variantu. Vaše vlastní bloky :root a .dark je přepíšou: znovu definujte CSS proměnné a vaše hodnoty zvítězí.",
	"install.usage.heading": "Použití",
	"install.usage.body":
		"Každá komponenta je pojmenovaný export z kořene balíčku, takže si nemusíte pamatovat importní cesty jednotlivých komponent.",
	"install.usage.note":
		"Stránka každé komponenty uvádí její vlastnosti, živé ukázky a poznámky k přístupnosti.",
	"install.typescript.heading": "TypeScript",
	"install.typescript.body":
		"Typy vlastností jsou exportovány vedle každé komponenty, takže můžete typovat wrappery a sdílené presety.",
	"install.typescript.note":
		"Typy jsou součástí balíčku. Není potřeba instalovat žádný samostatný balíček s typy.",
	"install.peerDeps.heading": "Peer závislosti",
	"install.peerDeps.body": "FancyUI očekává, že tyto balíčky už ve vašem projektu existují:",
	"install.peerDeps.colPackage": "Balíček",
	"install.peerDeps.colVersion": "Verze",
	"install.peerDeps.bundled":
		"Několik komponent potřebuje další runtime knihovny. Ty jsou dodávány s balíčkem, takže není potřeba nic dalšího instalovat:",
	"install.peerDeps.bundledNote": "Načítají je pouze komponenty, které je používají.",
	"install.nextSteps.heading": "Další kroky",
	"install.nextSteps.components.title": "Procházet komponenty",
	"install.nextSteps.components.desc":
		"{count} komponent s živými náhledy, vlastnostmi a příklady ke zkopírování.",
	"install.nextSteps.theming.title": "Vzhled",
	"install.nextSteps.theming.desc":
		"Přepište design tokeny, aby každá komponenta odpovídala vaší značce ve světlém i tmavém režimu.",

	// Theming page
	"theming.metaTitle": "Vzhled",
	"theming.title": "Vzhled",
	"theming.lead":
		"Každá komponenta FancyUI čte své barvy, poloměry a časování z vlastních CSS proměnných v barevném prostoru OKLCh — přepište jeden token a celá knihovna se přizpůsobí.",
	"theming.pill.oklch": "Barevný prostor OKLCh",
	"theming.pill.shadcn": "Standardní názvy tokenů",
	"theming.pill.dark": "Tmavý režim",
	"theming.pill.tokens": "Design tokeny",
	"theming.generator.body":
		"Chcete ho raději doladit vizuálně? Generátor motivů upravuje tyto tokeny pomocí živých posuvníků a dá vám hotové CSS.",
	"theming.generator.cta": "Otevřít Generátor motivů",
	"theming.cssSetup.heading": "Nastavení CSS",
	"theming.cssSetup.body":
		"Importujte stylesheet FancyUI do globálního stylesheetu své aplikace, obvykle src/app.css:",
	"theming.colors.heading": "Systém barev",
	"theming.colors.body":
		"Všechny barvy používají barevný prostor OKLCh pro percepčně jednotné gradienty:",
	"theming.colors.note":
		"Názvy tokenů odpovídají běžně používané sémantické konvenci (background, foreground, primary, …), takže existující motiv se stejnými názvy proměnných funguje beze změny.",
	"theming.dark.heading": "Tmavý režim",
	"theming.dark.body":
		"Tmavý režim ve výchozím stavu sleduje nastavení operačního systému. Přidejte třídu .dark na <html> nebo na libovolného předka pro vynucení tmavého režimu, nebo .light pro vynucení světlého; utility dark: a všechny tokeny jí odpovídají. Chcete-li upravit tmavé hodnoty, přepište je v .dark:",
	"theming.motion.heading": "Tokeny animace",
	"theming.motion.body": "Řiďte časování animací globálně:",
	"theming.easing.heading": "Funkce plynulosti",
	"theming.easing.body":
		"Křivky plynulosti jsou také tokeny, sdílené napříč přechody všech komponent:",
	"theming.rainbow.heading": "Duhové gradienty",
	"theming.rainbow.body": "Používají je RainbowButton, GradientButton a další gradientové efekty:",
	"theming.customizing.heading": "Přizpůsobení",
	"theming.customizing.body": "Přepište libovolný token ve svém vlastním CSS a změňte tak vzhled:",
	"theming.customizing.note":
		"Tokeny se dědí v kaskádě: přepište je globálně v :root, nebo je omezte na obalový prvek a upravte tak vzhled jen jedné sekce.",
	"theming.nextSteps.heading": "Další kroky",
	"theming.nextSteps.generator.title": "Generátor motivů",
	"theming.nextSteps.generator.desc":
		"Upravte každý token pomocí živých posuvníků a zkopírujte hotové CSS.",
	"theming.nextSteps.components.title": "Procházet komponenty",
	"theming.nextSteps.components.desc": "Podívejte se, jak tokeny fungují v celé galerii komponent.",

	// Changelog page
	"changelog.metaTitle": "Seznam změn",
	"changelog.title": "Seznam změn",
	"changelog.lead": "Každé vydání FancyUI a co se v něm změnilo, od nejnovějšího.",
	"changelog.latest": "Nejnovější",
	"changelog.major": "Velké změny",
	"changelog.minor": "Menší změny",
	"changelog.patch": "Opravy",
	// Cameleon docs skins
	"skin.heading": "Vzhled",
	"skin.standard": "Standardní",
	"skin.brutal": "Brutal",
	"skin.retroOs": "Retro OS",
	"skin.beta": "Beta",
	"a11y.changeSkin": "Změnit vzhled",
	"a11y.sound": "Zvuk",
	"retro.explorer": "Průzkumník",
	"retro.start": "Start",
	"retro.tagline": "Animované komponenty pro Svelte 5 — připravené ke zkopírování.",
	"comp.snippetSvelteOnly":
		"Úplný příklad pro tento framework zatím není napsán; zatím ho má jen verze pro Svelte.",
	"comp.copyMarkdownSvelte": "Kopírovat jako Markdown (Svelte)",
	"comp.markdownSvelteOnly": "Export do Markdownu popisuje pouze verzi pro Svelte.",
	"comp.apiNoticeReact":
		"Tato API reference používá názvy ze Svelte. V Reactu se class mění na className, obslužné funkce on* se píší v camelCase (onclick se mění na onClick) a snippety se stávají props typu ReactNode nebo renderovacími funkcemi.",
	"comp.apiNoticeVue":
		"Tato API reference používá názvy ze Svelte. Ve Vue se snippety stávají sloty a svázatelné props se stávají v-model:název.",
	"comp.apiNoticeLink": "Rozdíly oproti API Svelte",
	"install.lead.react":
		"Přidejte FancyUI do projektu React ve třech krocích: nainstalujte balíček, importujte stylesheet, vykreslete komponentu.",
	"install.lead.vue":
		"Přidejte FancyUI do projektu Vue ve třech krocích: nainstalujte balíček, importujte stylesheet, vykreslete komponentu.",
	"install.pill.react": "React 18+",
	"install.pill.vue": "Vue 3.5+",
	"install.prerequisites.card1.title.react": "React",
	"install.prerequisites.card1.version.react": "18 / 19",
	"install.prerequisites.card1.desc.react":
		"Podporuje React 18 a 19. Komponenty se dodávají jako klientské moduly, takže je Server Components mohou importovat přímo.",
	"install.prerequisites.card1.title.vue": "Vue",
	"install.prerequisites.card1.version.vue": "3.5+",
	"install.prerequisites.card1.desc.vue":
		"Komponenty jsou jednosouborové komponenty Vue 3.5, proto je vyžadováno Vue 3.5.2 nebo novější.",

	// Docs audit: framework-neutral Introduction and Installation copy (native translations, pending review)
	"intro.pill.frameworks": "Svelte 5, React, Vue",
	"intro.philosophy.card1.title": "Svelte, React & Vue",
	"intro.philosophy.card1.desc":
		"Napsáno nativně pro každý framework: runes ve Svelte, hooks v Reactu, Composition API ve Vue.",
	"intro.quickStart.step3.desc": "Vložte je do svých komponent.",
	"install.peerDeps.optional": "volitelné",

	// Docs audit: chrome, contribution, status, recipes, errors, SEO (native translations, pending review)
	"a11y.skipToContent": "Přeskočit na obsah",
	"a11y.docsBreadcrumb": "Drobečková navigace dokumentace",
	"a11y.prevNext": "Předchozí a další stránka",
	"a11y.search": "Hledat",
	"search.a11y.close": "Zavřít vyhledávání",
	"nav.backToSite": "Zpět na úvodní stránku FancyUI",
	"nav.recipes": "Recepty",
	"footer.contribute": "Přispívání",
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
		"je kolekce <grad>{count}</grad> animovaných interaktivních komponent rozhraní pro Svelte 5, React a Vue, postavených na stejných design tokenech.",
	"intro.importHint":
		"Naimportujte komponenty, které potřebujete. Cesta importu závisí na frameworku.",
	"install.kitOptional":
		"SvelteKit je volitelný: FancyUI funguje v každém projektu Svelte 5 sestaveném pomocí Vite.",
	"theming.cssPerFramework":
		"Naimportujte stylopis pro daný framework: každý balíček obsahuje vlastní.",
	"status.planned": "Plánováno",
	"status.deprecated": "Zastaralé",
	"comp.sinceVersion": "Novinka ve v{version}",
	"comp.deprecatedNotice": "Tato komponenta je zastaralá a může být v budoucí verzi odstraněna.",
	"comp.inspiredByNoLink": "Inspirováno: {name}",
	"recipes.title": "Recepty",
	"recipes.lead": "Postupné kompozice, které spojují několik komponent do hotového rozhraní.",
	"recipes.components": "Komponenty: {count}",
	"error.notFoundTitle": "Stránka nenalezena",
	"error.genericTitle": "Něco se pokazilo",
	"error.notFoundBody": "Hledaná stránka neexistuje nebo byla přesunuta.",
	"error.genericBody": "Došlo k neočekávané chybě. Zkuste to znovu nebo se vraťte do dokumentace.",
	"error.unauthorizedTitle": "Vyžadováno přihlášení",
	"error.unauthorizedBody": "Pro použití této stránky je nutné být přihlášen.",
	"error.home": "Zpět na úvod",
	"error.browse": "Procházet komponenty",
	"error.search": "Prohledat dokumentaci",
	"error.report": "Nahlásit nefunkční odkaz",
	"comp.previewFailed": "Tuto ukázku se nepodařilo načíst.",
	"demo.noPreview": "Pro tuto komponentu zatím není k dispozici ukázka.",
	"demo.notFound": "Komponenta nenalezena.",
	"recipes.steps": "Kroky",
	"recipes.pitfalls": "Časté chyby",
	"recipes.componentsUsed": "Použité komponenty",
	"seo.installation":
		"Nainstalujte FancyUI pro Svelte 5, React nebo Vue: přidejte balíček, naimportujte stylopis a vykreslete první komponentu.",
	"seo.theming":
		"Přizpůsobte FancyUI pomocí design tokenů: barvy OKLCh, zaoblení, pohyb a tmavý režim pro Svelte 5, React a Vue.",
	"seo.themeGenerator":
		"Upravujte design tokeny OKLCh knihovny FancyUI naživo a zkopírujte vygenerované CSS do aplikace.",
	"seo.changelog": "Poznámky k vydání balíčků FancyUI pro Svelte 5, React a Vue.",
} satisfies Catalog;

// French (fr).
import type { Catalog } from "./en.js";

export default {
	// Sidebar / nav
	"nav.gettingStarted": "Prise en main",
	"nav.components": "Composants",
	"nav.home": "Accueil",
	"nav.docsSuffix": "docs",
	"a11y.closeSidebar": "Fermer la barre latérale",
	"a11y.toggleSidebar": "Basculer la barre latérale",
	"a11y.breadcrumb": "Fil d'Ariane",

	// Getting-started page titles
	"page.introduction": "Introduction",
	"page.installation": "Installation",
	"page.theming": "Thèmes",
	"page.themeGenerator": "Générateur de thème",
	"page.changelog": "Notes de version",

	// Header
	"header.search": "Rechercher…",
	"a11y.github": "GitHub",
	"a11y.changeTheme": "Changer de thème",
	"a11y.changeLanguage": "Changer de langue",
	"theme.heading": "Thème",
	"theme.system": "Système",
	"language.heading": "Langue",

	// Command search
	"search.placeholder": "Rechercher des composants et des pages…",
	"search.noResults": "Aucun résultat",
	"search.esc": "ESC",
	"search.tryInstead": "Essayez plutôt l'une de ces recherches :",
	"jobs.heading": "Parcourir selon vos besoins",
	"jobs.feedback": "Donner un retour visuel",
	"jobs.input": "Recueillir une saisie",
	"jobs.attention": "Attirer l'attention",
	"jobs.navigate": "Naviguer",
	"jobs.progress": "Afficher la progression",
	"jobs.surprise": "Faire de l'effet",

	// Component page
	"comp.preview": "Aperçu",
	"comp.code": "Code",
	"comp.installation": "Installation",
	"install.framework": "Framework",
	"install.sourceOnly": "Pas encore sur npm — ce portage se trouve dans le dépôt.",
	"install.unavailable": "Pas encore de portage de ce composant pour ce framework.",
	"install.copySource": "Copier le code source",
	"install.copySourceNote":
		"Copie le code source du composant dans votre projet ; le code vous appartient.",
	"comp.usage": "Utilisation",
	"comp.props": "Propriétés",
	"comp.slots": "Slots",
	"comp.links": "Liens",
	"comp.sourceCode": "Code source",
	"comp.inspiredBy": "Inspiré de",
	"comp.examples": "Exemples",
	"comp.related": "Composants associés",
	"comp.previous": "Précédent",
	"comp.next": "Suivant",
	"status.stable": "Stable",

	// Tables
	"table.prop": "Propriété",
	"table.type": "Type",
	"table.default": "Valeur par défaut",
	"table.description": "Description",
	"table.slot": "Slot",
	"table.event": "Événement",
	"table.payload": "Données",
	"table.portName": "Nom en {framework}",
	"table.portNameUnknown":
		"Impossible à déduire des règles de nommage ; consultez les différences avec l'API Svelte.",
	"comp.events": "Événements",
	"comp.copyMarkdown": "Copier en Markdown",
	"comp.editions": "Disponible pour {editions}.",

	// Copy buttons
	"action.copy": "Copier",
	"action.copied": "Copié !",

	// Table of contents
	"toc.onThisPage": "Sur cette page",

	// Components gallery
	"gallery.title": "Composants",
	"gallery.subtitle":
		"{count} composants magnifiquement animés pour Svelte 5, React et Vue. Parcourez, recherchez et trouvez ce qu'il vous faut.",
	"gallery.intro":
		"Les composants sont disponibles pour Svelte 5, React et Vue, stylisés avec Tailwind CSS v4 et typés avec TypeScript. Chaque page propose un aperçu en direct et des exemples Svelte à copier-coller, avec l'utilisation en React et en Vue lorsqu'elle est disponible. Installez le paquet une fois et le code vous appartient.",
	"gallery.filterPlaceholder": "Filtrer les composants…",
	"gallery.all": "Tous",
	"gallery.noMatch": "Aucun composant ne correspond à votre recherche.",
	"gallery.meta":
		"{components} composants · {categories} catégories · Svelte 5 · React · Vue · TypeScript",
	"gallery.results.one": "{count} résultat",
	"gallery.results.other": "{count} résultats",
	"gallery.clearFilters": "Effacer les filtres",
	"gallery.clearSearch": "Effacer la recherche",
	"gallery.searchHint": "Appuyez sur / pour rechercher",
	"gallery.groupLabel": "Groupe de composants",
	"gallery.categoryLabel": "Catégories",
	"gallery.desc.buttons": "Boutons interactifs aux animations riches au survol et à l'appui",
	"gallery.desc.cards": "Cartes et conteneurs qui réagissent au pointeur",
	"gallery.desc.backgrounds": "Arrière-plans animés et décoratifs",
	"gallery.desc.text": "Animations de texte et effets typographiques",
	"gallery.desc.layout": "Primitives de mise en page et composants structurels",
	"gallery.desc.feedback":
		"Infobulles, toasts, indicateurs de chargement et autres retours visuels",
	"gallery.desc.data-display": "Listes, chronologies et collections de données",
	"gallery.desc.navigation": "Menus, onglets, liens et aides à l'orientation",
	"gallery.desc.media": "Affichage d'images, de vidéos et de médias",
	"gallery.desc.effects": "Effets visuels et mouvements décoratifs",
	"gallery.desc.ai-chat":
		"Messages, zones de saisie, fils de discussion et texte diffusé en continu",
	"gallery.desc.ai-agents": "Raisonnement, appels d'outils, plans et cartes de validation humaine",
	"gallery.desc.actions": "Boutons, interrupteurs et autres primitives d'action",
	"gallery.desc.forms": "Champs et primitives pour recueillir les saisies de l'utilisateur",
	"gallery.desc.overlays": "Boîtes de dialogue, popovers, menus et panneaux latéraux",
	"gallery.desc.display": "Badges, avatars et indicateurs de statut",

	// Theme-generator page
	"tg.metaDescription":
		"Ajustez en direct les jetons de design OKLCh de FancyUI et copiez le CSS dans votre application.",
	"tg.intro":
		"Ajustez les jetons de design de FancyUI et regardez les composants réagir en temps réel. Quand le rendu vous convient, copiez le CSS généré dans la feuille de style de votre application (par exemple src/app.css). Les couleurs utilisent l'espace colorimétrique OKLCh ; la palette arc-en-ciel utilise HSL. Pour la référence complète des jetons, consultez la page <link>Thèmes</link>.",
	"tg.presets": "Préréglages",
	"tg.base": "Base",
	"tg.light": "Clair",
	"tg.dark": "Sombre",
	"tg.primary": "Primaire",
	"tg.accent": "Accent",
	"tg.lightness": "Clarté",
	"tg.chroma": "Chroma",
	"tg.hue": "Teinte",
	"tg.radius": "Rayon",
	"tg.motion": "Animation",
	"tg.rainbowPalette": "Palette arc-en-ciel",
	"tg.livePreview": "Aperçu en direct",
	"tg.cardSurface": "Surface de carte",
	"tg.cardSurfaceDesc": "Utilise --card, --foreground, --border et --radius.",
	"tg.primaryAction": "Action principale",
	"tg.accentBadge": "Badge d'accent",
	"tg.beamDesc": "Les couleurs du faisceau suivent {primary} → {accent}.",
	"tg.generatedCss": "CSS généré",
	"tg.copyCss": "Copier le CSS",
	"tg.copied": "Copié",

	// Category labels (docs-only overlay; registry stays English)
	"category.buttons": "Boutons",
	"category.cards": "Cartes",
	"category.backgrounds": "Arrière-plans",
	"category.text": "Texte et typographie",
	"category.layout": "Mise en page",
	"category.feedback": "Retour visuel",
	"category.data-display": "Affichage de données",
	"category.navigation": "Navigation",
	"category.media": "Médias",
	"category.effects": "Effets",
	"category.ai-chat": "Conversation IA",
	"category.ai-agents": "Agents IA",

	// Introduction page
	"intro.title": "Introduction",
	"intro.pill.animation": "Animation avant tout",
	"intro.pill.copyPaste": "Facile à copier-coller",
	"intro.pill.tailwind": "Tailwind CSS 4",
	"intro.pill.typescript": "TypeScript",
	"intro.philosophy.heading": "Philosophie",
	"intro.philosophy.card2.title": "Animation avant tout",
	"intro.philosophy.card2.desc":
		"Chaque composant est livré avec des animations soignées, prêtes à l'emploi.",
	"intro.philosophy.card3.title": "Facile à copier-coller",
	"intro.philosophy.card3.desc": "Installez le paquet ou copiez directement le code source.",
	"intro.philosophy.card4.title": "Tailwind CSS 4",
	"intro.philosophy.card4.desc":
		"Stylisés avec des classes utilitaires et des propriétés personnalisées CSS.",
	"intro.philosophy.card5.title": "TypeScript",
	"intro.philosophy.card5.desc":
		"Sûreté de typage complète grâce aux interfaces de propriétés exportées.",
	"intro.quickStart.heading": "Démarrage rapide",
	"intro.quickStart.step1.title": "Installer",
	"intro.quickStart.step1.desc": "Ajoutez FancyUI à votre projet.",
	"intro.quickStart.step2.title": "Importer",
	"intro.quickStart.step3.title": "Utiliser",
	"intro.whatsIncluded.heading": "Ce qui est inclus",
	"intro.whatsIncluded.body.one": "{count} composant réparti en {categories} catégories :",
	"intro.whatsIncluded.body.other": "{count} composants répartis en {categories} catégories :",
	"intro.category.buttons": "Boutons",
	"intro.category.cards": "Cartes",
	"intro.category.effects": "Effets",
	"intro.stats.buttons":
		"Rainbow, Ripple, Shimmer et compagnie. Des boutons qui ne demandent qu'à être cliqués.",
	"intro.stats.cards":
		"Carrousels, grilles bento, inclinaisons 3D. De quoi présenter du contenu sans ennuyer personne.",
	"intro.stats.effects":
		"Curseurs, traînées, textes animés. Les petites touches qui font la différence.",
	"sidebar.starTitle": "Mettre une étoile sur GitHub",
	"sidebar.starBody": "Si FancyUI vous plaît, laissez-lui une étoile !",
	"rail.nextPage": "Page suivante",
	"intro.nextSteps.heading": "Étapes suivantes",
	"intro.nextSteps.installation": "Installation",
	"intro.nextSteps.theming": "Thèmes",
	"intro.nextSteps.components": "Parcourir les composants",
	"intro.cta.title": "Vous découvrez FancyUI ?",
	"intro.cta.body":
		"Ouvrez le <b>Générateur de thème</b> pour personnaliser les couleurs et voir les composants réagir en temps réel.",
	"intro.cta.button": "Essayer le Générateur de thème",

	// Core components workspace (sidebar groups, categories, status)
	"group.core": "Core",
	"group.fancy": "Fancy",
	"category.actions": "Actions",
	"category.forms": "Formulaires",
	"category.overlays": "Superpositions",
	"category.display": "Affichage",
	"status.inProgress": "En développement",

	// Installation page
	"install.metaTitle": "Installation",
	"install.title": "Installation",
	"install.lead":
		"Ajoutez FancyUI à un projet SvelteKit en trois étapes : installez le paquet, importez la feuille de style, affichez un composant.",
	"install.pill.svelte": "Svelte 5",
	"install.pill.tailwind": "Tailwind CSS 4",
	"install.pill.node": "Node.js 20.19+",
	"install.pill.typescript": "TypeScript",
	"install.prerequisites.heading": "Prérequis",
	"install.prerequisites.body":
		"FancyUI cible les chaînes d'outils actuelles. Vérifiez ces trois points avant l'installation.",
	"install.prerequisites.card1.title": "SvelteKit",
	"install.prerequisites.card1.version": "Svelte 5",
	"install.prerequisites.card1.desc":
		"Les composants sont écrits avec les runes, Svelte 5 est donc requis. Les projets Svelte 4 ne pourront pas les compiler.",
	"install.prerequisites.card2.title": "Tailwind CSS",
	"install.prerequisites.card2.version": "v4",
	"install.prerequisites.card2.desc":
		"La mise en forme repose sur les utilitaires de Tailwind v4 et les propriétés personnalisées CSS.",
	"install.prerequisites.card3.title": "Node.js",
	"install.prerequisites.card3.version": "20.19+",
	"install.prerequisites.card3.desc":
		"Requis par les outils de compilation actuels avec lesquels FancyUI est testé.",
	"install.steps.heading": "Installer",
	"install.steps.body":
		"Choisissez votre gestionnaire de paquets, ajoutez la feuille de style, puis affichez votre premier composant.",
	"install.step1.title": "Installer le paquet",
	"install.step1.desc":
		"Un seul paquet pour tous les composants. Changez d'onglet pour copier la commande de votre gestionnaire de paquets.",
	"install.step2.title": "Importer la feuille de style",
	"install.step2.desc": "Ajoutez la feuille de style FancyUI juste après votre import Tailwind.",
	"install.step2.caption": "Dans votre feuille de style globale, généralement src/app.css.",
	"install.step3.title": "Afficher un composant",
	"install.step3.desc": "Importez-le depuis la racine du paquet et placez-le dans votre balisage.",
	"install.tailwind.heading": "Configuration de Tailwind CSS",
	"install.tailwind.body":
		"FancyUI est construit sur Tailwind CSS v4, qui se configure en CSS plutôt que dans un fichier de configuration JavaScript. Si Tailwind fonctionne déjà dans votre projet, il n'y a rien d'autre à configurer.",
	"install.tailwind.order":
		"L'ordre des imports compte : Tailwind d'abord, FancyUI ensuite. Placez l'import de FancyUI avant votre propre @custom-variant dark, sinon celui de FancyUI remplace le vôtre.",
	"install.tailwind.note":
		"Le point d'entrée fournit des jetons de couleur par défaut (background, primary, border, etc.) et une variante sombre. Vos propres blocs :root et .dark les remplacent : redéfinissez les variables CSS et vos valeurs l'emportent.",
	"install.usage.heading": "Utilisation",
	"install.usage.body":
		"Chaque composant est un export nommé de la racine du paquet : aucun chemin d'import par composant à retenir.",
	"install.usage.note":
		"La page de chaque composant présente ses propriétés, des exemples en direct et des notes d'accessibilité.",
	"install.typescript.heading": "TypeScript",
	"install.typescript.body":
		"Les types des propriétés sont exportés à côté de chaque composant : vous pouvez ainsi typer vos composants englobants et vos préréglages partagés.",
	"install.typescript.note":
		"Les types sont livrés dans le paquet. Il n'y a aucun paquet de types séparé à installer.",
	"install.peerDeps.heading": "Dépendances homologues (peer)",
	"install.peerDeps.body": "FancyUI s'attend à les trouver déjà dans votre projet :",
	"install.peerDeps.colPackage": "Paquet",
	"install.peerDeps.colVersion": "Version",
	"install.peerDeps.bundled":
		"Quelques composants ont besoin de bibliothèques d'exécution supplémentaires. Elles sont livrées avec le paquet, il n'y a donc rien de plus à installer :",
	"install.peerDeps.bundledNote":
		"Elles ne sont chargées que par les composants qui les utilisent.",
	"install.nextSteps.heading": "Étapes suivantes",
	"install.nextSteps.components.title": "Parcourir les composants",
	"install.nextSteps.components.desc":
		"{count} composants avec aperçus en direct, propriétés et exemples à copier-coller.",
	"install.nextSteps.theming.title": "Thèmes",
	"install.nextSteps.theming.desc":
		"Redéfinissez les jetons de design pour que chaque composant corresponde à votre marque, en mode clair comme en mode sombre.",

	// Theming page
	"theming.metaTitle": "Thèmes",
	"theming.title": "Thèmes",
	"theming.lead":
		"Chaque composant FancyUI lit ses couleurs, ses rayons et ses durées dans des propriétés personnalisées CSS exprimées dans l'espace colorimétrique OKLCh — redéfinissez un jeton et toute la bibliothèque suit.",
	"theming.pill.oklch": "Espace colorimétrique OKLCh",
	"theming.pill.shadcn": "Noms de jetons standard",
	"theming.pill.dark": "Mode sombre",
	"theming.pill.tokens": "Jetons de design",
	"theming.generator.body":
		"Vous préférez un réglage visuel ? Le Générateur de thème ajuste ces jetons avec des curseurs en direct et vous fournit le CSS.",
	"theming.generator.cta": "Ouvrir le Générateur de thème",
	"theming.cssSetup.heading": "Configuration CSS",
	"theming.cssSetup.body":
		"Importez la feuille de style FancyUI dans le CSS global de votre application, généralement src/app.css :",
	"theming.colors.heading": "Système de couleurs",
	"theming.colors.body":
		"Toutes les couleurs utilisent l'espace colorimétrique OKLCh, pour des dégradés perceptuellement uniformes :",
	"theming.colors.note":
		"Les noms de jetons suivent la convention sémantique courante (background, foreground, primary, …), si bien qu'un thème existant qui emploie les mêmes noms de variables s'intègre sans modification.",
	"theming.dark.heading": "Mode sombre",
	"theming.dark.body":
		"Par défaut, le mode sombre suit la préférence du système d'exploitation. Placez la classe .dark sur <html> ou sur n'importe quel ancêtre pour forcer le mode sombre, ou .light pour forcer le mode clair ; les utilitaires de variante sombre (dark:) et tous les jetons suivent. Pour personnaliser les valeurs sombres, redéfinissez-les sous .dark :",
	"theming.motion.heading": "Jetons d'animation",
	"theming.motion.body": "Réglez la durée des animations de façon globale :",
	"theming.easing.heading": "Fonctions d'accélération",
	"theming.easing.body":
		"Les courbes d'accélération sont elles aussi des jetons, communs à toutes les transitions des composants :",
	"theming.rainbow.heading": "Dégradés arc-en-ciel",
	"theming.rainbow.body":
		"Utilisés par RainbowButton, GradientButton et d'autres effets de dégradé :",
	"theming.customizing.heading": "Personnalisation",
	"theming.customizing.body":
		"Redéfinissez n'importe quel jeton dans votre propre CSS pour changer l'apparence :",
	"theming.customizing.note":
		"Les jetons s'appliquent en cascade : redéfinissez-les globalement dans :root, ou limitez-les à un élément conteneur pour personnaliser une seule section.",
	"theming.nextSteps.heading": "Étapes suivantes",
	"theming.nextSteps.generator.title": "Générateur de thème",
	"theming.nextSteps.generator.desc":
		"Ajustez chaque jeton avec des curseurs en direct et copiez le CSS final.",
	"theming.nextSteps.components.title": "Parcourir les composants",
	"theming.nextSteps.components.desc":
		"Découvrez les jetons à l'œuvre dans toute la galerie de composants.",

	// Changelog page
	"changelog.metaTitle": "Notes de version",
	"changelog.title": "Notes de version",
	"changelog.lead":
		"Chaque version de FancyUI et ce qui y a changé, de la plus récente à la plus ancienne.",
	"changelog.latest": "Dernière",
	"changelog.major": "Changements majeurs",
	"changelog.minor": "Changements mineurs",
	"changelog.patch": "Correctifs",
	// Cameleon docs skins
	"skin.heading": "Skin",
	"skin.standard": "Standard",
	"skin.brutal": "Brutal",
	"skin.retroOs": "Retro OS",
	"skin.beta": "Beta",
	"a11y.changeSkin": "Changer de skin",
	"a11y.sound": "Son",
	// Retro OS docs chrome
	"retro.explorer": "Explorateur",
	"retro.start": "Démarrer",
	"retro.tagline": "Composants animés pour Svelte 5 — prêts à copier-coller.",
	"comp.snippetSvelteOnly":
		"Aucun exemple complet n'est encore écrit pour ce framework ; pour l'instant, seule la version Svelte en a un.",
	"comp.copyMarkdownSvelte": "Copier en Markdown (Svelte)",
	"comp.markdownSvelteOnly": "L'export Markdown décrit uniquement la version Svelte.",
	"comp.apiNoticeReact":
		"Cette référence d'API utilise les noms Svelte. En React, class devient className, les gestionnaires on* s'écrivent en camelCase (onclick devient onClick) et les snippets deviennent des propriétés ReactNode ou des fonctions de rendu.",
	"comp.apiNoticeVue":
		"Cette référence d'API utilise les noms Svelte. En Vue, les snippets deviennent des slots et les propriétés bindables deviennent v-model:nom.",
	"comp.apiNoticeLink": "Différences avec l'API Svelte",
	"install.lead.react":
		"Ajoutez FancyUI à un projet React en trois étapes : installez le paquet, importez la feuille de style, affichez un composant.",
	"install.lead.vue":
		"Ajoutez FancyUI à un projet Vue en trois étapes : installez le paquet, importez la feuille de style, affichez un composant.",
	"install.pill.react": "React 18+",
	"install.pill.vue": "Vue 3.5+",
	"install.prerequisites.card1.title.react": "React",
	"install.prerequisites.card1.version.react": "18 / 19",
	"install.prerequisites.card1.desc.react":
		"Compatible avec React 18 et 19. Les composants sont livrés sous forme de modules client : les Server Components peuvent donc les importer directement.",
	"install.prerequisites.card1.title.vue": "Vue",
	"install.prerequisites.card1.version.vue": "3.5+",
	"install.prerequisites.card1.desc.vue":
		"Les composants sont des composants monofichiers Vue 3.5 : il faut donc Vue 3.5.2 ou une version ultérieure.",

	// Docs audit: framework-neutral Introduction and Installation copy
	"intro.pill.frameworks": "Svelte 5, React et Vue",
	"intro.philosophy.card1.title": "Svelte, React et Vue",
	"intro.philosophy.card1.desc":
		"Écrits nativement pour chaque framework : les runes en Svelte, les hooks en React, la Composition API en Vue.",
	"intro.quickStart.step3.desc": "Intégrez-les dans vos composants.",
	"install.peerDeps.optional": "facultatif",

	// Docs audit: chrome, contribution, status, recipes, errors, SEO
	"a11y.skipToContent": "Aller au contenu",
	"a11y.docsBreadcrumb": "Fil d'Ariane de la documentation",
	"a11y.prevNext": "Pages précédente et suivante",
	"a11y.search": "Rechercher",
	"search.a11y.close": "Fermer la recherche",
	"nav.backToSite": "Retour à l'accueil de FancyUI",
	"nav.recipes": "Recettes",
	"footer.contribute": "Contribuer",
	"footer.issues": "Issues",
	"footer.discussions": "Discussions",
	"footer.security": "Sécurité",
	"footer.conduct": "Code de conduite",
	"footer.changelog": "Notes de version",
	"footer.versions": "Versions",
	"footer.install": "Installation",
	"footer.license": "Licence MIT",
	"comp.editPage": "Modifier cette page",
	"comp.reportIssue": "Signaler un problème",
	"comp.issueTitle": "[docs] {name}",
	"intro.lead":
		"est une collection de <grad>{count}</grad> composants d'interface animés et interactifs pour Svelte 5, React et Vue, construits sur les mêmes jetons de design.",
	"intro.importHint":
		"Importez les composants dont vous avez besoin. Le chemin d'import dépend de votre framework.",
	"install.astro.heading": "Astro",
	"install.astro.body":
		"FancyUI fonctionne dans Astro grâce à l'intégration Svelte officielle, sans paquet supplémentaire. Ajoutez l'intégration et Tailwind, installez le paquet, puis importez la feuille de style de l'étape 2 dans votre layout.",
	"install.astro.static":
		"Un composant utilisé sans directive {directive} est rendu en HTML et CSS et n'envoie aucun JavaScript. BorderBeam, Marquee, Meteors et les boutons sans gestionnaire fonctionnent ainsi.",
	"install.astro.island":
		"Pour hydrater un composant, importez-le dans un fichier {svelte} local et placez la directive sur ce fichier. Les gestionnaires, l'état et les snippets vont aussi dans ce fichier : depuis {astro}, seul le slot par défaut atteint un îlot.",
	"install.astro.why":
		"Ne placez pas la directive sur un composant importé depuis la racine du paquet dans un fichier {astro} : l'îlot chargerait toute la bibliothèque. Pour un seul îlot RainbowButton, le fichier local envoie {wrapped} de JavaScript et la racine du paquet {barrel}, avec three.js et GSAP, un chunk ensuite partagé par toutes les pages à îlots du site.",
	"install.astro.router":
		"{router} est pris en charge : les îlots sont détruits à chaque navigation, et {persist} en garde un actif d'une page à l'autre.",
	"install.astro.versions":
		"Testé avec astro {astroVersion} et @astrojs/svelte {integrationVersion}, qui demandent Node {node} ou plus récent.",
	"install.kitOptional":
		"SvelteKit est facultatif : FancyUI fonctionne dans tout projet Svelte 5 construit avec Vite.",
	"theming.cssPerFramework":
		"Importez la feuille de style de votre framework : chaque paquet fournit la sienne.",
	"status.planned": "Prévu",
	"status.deprecated": "Obsolète",
	"comp.sinceVersion": "Nouveau en v{version}",
	"comp.deprecatedNotice":
		"Ce composant est obsolète et pourrait être retiré dans une prochaine version.",
	"comp.inspiredByNoLink": "Inspiré de {name}",
	"recipes.title": "Recettes",
	"recipes.lead":
		"Des compositions pas à pas qui assemblent plusieurs composants en une interface complète.",
	"recipes.components": "Composants : {count}",
	"error.notFoundTitle": "Page introuvable",
	"error.genericTitle": "Une erreur est survenue",
	"error.notFoundBody": "La page que vous cherchez n'existe pas ou a été déplacée.",
	"error.genericBody":
		"Une erreur inattendue s'est produite. Réessayez ou revenez à la documentation.",
	"error.unauthorizedTitle": "Connexion requise",
	"error.unauthorizedBody": "Une connexion est nécessaire pour utiliser cette page.",
	"error.home": "Retour à l'accueil",
	"error.browse": "Parcourir les composants",
	"error.search": "Rechercher dans la documentation",
	"error.report": "Signaler un lien cassé",
	"comp.previewFailed": "Cet aperçu n'a pas pu être chargé.",
	"demo.noPreview": "Aucun aperçu n'est encore disponible pour ce composant.",
	"demo.notFound": "Composant introuvable.",
	"recipes.steps": "Étapes",
	"recipes.pitfalls": "Pièges à éviter",
	"recipes.componentsUsed": "Composants utilisés",
	"seo.installation":
		"Installez FancyUI pour Svelte 5, React ou Vue : ajoutez le paquet, importez la feuille de style et affichez votre premier composant.",
	"seo.theming":
		"Personnalisez FancyUI avec des jetons de design : couleurs OKLCh, rayon, animation et mode sombre, pour Svelte 5, React et Vue.",
	"seo.themeGenerator":
		"Ajustez en direct les jetons de design OKLCh de FancyUI et copiez le CSS généré dans votre application.",
	"seo.changelog": "Notes de version des paquets FancyUI pour Svelte 5, React et Vue.",
} satisfies Catalog;

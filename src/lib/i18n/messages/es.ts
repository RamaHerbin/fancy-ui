// Spanish (es).
import type { Catalog } from "./en.js";

export default {
	// Sidebar / nav
	"nav.gettingStarted": "Primeros pasos",
	"nav.components": "Componentes",
	"nav.home": "Inicio",
	"nav.docsSuffix": "docs",
	"a11y.closeSidebar": "Cerrar barra lateral",
	"a11y.toggleSidebar": "Alternar barra lateral",
	"a11y.breadcrumb": "Ruta de navegación",

	// Getting-started page titles
	"page.introduction": "Introducción",
	"page.installation": "Instalación",
	"page.theming": "Temas",
	"page.themeGenerator": "Generador de temas",
	"page.changelog": "Registro de cambios",

	// Header
	"header.search": "Buscar...",
	"a11y.github": "GitHub",
	"a11y.changeTheme": "Cambiar tema",
	"a11y.changeLanguage": "Cambiar idioma",
	"theme.heading": "Tema",
	"theme.system": "Sistema",
	"language.heading": "Idioma",

	// Command search
	"search.placeholder": "Buscar componentes y páginas...",
	"search.noResults": "No se encontraron resultados",
	"search.esc": "ESC",
	"search.tryInstead": "Prueba una de estas búsquedas:",
	"jobs.heading": "Explora según lo que necesites",
	"jobs.feedback": "Dar retroalimentación",
	"jobs.input": "Recoger datos",
	"jobs.attention": "Guiar la atención",
	"jobs.navigate": "Navegar",
	"jobs.progress": "Mostrar el progreso",
	"jobs.surprise": "Sorprender",

	// Component page
	"comp.preview": "Vista previa",
	"comp.code": "Código",
	"comp.installation": "Instalación",
	"install.framework": "Framework",
	"install.sourceOnly": "Aún no está en npm: esta versión solo está en el repositorio.",
	"install.unavailable": "Todavía no hay una versión de este componente para este framework.",
	"install.copySource": "Copiar código fuente",
	"install.copySourceNote":
		"Copia el código fuente del componente en tu proyecto; el código pasa a ser tuyo.",
	"comp.usage": "Uso",
	"comp.props": "Props",
	"comp.slots": "Slots",
	"comp.links": "Enlaces",
	"comp.sourceCode": "Código fuente",
	"comp.inspiredBy": "Inspirado en",
	"comp.examples": "Ejemplos",
	"comp.related": "Componentes relacionados",
	"comp.previous": "Anterior",
	"comp.next": "Siguiente",
	"status.stable": "Estable",

	// Tables
	"table.prop": "Prop",
	"table.type": "Tipo",
	"table.default": "Predeterminado",
	"table.description": "Descripción",
	"table.slot": "Slot",
	"table.event": "Evento",
	"table.payload": "Datos",
	"table.portName": "Nombre en {framework}",
	"table.portNameUnknown":
		"No se puede deducir con las reglas de nomenclatura; consulta las diferencias con la API de Svelte.",
	"comp.events": "Eventos",
	"comp.copyMarkdown": "Copiar como Markdown",
	"comp.editions": "Disponible para {editions}.",

	// Copy buttons
	"action.copy": "Copiar",
	"action.copied": "¡Copiado!",

	// Table of contents
	"toc.onThisPage": "En esta página",

	// Components gallery
	"gallery.title": "Componentes",
	"gallery.subtitle":
		"{count} componentes con animaciones cuidadas para Svelte 5, React y Vue. Explora, busca y encuentra lo que necesitas.",
	"gallery.intro":
		"Los componentes están disponibles para Svelte 5, React y Vue, con estilos de Tailwind CSS v4 y tipados con TypeScript. Cada página incluye una vista previa en vivo y ejemplos de Svelte listos para copiar y pegar, además del uso en React y Vue cuando está disponible. Instala el paquete una vez y el código es tuyo.",
	"gallery.filterPlaceholder": "Filtrar componentes...",
	"gallery.all": "Todos",
	"gallery.noMatch": "Ningún componente coincide con tu búsqueda.",
	"gallery.meta":
		"{components} componentes · {categories} categorías · Svelte 5 · React · Vue · TypeScript",
	"gallery.results.one": "{count} resultado",
	"gallery.results.many": "{count} de resultados",
	"gallery.results.other": "{count} resultados",
	"gallery.clearFilters": "Quitar filtros",
	"gallery.clearSearch": "Borrar búsqueda",
	"gallery.searchHint": "Pulsa / para buscar",
	"gallery.groupLabel": "Grupo de componentes",
	"gallery.categoryLabel": "Categorías",
	"gallery.desc.buttons":
		"Botones interactivos con animaciones ricas al pasar el cursor y al pulsar",
	"gallery.desc.cards": "Tarjetas y contenedores que reaccionan al puntero",
	"gallery.desc.backgrounds": "Fondos animados y decorativos",
	"gallery.desc.text": "Animaciones de texto y efectos tipográficos",
	"gallery.desc.layout": "Primitivas de maquetación y componentes estructurales",
	"gallery.desc.feedback":
		"Tooltips, notificaciones, indicadores de carga y otras formas de retroalimentación",
	"gallery.desc.data-display": "Listas, líneas de tiempo y colecciones de datos",
	"gallery.desc.navigation": "Menús, pestañas, enlaces y elementos de orientación",
	"gallery.desc.media": "Imágenes, vídeo y otros contenidos multimedia",
	"gallery.desc.effects": "Efectos visuales y movimiento decorativo",
	"gallery.desc.ai-chat": "Mensajes, cajas de redacción, hilos y texto en streaming",
	"gallery.desc.ai-agents":
		"Razonamiento, uso de herramientas, planes y tarjetas de intervención humana",
	"gallery.desc.actions": "Botones, interruptores y otras primitivas de acción",
	"gallery.desc.forms": "Campos y primitivas para recoger datos del usuario",
	"gallery.desc.overlays": "Diálogos, popovers, menús y paneles",
	"gallery.desc.display": "Insignias, avatares e indicadores de estado",

	// Theme-generator page
	"tg.metaDescription":
		"Ajusta en vivo los tokens de diseño OKLCh de FancyUI y copia el CSS en tu aplicación.",
	"tg.intro":
		"Ajusta los tokens de diseño de FancyUI y observa cómo reaccionan los componentes en tiempo real. Cuando te convenza el resultado, copia el CSS generado en la hoja de estilos de tu aplicación (por ejemplo, src/app.css). Los colores usan el espacio de color OKLCh; la paleta arcoíris usa HSL. Para la referencia completa de tokens, consulta <link>Temas</link>.",
	"tg.presets": "Preajustes",
	"tg.base": "Base",
	"tg.light": "Claro",
	"tg.dark": "Oscuro",
	"tg.primary": "Primario",
	"tg.accent": "Acento",
	"tg.lightness": "Luminosidad",
	"tg.chroma": "Croma",
	"tg.hue": "Tono",
	"tg.radius": "Radio",
	"tg.motion": "Movimiento",
	"tg.rainbowPalette": "Paleta arcoíris",
	"tg.livePreview": "Vista previa en vivo",
	"tg.cardSurface": "Superficie de tarjeta",
	"tg.cardSurfaceDesc": "Usa --card, --foreground, --border y --radius.",
	"tg.primaryAction": "Acción principal",
	"tg.accentBadge": "Insignia de acento",
	"tg.beamDesc": "Los colores del haz siguen {primary} → {accent}.",
	"tg.generatedCss": "CSS generado",
	"tg.copyCss": "Copiar CSS",
	"tg.copied": "Copiado",

	// Category labels (docs-only overlay; registry stays English)
	"category.buttons": "Botones",
	"category.cards": "Tarjetas",
	"category.backgrounds": "Fondos",
	"category.text": "Texto y tipografía",
	"category.layout": "Maquetación",
	"category.feedback": "Retroalimentación",
	"category.data-display": "Visualización de datos",
	"category.navigation": "Navegación",
	"category.media": "Multimedia",
	"category.effects": "Efectos",
	"category.ai-chat": "Chat con IA",
	"category.ai-agents": "Agentes de IA",

	// Introduction page
	"intro.title": "Introducción",
	"intro.pill.animation": "Centrado en la animación",
	"intro.pill.copyPaste": "Listo para copiar y pegar",
	"intro.pill.tailwind": "Tailwind CSS 4",
	"intro.pill.typescript": "TypeScript",
	"intro.philosophy.heading": "Filosofía",
	"intro.philosophy.card2.title": "Centrado en la animación",
	"intro.philosophy.card2.desc": "Cada componente incluye animaciones pulidas listas para usar.",
	"intro.philosophy.card3.title": "Listo para copiar y pegar",
	"intro.philosophy.card3.desc": "Úsalo como paquete o copia el código fuente directamente.",
	"intro.philosophy.card4.title": "Tailwind CSS 4",
	"intro.philosophy.card4.desc":
		"Estilos con clases utilitarias y propiedades personalizadas de CSS.",
	"intro.philosophy.card5.title": "TypeScript",
	"intro.philosophy.card5.desc": "Seguridad de tipos completa con interfaces de props exportadas.",
	"intro.quickStart.heading": "Inicio rápido",
	"intro.quickStart.step1.title": "Instalar",
	"intro.quickStart.step1.desc": "Añade FancyUI a tu proyecto.",
	"intro.quickStart.step2.title": "Importar",
	"intro.quickStart.step3.title": "Usar",
	"intro.whatsIncluded.heading": "Qué incluye",
	"intro.whatsIncluded.body.one": "{count} componente en {categories} categoría:",
	"intro.whatsIncluded.body.many": "{count} de componentes en {categories} categorías:",
	"intro.whatsIncluded.body.other": "{count} componentes en {categories} categorías:",
	"intro.category.buttons": "Botones",
	"intro.category.cards": "Tarjetas",
	"intro.category.effects": "Efectos",
	"intro.stats.buttons": "Rainbow, Ripple, Shimmer y compañía. Botones que piden a gritos un clic.",
	"intro.stats.cards":
		"Carruseles, cuadrículas bento, inclinaciones 3D. Formas de presentar contenido sin aburrir a nadie.",
	"intro.stats.effects":
		"Cursores, estelas, textos animados. Los pequeños detalles que marcan la diferencia.",
	"sidebar.starTitle": "Dale una estrella en GitHub",
	"sidebar.starBody": "Si te gusta FancyUI, ¡déjale una estrella!",
	"rail.nextPage": "Página siguiente",
	"intro.nextSteps.heading": "Próximos pasos",
	"intro.nextSteps.installation": "Instalación",
	"intro.nextSteps.theming": "Temas",
	"intro.nextSteps.components": "Explorar componentes",
	"intro.cta.title": "¿Primera vez con FancyUI?",
	"intro.cta.body":
		"Prueba el <b>Generador de temas</b> para personalizar los colores y ver cómo reaccionan los componentes en tiempo real.",
	"intro.cta.button": "Probar el Generador de temas",

	// Core components workspace (sidebar groups, categories, status)
	"group.core": "Core",
	"group.fancy": "Fancy",
	"category.actions": "Acciones",
	"category.forms": "Formularios",
	"category.overlays": "Superposiciones",
	"category.display": "Visualización",
	"status.inProgress": "En desarrollo",

	// Installation page
	"install.metaTitle": "Instalación",
	"install.title": "Instalación",
	"install.lead":
		"Añade FancyUI a un proyecto de SvelteKit en tres pasos: instala el paquete, importa la hoja de estilos y renderiza un componente.",
	"install.pill.svelte": "Svelte 5",
	"install.pill.tailwind": "Tailwind CSS 4",
	"install.pill.node": "Node.js 20.19+",
	"install.pill.typescript": "TypeScript",
	"install.prerequisites.heading": "Requisitos previos",
	"install.prerequisites.body":
		"FancyUI está pensado para las herramientas actuales. Comprueba estos tres requisitos antes de instalar.",
	"install.prerequisites.card1.title": "SvelteKit",
	"install.prerequisites.card1.version": "Svelte 5",
	"install.prerequisites.card1.desc":
		"Los componentes están escritos con runes, por lo que Svelte 5 es obligatorio. Los proyectos con Svelte 4 no podrán compilarlos.",
	"install.prerequisites.card2.title": "Tailwind CSS",
	"install.prerequisites.card2.version": "v4",
	"install.prerequisites.card2.desc":
		"Los estilos se basan en las utilidades de Tailwind v4 y en propiedades personalizadas de CSS.",
	"install.prerequisites.card3.title": "Node.js",
	"install.prerequisites.card3.version": "20.19+",
	"install.prerequisites.card3.desc":
		"Lo exigen las herramientas de compilación actuales con las que se prueba FancyUI.",
	"install.steps.heading": "Instalar",
	"install.steps.body":
		"Elige tu gestor de paquetes, configura la hoja de estilos y renderiza tu primer componente.",
	"install.step1.title": "Instalar el paquete",
	"install.step1.desc":
		"Un solo paquete para todos los componentes. Cambia de pestaña para copiar el comando de tu gestor de paquetes.",
	"install.step2.title": "Importar la hoja de estilos",
	"install.step2.desc":
		"Añade la hoja de estilos de FancyUI justo después de la importación de Tailwind.",
	"install.step2.caption": "En tu hoja de estilos global, normalmente src/app.css.",
	"install.step3.title": "Renderizar un componente",
	"install.step3.desc": "Importa desde la raíz del paquete y colócalo en tu marcado.",
	"install.tailwind.heading": "Configuración de Tailwind CSS",
	"install.tailwind.body":
		"FancyUI está construido sobre Tailwind CSS v4, que se configura en CSS en lugar de en un archivo de configuración de JavaScript. Si Tailwind ya funciona en tu proyecto, no hay nada más que configurar.",
	"install.tailwind.order":
		"El orden de las importaciones es importante: primero Tailwind, después FancyUI. Coloca la importación de FancyUI antes de tu propio @custom-variant dark; de lo contrario, el de FancyUI sustituye al tuyo.",
	"install.tailwind.note":
		"El punto de entrada aporta tokens de color por defecto (background, primary, border y el resto) y una variante oscura. Tus propios bloques :root y .dark los sustituyen: redefine las variables CSS y tus valores prevalecen.",
	"install.usage.heading": "Uso",
	"install.usage.body":
		"Cada componente es una exportación con nombre de la raíz del paquete, así que no hay rutas de importación por componente que recordar.",
	"install.usage.note":
		"La página de cada componente recoge sus props, ejemplos en vivo y notas de accesibilidad.",
	"install.typescript.heading": "TypeScript",
	"install.typescript.body":
		"Los tipos de las props se exportan junto a cada componente, así que puedes tipar tus wrappers y preajustes compartidos.",
	"install.typescript.note":
		"Los tipos vienen dentro del paquete. No hay que instalar ningún paquete de tipos aparte.",
	"install.peerDeps.heading": "Dependencias entre pares",
	"install.peerDeps.body": "FancyUI da por hecho que ya están en tu proyecto:",
	"install.peerDeps.colPackage": "Paquete",
	"install.peerDeps.colVersion": "Versión",
	"install.peerDeps.bundled":
		"Algunos componentes necesitan bibliotecas de ejecución adicionales. Vienen incluidas en el paquete, así que no hay nada más que instalar:",
	"install.peerDeps.bundledNote": "Solo las cargan los componentes que las usan.",
	"install.nextSteps.heading": "Próximos pasos",
	"install.nextSteps.components.title": "Explorar componentes",
	"install.nextSteps.components.desc":
		"{count} componentes con vistas previas en vivo, props y ejemplos para copiar y pegar.",
	"install.nextSteps.theming.title": "Temas",
	"install.nextSteps.theming.desc":
		"Redefine los tokens de diseño para que cada componente encaje con tu marca en modo claro y oscuro.",

	// Theming page
	"theming.metaTitle": "Temas",
	"theming.title": "Temas",
	"theming.lead":
		"Cada componente de FancyUI lee sus colores, radios y tiempos de propiedades personalizadas de CSS en el espacio de color OKLCh: redefine un token y toda la biblioteca se adapta.",
	"theming.pill.oklch": "Espacio de color OKLCh",
	"theming.pill.shadcn": "Nombres de tokens estándar",
	"theming.pill.dark": "Modo oscuro",
	"theming.pill.tokens": "Tokens de diseño",
	"theming.generator.body":
		"¿Prefieres ajustarlo visualmente? El Generador de temas modifica estos tokens con controles deslizantes en vivo y te entrega el CSS.",
	"theming.generator.cta": "Abrir el Generador de temas",
	"theming.cssSetup.heading": "Configuración de CSS",
	"theming.cssSetup.body":
		"Importa la hoja de estilos de FancyUI en el CSS global de tu aplicación, normalmente src/app.css:",
	"theming.colors.heading": "Sistema de colores",
	"theming.colors.body":
		"Todos los colores usan el espacio de color OKLCh para obtener degradados perceptualmente uniformes:",
	"theming.colors.note":
		"Los nombres de los tokens siguen la convención semántica habitual (background, foreground, primary, …), así que un tema ya existente con los mismos nombres de variables funciona sin cambios.",
	"theming.dark.heading": "Modo oscuro",
	"theming.dark.body":
		"Por defecto, el modo oscuro sigue la preferencia del sistema operativo. Pon la clase .dark en <html> o en cualquier ancestro para forzar el modo oscuro, o .light para forzar el claro; las utilidades dark: y todos los tokens se adaptan. Para personalizar los valores oscuros, redefínelos dentro de .dark:",
	"theming.motion.heading": "Tokens de animación",
	"theming.motion.body": "Controla los tiempos de las animaciones de forma global:",
	"theming.easing.heading": "Funciones de easing",
	"theming.easing.body":
		"Las curvas de easing también son tokens, compartidos por todas las transiciones de los componentes:",
	"theming.rainbow.heading": "Degradados arcoíris",
	"theming.rainbow.body": "Los usan RainbowButton, GradientButton y otros efectos de degradado:",
	"theming.customizing.heading": "Personalización",
	"theming.customizing.body": "Redefine cualquier token en tu propio CSS para cambiar el aspecto:",
	"theming.customizing.note":
		"Los tokens se propagan en cascada: redefínelos globalmente en :root o limítalos a un elemento contenedor para aplicar el tema a una sola sección.",
	"theming.nextSteps.heading": "Próximos pasos",
	"theming.nextSteps.generator.title": "Generador de temas",
	"theming.nextSteps.generator.desc":
		"Ajusta cada token con controles deslizantes en vivo y copia el CSS final.",
	"theming.nextSteps.components.title": "Explorar componentes",
	"theming.nextSteps.components.desc":
		"Observa los tokens en acción en toda la galería de componentes.",

	// Changelog page
	"changelog.metaTitle": "Registro de cambios",
	"changelog.title": "Registro de cambios",
	"changelog.lead":
		"Cada versión de FancyUI y lo que cambió en ella, empezando por la más reciente.",
	"changelog.latest": "Más reciente",
	"changelog.major": "Cambios mayores",
	"changelog.minor": "Cambios menores",
	"changelog.patch": "Cambios de parche",
	// Docs skins
	"skin.heading": "Skin",
	"skin.standard": "Estándar",
	"skin.brutal": "Brutal",
	"skin.retroOs": "Retro OS",
	"skin.beta": "Beta",
	"a11y.changeSkin": "Cambiar de skin",
	"a11y.sound": "Sonido",
	// Retro OS docs chrome
	"retro.explorer": "Explorador",
	"retro.start": "Inicio",
	"retro.tagline": "Componentes animados para Svelte 5, listos para copiar y pegar.",
	"comp.snippetSvelteOnly":
		"Todavía no hay un ejemplo completo para este framework; por ahora solo la versión de Svelte lo tiene.",
	"comp.copyMarkdownSvelte": "Copiar como Markdown (Svelte)",
	"comp.markdownSvelteOnly": "La exportación a Markdown describe solo la versión de Svelte.",
	"comp.apiNoticeReact":
		"Esta referencia de API usa los nombres de Svelte. En React, class pasa a ser className, los manejadores on* se escriben en camelCase (onclick pasa a ser onClick) y los snippets pasan a ser props ReactNode o funciones de renderizado.",
	"comp.apiNoticeVue":
		"Esta referencia de API usa los nombres de Svelte. En Vue, los snippets pasan a ser slots y las props enlazables pasan a ser v-model:name.",
	"comp.apiNoticeLink": "Diferencias con la API de Svelte",
	"install.lead.react":
		"Añade FancyUI a un proyecto de React en tres pasos: instala el paquete, importa la hoja de estilos y renderiza un componente.",
	"install.lead.vue":
		"Añade FancyUI a un proyecto de Vue en tres pasos: instala el paquete, importa la hoja de estilos y renderiza un componente.",
	"install.pill.react": "React 18+",
	"install.pill.vue": "Vue 3.5+",
	"install.prerequisites.card1.title.react": "React",
	"install.prerequisites.card1.version.react": "18 / 19",
	"install.prerequisites.card1.desc.react":
		"Compatible con React 18 y 19. Los componentes se publican como módulos de cliente, así que los Server Components pueden importarlos directamente.",
	"install.prerequisites.card1.title.vue": "Vue",
	"install.prerequisites.card1.version.vue": "3.5+",
	"install.prerequisites.card1.desc.vue":
		"Los componentes son componentes de archivo único de Vue 3.5, por lo que se requiere Vue 3.5.2 o posterior.",

	// Framework-neutral Introduction and Installation copy
	"intro.pill.frameworks": "Svelte 5, React y Vue",
	"intro.philosophy.card1.title": "Svelte, React y Vue",
	"intro.philosophy.card1.desc":
		"Escritos de forma nativa para cada framework: runes en Svelte, hooks en React y la Composition API en Vue.",
	"intro.quickStart.step3.desc": "Colócalos en tus componentes.",
	"install.peerDeps.optional": "opcional",

	// Chrome, contribution, status, recipes, errors, SEO
	"a11y.skipToContent": "Saltar al contenido",
	"a11y.docsBreadcrumb": "Ruta de navegación de la documentación",
	"a11y.prevNext": "Páginas anterior y siguiente",
	"a11y.search": "Buscar",
	"search.a11y.close": "Cerrar la búsqueda",
	"nav.backToSite": "Volver al inicio de FancyUI",
	"nav.recipes": "Recetas",
	"footer.contribute": "Contribuir",
	"footer.issues": "Issues",
	"footer.discussions": "Debates",
	"footer.security": "Seguridad",
	"footer.conduct": "Código de conducta",
	"footer.changelog": "Registro de cambios",
	"footer.versions": "Versiones",
	"footer.install": "Instalación",
	"footer.license": "Licencia MIT",
	"comp.editPage": "Editar esta página",
	"comp.reportIssue": "Informar de un problema",
	"comp.issueTitle": "[docs] {name}",
	"intro.lead":
		"es una colección de <grad>{count}</grad> componentes de interfaz animados e interactivos para Svelte 5, React y Vue, construidos sobre los mismos tokens de diseño.",
	"intro.importHint":
		"Importa los componentes que necesites. La ruta de importación depende de tu framework.",
	"install.kitOptional":
		"SvelteKit es opcional: FancyUI funciona en cualquier proyecto de Svelte 5 creado con Vite.",
	"theming.cssPerFramework":
		"Importa la hoja de estilos de tu framework: cada paquete incluye la suya.",
	"status.planned": "Previsto",
	"status.deprecated": "Obsoleto",
	"comp.sinceVersion": "Nuevo en v{version}",
	"comp.deprecatedNotice":
		"Este componente está obsoleto y podría eliminarse en una versión futura.",
	"comp.inspiredByNoLink": "Inspirado en {name}",
	"recipes.title": "Recetas",
	"recipes.lead":
		"Composiciones paso a paso que combinan varios componentes en una interfaz completa.",
	"recipes.components": "Componentes: {count}",
	"error.notFoundTitle": "Página no encontrada",
	"error.genericTitle": "Algo salió mal",
	"error.notFoundBody": "La página que buscas no existe o se ha movido.",
	"error.genericBody":
		"Se produjo un error inesperado. Inténtalo de nuevo o vuelve a la documentación.",
	"error.unauthorizedTitle": "Es necesario iniciar sesión",
	"error.unauthorizedBody": "Debes iniciar sesión para usar esta página.",
	"error.home": "Volver al inicio",
	"error.browse": "Explorar componentes",
	"error.search": "Buscar en la documentación",
	"error.report": "Informar de un enlace roto",
	"comp.previewFailed": "No se pudo cargar esta vista previa.",
	"demo.noPreview": "Todavía no hay vista previa para este componente.",
	"demo.notFound": "Componente no encontrado.",
	"recipes.steps": "Pasos",
	"recipes.pitfalls": "Errores comunes",
	"recipes.componentsUsed": "Componentes utilizados",
	"seo.installation":
		"Instala FancyUI para Svelte 5, React o Vue: añade el paquete, importa la hoja de estilos y renderiza tu primer componente.",
	"seo.theming":
		"Personaliza FancyUI con tokens de diseño: colores OKLCh, radio, movimiento y modo oscuro, para Svelte 5, React y Vue.",
	"seo.themeGenerator":
		"Ajusta en vivo los tokens de diseño OKLCh de FancyUI y copia el CSS generado en tu aplicación.",
	"seo.changelog": "Notas de versión de los paquetes de FancyUI para Svelte 5, React y Vue.",
} satisfies Catalog;

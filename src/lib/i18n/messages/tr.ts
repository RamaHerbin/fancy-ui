// Turkish (tr). Register: siz in sentences; bare imperative on buttons and short action labels.
import type { Catalog } from "./en.js";

export default {
	// Sidebar / nav
	"nav.gettingStarted": "Başlarken",
	"nav.components": "Bileşenler",
	"nav.home": "Ana sayfa",
	"nav.docsSuffix": "belgeler",
	"a11y.closeSidebar": "Kenar çubuğunu kapat",
	"a11y.toggleSidebar": "Kenar çubuğunu aç/kapat",
	"a11y.breadcrumb": "Sayfa yolu",

	// Getting-started page titles
	"page.introduction": "Giriş",
	"page.installation": "Kurulum",
	"page.theming": "Temalandırma",
	"page.themeGenerator": "Tema Oluşturucu",
	"page.changelog": "Değişiklik Günlüğü",

	// Header
	"header.search": "Ara...",
	"a11y.github": "GitHub",
	"a11y.changeTheme": "Temayı değiştir",
	"a11y.changeLanguage": "Dili değiştir",
	"theme.heading": "Tema",
	"theme.system": "Sistem",
	"language.heading": "Dil",

	// Command search
	"search.placeholder": "Bileşenlerde ve sayfalarda ara...",
	"search.noResults": "Sonuç bulunamadı",
	"search.esc": "ESC",
	"search.tryInstead": "Bunun yerine şunlardan birini deneyin:",
	"jobs.heading": "İhtiyacınıza göre göz atın",
	"jobs.feedback": "Geri bildirim ver",
	"jobs.input": "Form girdisi topla",
	"jobs.attention": "Dikkati yönlendir",
	"jobs.navigate": "Gezin",
	"jobs.progress": "İlerlemeyi göster",
	"jobs.surprise": "Efektlerle şaşırt",

	// Component page
	"comp.preview": "Önizleme",
	"comp.code": "Kod",
	"comp.installation": "Kurulum",
	"install.framework": "Framework",
	"install.sourceOnly": "Henüz npm'de değil — bu uyarlama şimdilik depoda yer alıyor.",
	"install.unavailable": "Bu bileşenin bu framework için henüz bir uyarlaması yok.",
	"install.copySource": "Kaynak kodunu kopyala",
	"install.copySourceNote":
		"Bileşenin kaynak kodunu projenize kopyalar; kod artık sizindir.",
	"comp.usage": "Kullanım",
	"comp.props": "Özellikler",
	"comp.slots": "Slotlar",
	"comp.links": "Bağlantılar",
	"comp.sourceCode": "Kaynak Kodu",
	"comp.inspiredBy": "İlham kaynağı",
	"comp.examples": "Örnekler",
	"comp.related": "İlgili bileşenler",
	"comp.previous": "Önceki",
	"comp.next": "Sonraki",
	"status.stable": "Kararlı",

	// Tables
	"table.prop": "Özellik",
	"table.type": "Tür",
	"table.default": "Varsayılan",
	"table.description": "Açıklama",
	"table.slot": "Slot",
	"table.event": "Olay",
	"table.payload": "Veri",
	"table.portName": "{framework} adı",
	"table.portNameUnknown":
		"Adlandırma kurallarıyla türetilemiyor; Svelte API'sinden farklar listesine bakın.",
	"comp.events": "Olaylar",
	"comp.copyMarkdown": "Markdown olarak kopyala",

	// Copy buttons
	"action.copy": "Kopyala",
	"action.copied": "Kopyalandı!",

	// Table of contents
	"toc.onThisPage": "Bu sayfada",

	// Components gallery
	"gallery.title": "Bileşenler",
	"gallery.intro":
		"Bileşenler Svelte 5, React ve Vue için sunulur; Tailwind CSS v4 ile biçimlendirilmiş ve TypeScript ile tiplendirilmiştir. Her sayfada canlı bir önizleme ve kopyalayıp yapıştırabileceğiniz Svelte örnekleri bulunur; mevcut olduğunda React ve Vue kullanımı da gösterilir. Paketi bir kez kurun, kod sizin olsun.",
	"gallery.filterPlaceholder": "Bileşenleri filtrele...",
	"gallery.all": "Tümü",
	"gallery.noMatch": "Aramanızla eşleşen bileşen yok.",
	"gallery.meta":
		"{components} bileşen · {categories} kategori · Svelte 5 · React · Vue · TypeScript",
	"gallery.results.one": "{count} sonuç",
	"gallery.results.other": "{count} sonuç",
	"gallery.clearFilters": "Filtreleri temizle",
	"gallery.clearSearch": "Aramayı temizle",
	"gallery.searchHint": "Aramak için / tuşuna basın",
	"gallery.groupLabel": "Bileşen grubu",
	"gallery.categoryLabel": "Kategoriler",
	"gallery.desc.buttons": "Üzerine gelince ve basınca zengin hareket sunan etkileşimli düğmeler",
	"gallery.desc.cards": "İşaretçiye tepki veren kartlar ve kapsayıcılar",
	"gallery.desc.backgrounds": "Animasyonlu ve dekoratif arka planlar",
	"gallery.desc.text": "Metin animasyonları ve tipografik efektler",
	"gallery.desc.layout": "Düzen için temel öğeler ve yapısal bileşenler",
	"gallery.desc.feedback": "İpuçları, bildirimler, yükleyiciler ve diğer geri bildirimler",
	"gallery.desc.data-display": "Listeler, zaman çizelgeleri ve veri koleksiyonları",
	"gallery.desc.navigation": "Menüler, sekmeler, bağlantılar ve yön bulma",
	"gallery.desc.media": "Görsel, video ve medya gösterimi",
	"gallery.desc.effects": "Görsel efektler ve dekoratif hareket",
	"gallery.desc.ai-chat": "Mesajlar, yazma alanları, konuşma dizileri ve akan metin",
	"gallery.desc.ai-agents": "Akıl yürütme, araç kullanımı, planlar ve insan onayı isteyen kartlar",
	"gallery.desc.actions": "Düğmeler, anahtarlar ve diğer temel eylem öğeleri",
	"gallery.desc.forms": "Kullanıcı girdisi almak için giriş alanları ve temel öğeler",
	"gallery.desc.overlays": "İletişim kutuları, açılır pencereler, menüler ve paneller",
	"gallery.desc.display": "Rozetler, avatarlar ve durum gösterimi",
	"gallery.subtitle":
		"Svelte 5, React ve Vue için {count} şık animasyonlu bileşen. Göz atın, arayın ve ihtiyacınız olanı bulun.",

	// Theme-generator page
	"tg.metaDescription":
		"FancyUI'ın OKLCh tasarım belirteçlerini canlı olarak ayarlayın ve CSS'i uygulamanıza kopyalayın.",
	"tg.intro":
		"FancyUI'ın tasarım belirteçlerini ayarlayın ve bileşenlerin anında nasıl tepki verdiğini izleyin. Sonuçtan memnun kaldığınızda oluşturulan CSS'i uygulamanızın stil dosyasına (örneğin src/app.css) kopyalayın. Renkler OKLCh renk uzayında tanımlanır; gökkuşağı paleti ise HSL kullanır. Belirteçlerin tam başvurusu için <link>Temalandırma</link> sayfasına bakın.",
	"tg.presets": "Hazır ayarlar",
	"tg.base": "Temel",
	"tg.light": "Açık",
	"tg.dark": "Koyu",
	"tg.primary": "Birincil",
	"tg.accent": "Vurgu",
	"tg.lightness": "Açıklık",
	"tg.chroma": "Kroma",
	"tg.hue": "Ton",
	"tg.radius": "Yarıçap",
	"tg.motion": "Hareket",
	"tg.rainbowPalette": "Gökkuşağı paleti",
	"tg.livePreview": "Canlı önizleme",
	"tg.cardSurface": "Kart yüzeyi",
	"tg.cardSurfaceDesc": "--card, --foreground, --border ve --radius kullanır.",
	"tg.primaryAction": "Birincil eylem",
	"tg.accentBadge": "Vurgu rozeti",
	"tg.beamDesc": "Işın renkleri {primary} → {accent} geçişini izler.",
	"tg.generatedCss": "Oluşturulan CSS",
	"tg.copyCss": "CSS'i kopyala",
	"tg.copied": "Kopyalandı",

	// Category labels (docs-only overlay; registry stays English)
	"category.buttons": "Düğmeler",
	"category.cards": "Kartlar",
	"category.backgrounds": "Arka Planlar",
	"category.text": "Metin ve Tipografi",
	"category.layout": "Düzen",
	"category.feedback": "Geri Bildirim",
	"category.data-display": "Veri Görüntüleme",
	"category.navigation": "Gezinme",
	"category.media": "Medya",
	"category.effects": "Efektler",
	"category.ai-chat": "Yapay Zekâ Sohbeti",
	"category.ai-agents": "Yapay Zekâ Ajanları",

	// Introduction page
	"intro.title": "Giriş",
	"intro.metaTitle": "Giriş",
	"intro.pill.animation": "Animasyon öncelikli",
	"intro.pill.copyPaste": "Kopyala-yapıştır dostu",
	"intro.pill.tailwind": "Tailwind CSS 4",
	"intro.pill.typescript": "TypeScript",
	"intro.philosophy.heading": "Felsefe",
	"intro.philosophy.card2.title": "Animasyon öncelikli",
	"intro.philosophy.card2.desc":
		"Her bileşen, ek ayar gerektirmeden özenle hazırlanmış animasyonlarla gelir.",
	"intro.philosophy.card3.title": "Kopyala-yapıştır dostu",
	"intro.philosophy.card3.desc": "Paket olarak kullanın ya da kaynak kodunu doğrudan kopyalayın.",
	"intro.philosophy.card4.title": "Tailwind CSS 4",
	"intro.philosophy.card4.desc": "Yardımcı sınıflar ve CSS değişkenleriyle biçimlendirilmiştir.",
	"intro.philosophy.card5.title": "TypeScript",
	"intro.philosophy.card5.desc": "Dışa aktarılan özellik arayüzleriyle tam tür güvenliği.",
	"intro.quickStart.heading": "Hızlı Başlangıç",
	"intro.quickStart.step1.title": "Kur",
	"intro.quickStart.step1.desc": "FancyUI'ı projenize ekleyin.",
	"intro.quickStart.step2.title": "İçe aktar",
	"intro.quickStart.step3.title": "Kullan",
	"intro.whatsIncluded.heading": "Neler Dahil",
	"intro.whatsIncluded.body.one": "{categories} kategoride {count} bileşen:",
	"intro.whatsIncluded.body.other": "{categories} kategoride {count} bileşen:",
	"intro.category.buttons": "Düğmeler",
	"intro.category.cards": "Kartlar",
	"intro.category.effects": "Efektler",
	"intro.stats.buttons": "Rainbow, Ripple, Shimmer ve benzerleri. Tıklanmak için can atan düğmeler.",
	"intro.stats.cards":
		"Karuseller, bento ızgaralar, 3D eğimler. İçeriği kimseyi sıkmadan sunmanın yolları.",
	"intro.stats.effects": "İmleçler, izler, animasyonlu metinler. Farkı yaratan küçük dokunuşlar.",
	"sidebar.starTitle": "GitHub'da yıldız verin",
	"sidebar.starBody": "FancyUI'ı beğendiyseniz ona bir yıldız verin!",
	"rail.nextPage": "Sonraki sayfa",
	"intro.nextSteps.heading": "Sonraki Adımlar",
	"intro.nextSteps.installation": "Kurulum",
	"intro.nextSteps.theming": "Temalandırma",
	"intro.nextSteps.components": "Bileşenlere Göz At",
	"intro.cta.title": "FancyUI ile yeni mi tanışıyorsunuz?",
	"intro.cta.body":
		"Renkleri özelleştirmek ve bileşenlerin anında nasıl tepki verdiğini görmek için <b>Tema Oluşturucu</b> sayfasına göz atın.",
	"intro.cta.button": "Tema Oluşturucu'yu dene",

	// Core components workspace (sidebar groups, categories, status)
	"group.core": "Core",
	"group.fancy": "Fancy",
	"category.actions": "Eylemler",
	"category.forms": "Formlar",
	"category.overlays": "Katmanlar",
	"category.display": "Görüntüleme",
	"status.inProgress": "Geliştiriliyor",

	// Installation page
	"install.metaTitle": "Kurulum",
	"install.title": "Kurulum",
	"install.lead":
		"FancyUI'ı üç adımda bir SvelteKit projesine ekleyin: paketi kurun, stil dosyasını içe aktarın, bir bileşen render edin.",
	"install.pill.svelte": "Svelte 5",
	"install.pill.tailwind": "Tailwind CSS 4",
	"install.pill.node": "Node.js 20.19+",
	"install.pill.typescript": "TypeScript",
	"install.prerequisites.heading": "Ön Koşullar",
	"install.prerequisites.body":
		"FancyUI güncel araç zincirlerini hedefler. Kurulumdan önce şu üç şeyi kontrol edin.",
	"install.prerequisites.card1.title": "SvelteKit",
	"install.prerequisites.card1.version": "Svelte 5",
	"install.prerequisites.card1.desc":
		"Bileşenler runes ile yazılmıştır, bu nedenle Svelte 5 gereklidir. Svelte 4 projeleri bunları derleyemez.",
	"install.prerequisites.card2.title": "Tailwind CSS",
	"install.prerequisites.card2.version": "v4",
	"install.prerequisites.card2.desc":
		"Biçimlendirme, Tailwind v4 yardımcı sınıflarına ve CSS değişkenlerine dayanır.",
	"install.prerequisites.card3.title": "Node.js",
	"install.prerequisites.card3.version": "20.19+",
	"install.prerequisites.card3.desc":
		"FancyUI'ın test edildiği güncel derleme araçları bunu gerektirir.",
	"install.steps.heading": "Kurulum",
	"install.steps.body":
		"Paket yöneticinizi seçin, stil dosyasını bağlayın, ardından ilk bileşeninizi render edin.",
	"install.step1.title": "Paketi kurun",
	"install.step1.desc":
		"Tüm bileşenler için tek paket. Paket yöneticinize uygun komutu kopyalamak için sekmeler arasında geçiş yapın.",
	"install.step2.title": "Stil dosyasını içe aktarın",
	"install.step2.desc": "FancyUI stil dosyasını Tailwind içe aktarımınızın hemen ardından ekleyin.",
	"install.step2.caption": "Genel stil dosyanızda, genellikle src/app.css.",
	"install.step3.title": "Bir bileşen render edin",
	"install.step3.desc": "Paket kökünden içe aktarın ve işaretlemenize yerleştirin.",
	"install.tailwind.heading": "Tailwind CSS kurulumu",
	"install.tailwind.body":
		"FancyUI, JavaScript yapılandırma dosyası yerine CSS içinde yapılandırılan Tailwind CSS v4 üzerine kuruludur. Tailwind projenizde zaten çalışıyorsa yapılandırmanız gereken başka bir şey yoktur.",
	"install.tailwind.order":
		"İçe aktarma sırası önemlidir: önce Tailwind, sonra FancyUI. FancyUI içe aktarımını kendi @custom-variant dark tanımınızdan önce yerleştirin; aksi hâlde FancyUI'ınki sizinkinin yerini alır.",
	"install.tailwind.note":
		"Giriş dosyası varsayılan renk belirteçlerini (background, primary, border ve diğerleri) ve bir dark varyantı sağlar. Kendi :root ve .dark bloklarınız bunları geçersiz kılar: CSS değişkenlerini yeniden tanımlayın, sizin değerleriniz geçerli olur.",
	"install.usage.heading": "Kullanım",
	"install.usage.body":
		"Her bileşen paket kökünden adlandırılmış olarak dışa aktarılır; bu yüzden ezberlemeniz gereken bileşene özel içe aktarma yolları yoktur.",
	"install.usage.note":
		"Her bileşenin sayfası özelliklerini, canlı örneklerini ve erişilebilirlik notlarını listeler.",
	"install.typescript.heading": "TypeScript",
	"install.typescript.body":
		"Özellik türleri her bileşenin yanında dışa aktarılır; böylece sarmalayıcılarınızı ve paylaşılan ön ayarlarınızı tiplendirebilirsiniz.",
	"install.typescript.note": "Türler paketin içinde gelir. Ayrıca kurmanız gereken bir tür paketi yoktur.",
	"install.peerDeps.heading": "Eş bağımlılıklar",
	"install.peerDeps.body": "FancyUI, bunların projenizde zaten bulunmasını bekler:",
	"install.peerDeps.colPackage": "Paket",
	"install.peerDeps.colVersion": "Sürüm",
	"install.peerDeps.bundled":
		"Birkaç bileşen ek çalışma zamanı kitaplıklarına ihtiyaç duyar. Bunlar paketle birlikte gelir, bu yüzden kurmanız gereken başka bir şey yoktur:",
	"install.peerDeps.bundledNote": "Yalnızca onları kullanan bileşenler tarafından yüklenirler.",
	"install.nextSteps.heading": "Sonraki Adımlar",
	"install.nextSteps.components.title": "Bileşenlere Göz At",
	"install.nextSteps.components.desc":
		"Canlı önizlemeler, özellikler ve kopyala-yapıştır örnekleriyle {count} bileşen.",
	"install.nextSteps.theming.title": "Temalandırma",
	"install.nextSteps.theming.desc":
		"Tasarım belirteçlerini geçersiz kılarak her bileşeni açık ve koyu modda markanıza uydurun.",

	// Theming page
	"theming.metaTitle": "Temalandırma",
	"theming.title": "Temalandırma",
	"theming.lead":
		"Her FancyUI bileşeni renklerini, köşe yarıçaplarını ve zamanlamalarını OKLCh renk uzayındaki CSS değişkenlerinden okur — bir belirteci geçersiz kılın, tüm kitaplık ona uyar.",
	"theming.pill.oklch": "OKLCh renk uzayı",
	"theming.pill.shadcn": "Standart belirteç adları",
	"theming.pill.dark": "Koyu mod",
	"theming.pill.tokens": "Tasarım belirteçleri",
	"theming.generator.body":
		"Görsel olarak ayarlamayı mı tercih edersiniz? Tema Oluşturucu bu belirteçleri canlı kaydırıcılarla ayarlar ve CSS'i size hazır verir.",
	"theming.generator.cta": "Tema Oluşturucu'yu aç",
	"theming.cssSetup.heading": "CSS kurulumu",
	"theming.cssSetup.body":
		"FancyUI stil dosyasını uygulamanızın genel CSS'ine, genellikle src/app.css dosyasına aktarın:",
	"theming.colors.heading": "Renk sistemi",
	"theming.colors.body":
		"Algısal olarak tekdüze gradyanlar için tüm renkler OKLCh renk uzayını kullanır:",
	"theming.colors.note":
		"Belirteç adları yaygın anlamsal adlandırma kuralını izler (background, foreground, primary, …); bu yüzden aynı değişken adlarını kullanan mevcut bir tema değiştirilmeden çalışır.",
	"theming.dark.heading": "Koyu mod",
	"theming.dark.body":
		"Koyu mod varsayılan olarak işletim sistemi tercihini izler. Koyu modu zorlamak için .dark sınıfını <html> öğesine veya herhangi bir üst öğeye, açık modu zorlamak için .light sınıfını ekleyin; dark: yardımcı sınıfları ve tüm belirteçler buna uyar. Koyu değerleri özelleştirmek için bunları .dark altında geçersiz kılın:",
	"theming.motion.heading": "Animasyon belirteçleri",
	"theming.motion.body": "Animasyon zamanlamasını genel olarak denetleyin:",
	"theming.easing.heading": "Easing fonksiyonları",
	"theming.easing.body":
		"Easing eğrileri de birer belirteçtir; tüm bileşen geçişleri bunları ortak kullanır:",
	"theming.rainbow.heading": "Gökkuşağı gradyanları",
	"theming.rainbow.body":
		"RainbowButton, GradientButton ve diğer gradyan efektleri tarafından kullanılır:",
	"theming.customizing.heading": "Özelleştirme",
	"theming.customizing.body":
		"Görünümü değiştirmek için kendi CSS'inizde herhangi bir belirteci geçersiz kılın:",
	"theming.customizing.note":
		"Belirteçler kademeli olarak devralınır: onları :root içinde genel olarak geçersiz kılın ya da tek bir bölümü temalandırmak için bir sarmalayıcı öğeyle sınırlayın.",
	"theming.nextSteps.heading": "Sonraki Adımlar",
	"theming.nextSteps.generator.title": "Tema Oluşturucu",
	"theming.nextSteps.generator.desc":
		"Her belirteci canlı kaydırıcılarla ayarlayın ve hazır CSS'i kopyalayın.",
	"theming.nextSteps.components.title": "Bileşenlere Göz At",
	"theming.nextSteps.components.desc":
		"Belirteçlerin tüm bileşen galerisinde nasıl çalıştığını görün.",

	// Changelog page
	"changelog.metaTitle": "Değişiklik Günlüğü",
	"changelog.title": "Değişiklik Günlüğü",
	"changelog.lead": "FancyUI'ın tüm sürümleri ve her birinde nelerin değiştiği, en yeniden en eskiye.",
	"changelog.latest": "En yeni",
	"changelog.major": "Büyük değişiklikler",
	"changelog.minor": "Küçük değişiklikler",
	"changelog.patch": "Yama değişiklikleri",
	// Docs skins
	"skin.heading": "Görünüm",
	"skin.standard": "Standart",
	"skin.brutal": "Brutal",
	"skin.retroOs": "Retro OS",
	"skin.beta": "Beta",
	"a11y.changeSkin": "Görünümü değiştir",
	"a11y.sound": "Ses",
	"retro.explorer": "Gezgin",
	"retro.start": "Başlat",
	"retro.tagline": "Svelte 5 için animasyonlu bileşenler — kopyala-yapıştır dostu.",
	"comp.snippetSvelteOnly":
		"Bu framework için tam bir örnek henüz yazılmadı; şimdilik yalnızca Svelte sürümünün örneği var.",
	"comp.copyMarkdownSvelte": "Markdown olarak kopyala (Svelte)",
	"comp.markdownSvelteOnly": "Markdown dışa aktarımı yalnızca Svelte sürümünü anlatır.",
	"comp.apiNoticeReact":
		"Bu API başvurusu Svelte adlarını kullanır. React'te class className olur, on* işleyicileri camelCase yazılır (onclick, onClick olur) ve snippet'ler ReactNode türündeki özelliklere ya da render fonksiyonlarına dönüşür.",
	"comp.apiNoticeVue":
		"Bu API başvurusu Svelte adlarını kullanır. Vue'da snippet'ler slotlara, bağlanabilir özellikler ise v-model:name biçimine dönüşür.",
	"comp.apiNoticeLink": "Svelte API'sinden farklar",
	"install.lead.react":
		"FancyUI'ı üç adımda bir React projesine ekleyin: paketi kurun, stil dosyasını içe aktarın, bir bileşen render edin.",
	"install.lead.vue":
		"FancyUI'ı üç adımda bir Vue projesine ekleyin: paketi kurun, stil dosyasını içe aktarın, bir bileşen render edin.",
	"install.pill.react": "React 18+",
	"install.pill.vue": "Vue 3.5+",
	"install.prerequisites.card1.title.react": "React",
	"install.prerequisites.card1.version.react": "18 / 19",
	"install.prerequisites.card1.desc.react":
		"React 18 ve 19'u destekler. Bileşenler istemci modülleri olarak sunulur, bu yüzden Server Components onları doğrudan içe aktarabilir.",
	"install.prerequisites.card1.title.vue": "Vue",
	"install.prerequisites.card1.version.vue": "3.5+",
	"install.prerequisites.card1.desc.vue":
		"Bileşenler Vue 3.5 tek dosyalı bileşenleridir, bu nedenle Vue 3.5.2 veya üzeri gerekir.",

	// Framework-neutral Introduction and Installation copy
	"intro.pill.frameworks": "Svelte 5, React ve Vue",
	"intro.philosophy.card1.title": "Svelte, React ve Vue",
	"intro.philosophy.card1.desc":
		"Her framework için yerel olarak yazılmıştır: Svelte'te runes, React'te hooks, Vue'da Composition API.",
	"intro.quickStart.step3.desc": "Bileşenlerinize yerleştirin.",
	"install.peerDeps.optional": "isteğe bağlı",

	// Chrome, contribution, status, recipes, errors, SEO
	"a11y.skipToContent": "İçeriğe geç",
	"a11y.docsBreadcrumb": "Belgelerde sayfa yolu",
	"a11y.prevNext": "Önceki ve sonraki sayfalar",
	"a11y.search": "Ara",
	"search.a11y.close": "Aramayı kapat",
	"nav.backToSite": "FancyUI ana sayfasına dön",
	"nav.recipes": "Tarifler",
	"footer.contribute": "Katkıda bulun",
	"footer.issues": "Issues",
	"footer.discussions": "Tartışmalar",
	"footer.security": "Güvenlik",
	"footer.conduct": "Davranış kuralları",
	"footer.changelog": "Değişiklik günlüğü",
	"footer.versions": "Sürümler",
	"footer.install": "Kurulum",
	"footer.license": "MIT lisansı",
	"comp.editPage": "Bu sayfayı düzenle",
	"comp.reportIssue": "Sorun bildir",
	"comp.issueTitle": "[docs] {name}",
	"intro.lead":
		"<grad>{count}</grad> animasyonlu ve etkileşimli arayüz bileşeninden oluşan bir koleksiyondur; Svelte 5, React ve Vue için aynı tasarım belirteçleri üzerine kurulmuştur.",
	"intro.importHint":
		"İhtiyacınız olan bileşenleri içe aktarın. İçe aktarma yolu kullandığınız framework'e göre değişir.",
	"install.kitOptional":
		"SvelteKit isteğe bağlıdır: FancyUI, Vite ile derlenen her Svelte 5 projesinde çalışır.",
	"theming.cssPerFramework":
		"Framework'ünüze uygun stil dosyasını içe aktarın: her paket kendi stil dosyasıyla gelir.",
	"status.planned": "Planlı",
	"status.deprecated": "Kullanım dışı",
	"comp.sinceVersion": "v{version} sürümünde yeni",
	"comp.deprecatedNotice":
		"Bu bileşen kullanım dışıdır ve gelecekteki bir sürümde kaldırılabilir.",
	"comp.inspiredByNoLink": "İlham kaynağı: {name}",
	"recipes.title": "Tarifler",
	"recipes.lead":
		"Birkaç bileşeni bir araya getirerek eksiksiz bir arayüz oluşturan adım adım kompozisyonlar.",
	"recipes.components": "{count} bileşen",
	"error.notFoundTitle": "Sayfa bulunamadı",
	"error.genericTitle": "Bir şeyler ters gitti",
	"error.notFoundBody": "Aradığınız sayfa mevcut değil ya da taşınmış.",
	"error.genericBody": "Beklenmeyen bir hata oluştu. Yeniden deneyin ya da belgelere dönün.",
	"error.unauthorizedTitle": "Oturum açmanız gerekiyor",
	"error.unauthorizedBody": "Bu sayfayı kullanmak için oturum açmış olmanız gerekir.",
	"error.home": "Ana sayfaya dön",
	"error.browse": "Bileşenlere göz at",
	"error.search": "Belgelerde ara",
	"error.report": "Bozuk bağlantıyı bildir",
	"comp.previewFailed": "Bu önizleme yüklenemedi.",
	"demo.noPreview": "Bu bileşen için henüz önizleme yok.",
	"demo.notFound": "Bileşen bulunamadı.",
	"recipes.steps": "Adımlar",
	"recipes.pitfalls": "Sık yapılan hatalar",
	"recipes.componentsUsed": "Kullanılan bileşenler",
	"seo.installation":
		"FancyUI'ı Svelte 5, React veya Vue için kurun: paketi ekleyin, stil dosyasını içe aktarın ve ilk bileşeninizi render edin.",
	"seo.theming":
		"FancyUI'ı tasarım belirteçleriyle özelleştirin: OKLCh renkler, köşe yarıçapı, hareket ve koyu mod; Svelte 5, React ve Vue için.",
	"seo.themeGenerator":
		"FancyUI'ın OKLCh tasarım belirteçlerini canlı olarak ayarlayın ve oluşturulan CSS'i uygulamanıza kopyalayın.",
	"seo.changelog": "Svelte 5, React ve Vue için FancyUI paketlerinin sürüm notları.",
} satisfies Catalog;

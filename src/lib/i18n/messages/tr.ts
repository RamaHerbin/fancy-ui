// Turkish (tr) — machine-translated draft. TODO: native review.
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
	"page.theming": "Tema",
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
	"jobs.input": "Girdi topla",
	"jobs.attention": "Dikkati yönlendir",
	"jobs.navigate": "Gezin",
	"jobs.progress": "İlerlemeyi göster",
	"jobs.surprise": "Şaşırt",

	// Component page
	"comp.preview": "Önizleme",
	"comp.code": "Kod",
	"comp.installation": "Kurulum",
	"install.framework": "Framework",
	"install.sourceOnly": "Henüz npm'de değil — bu sürüm depoda bulunuyor.",
	"install.unavailable": "Bu framework için bu bileşenin henüz bir sürümü yok.",
	"install.copySource": "Kaynağı kopyala",
	"install.copySourceNote": "Bileşen kaynağını projenize kopyalar; kod sizin olur.",
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
		"Adlandırma kurallarından çıkarılamıyor; Svelte API’sinden farklara bakın.",
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
		"Bileşenler Svelte 5, React ve Vue için sunulur, Tailwind CSS v4 ile stillendirilmiştir ve TypeScript ile tiplendirilmiştir. Her sayfada canlı önizleme ve kopyala-yapıştır Svelte örnekleri bulunur; varsa React ve Vue kullanımı da yer alır. Paketi bir kez kurun, kod sizin olsun.",
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
	"gallery.desc.buttons": "Zengin üzerine gelme ve basma hareketleri olan etkileşimli düğmeler",
	"gallery.desc.cards": "İşaretçiye tepki veren kartlar ve kapsayıcılar",
	"gallery.desc.backgrounds": "Animasyonlu ve dekoratif arka planlar",
	"gallery.desc.text": "Metin animasyonları ve tipografik efektler",
	"gallery.desc.layout": "Yerleşim ilkelleri ve yapısal bileşenler",
	"gallery.desc.feedback": "İpuçları, toast bildirimleri, yükleyiciler ve diğer geri bildirimler",
	"gallery.desc.data-display": "Listeler, zaman çizelgeleri ve veri koleksiyonları",
	"gallery.desc.navigation": "Menüler, sekmeler, bağlantılar ve yön bulma",
	"gallery.desc.media": "Görsel, video ve medya gösterimi",
	"gallery.desc.effects": "Görsel efektler ve dekoratif hareket",
	"gallery.desc.ai-chat": "Mesajlar, yazma alanları, konuşma dizileri ve akan metin",
	"gallery.desc.ai-agents": "Muhakeme, araç kullanımı, planlar ve insan onaylı kartlar",
	"gallery.desc.actions": "Düğmeler, anahtarlar ve diğer eylem ilkelleri",
	"gallery.desc.forms": "Kullanıcı girdisini almak için alanlar ve ilkeller",
	"gallery.desc.overlays": "İletişim kutuları, açılır pencereler, menüler ve paneller",
	"gallery.desc.display": "Rozetler, avatarlar ve durum gösterimi",
	"gallery.subtitle":
		"Svelte 5, React, Vue için güzelce animasyonlu {count} bileşen. Göz atın, arayın ve ihtiyacınız olanı bulun.",

	// Theme-generator page
	"tg.metaDescription":
		"FancyUI'nin OKLCh tasarım belirteçlerini canlı olarak ayarlayın ve CSS'yi uygulamanıza kopyalayın.",
	"tg.intro":
		"FancyUI'nin tasarım belirteçlerini ayarlayın ve bileşenlerin gerçek zamanlı olarak tepki vermesini izleyin. Doğru göründüğünde, oluşturulan CSS'yi uygulamanızın stil sayfasına (örneğin src/app.css) kopyalayın. Renkler OKLCh renk uzayını kullanır; gökkuşağı paleti HSL kullanır. Tüm belirteç referansı için bkz. <link>Tema</link>.",
	"tg.presets": "Hazır Ayarlar",
	"tg.base": "Temel",
	"tg.light": "Aydınlık",
	"tg.dark": "Karanlık",
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
	"tg.beamDesc": "Işın renkleri {primary} → {accent} sırasını izler.",
	"tg.generatedCss": "Oluşturulan CSS",
	"tg.copyCss": "CSS'yi Kopyala",
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

	// Introduction (redesigned page)
	"intro.title": "Giriş",
	"intro.metaTitle": "Giriş",
	"intro.pill.svelte": "Svelte 5 Doğal",
	"intro.pill.animation": "Önce Animasyon",
	"intro.pill.copyPaste": "Kopyala-Yapıştır Dostu",
	"intro.pill.tailwind": "Tailwind CSS 4",
	"intro.pill.typescript": "TypeScript",
	"intro.philosophy.heading": "Felsefe",
	"intro.philosophy.card1.title": "Svelte 5 doğal",
	"intro.philosophy.card1.desc": "Runes ile geliştirilmiştir. Eski API yok.",
	"intro.philosophy.card2.title": "Önce animasyon",
	"intro.philosophy.card2.desc":
		"Her bileşen, kutudan çıktığı haliyle özenle hazırlanmış animasyonlarla birlikte gelir.",
	"intro.philosophy.card3.title": "Kopyala-yapıştır dostu",
	"intro.philosophy.card3.desc": "Paket olarak kullanın veya kaynak kodu doğrudan kopyalayın.",
	"intro.philosophy.card4.title": "Tailwind CSS 4",
	"intro.philosophy.card4.desc":
		"Yardımcı sınıflar ve CSS özel özellikleriyle biçimlendirilmiştir.",
	"intro.philosophy.card5.title": "TypeScript",
	"intro.philosophy.card5.desc": "Dışa aktarılan özellik arayüzleriyle tam tür güvenliği.",
	"intro.quickStart.heading": "Hızlı Başlangıç",
	"intro.quickStart.step1.title": "Kur",
	"intro.quickStart.step1.desc": "FancyUI'yi projenize ekleyin.",
	"intro.quickStart.step2.title": "İçe Aktar",
	"intro.quickStart.step2.desc": "İhtiyacınız olan bileşenleri içe aktarın.",
	"intro.quickStart.step3.title": "Kullan",
	"intro.quickStart.step3.desc": "Svelte bileşenlerinize ekleyin.",
	"intro.whatsIncluded.heading": "Neler İçerir",
	"intro.whatsIncluded.body.one": "{categories} kategoride {count} bileşen:",
	"intro.whatsIncluded.body.other": "{categories} kategoride {count} bileşen:",
	"intro.category.buttons": "Düğmeler",
	"intro.category.cards": "Kartlar",
	"intro.category.effects": "Efektler",
	"intro.stats.buttons": "Rainbow, Ripple, Shimmer ve arkadaşları. Tıklanmak isteyen düğmeler.",
	"intro.stats.cards":
		"Karuseller, bento ızgaralar, 3D efektler. İçeriği sıkmadan sunmanın yolları.",
	"intro.stats.effects": "İmleçler, izler, animasyonlu metinler. Farkı yaratan küçük dokunuşlar.",
	"sidebar.starTitle": "GitHub'da yıldızla",
	"sidebar.starBody": "FancyUI'ı beğendiyseniz bir yıldız bırakın!",
	"rail.nextPage": "Sonraki sayfa",
	"intro.nextSteps.heading": "Sonraki Adımlar",
	"intro.nextSteps.installation": "Kurulum",
	"intro.nextSteps.theming": "Tema",
	"intro.nextSteps.components": "Bileşenlere Göz At",
	"intro.cta.title": "FancyUI'de yeni misiniz?",
	"intro.cta.body":
		"Renkleri özelleştirmek ve bileşenlerin gerçek zamanlı nasıl tepki verdiğini görmek için <b>Tema Oluşturucu</b>'yu inceleyin.",
	"intro.cta.button": "Tema Oluşturucu'yu Dene",

	// Core components workspace (sidebar groups, categories, status)
	"group.core": "Core",
	"group.fancy": "Fancy",
	"category.actions": "Eylemler",
	"category.forms": "Formlar",
	"category.overlays": "Katmanlar",
	"category.display": "Görüntüleme",
	"status.inProgress": "Geliştiriliyor",

	// Installation (redesigned page)
	"install.metaTitle": "Kurulum",
	"install.title": "Kurulum",
	"install.lead":
		"FancyUI'yi üç adımda bir SvelteKit projesine ekleyin: paketi kurun, stil dosyasını içe aktarın, bir bileşen render edin.",
	"install.pill.svelte": "Svelte 5",
	"install.pill.tailwind": "Tailwind CSS 4",
	"install.pill.node": "Node.js 20.19+",
	"install.pill.typescript": "TypeScript",
	"install.prerequisites.heading": "Ön Koşullar",
	"install.prerequisites.body":
		"FancyUI güncel araç zincirlerini hedefler. Kurmadan önce bu üç şeyi kontrol edin.",
	"install.prerequisites.card1.title": "SvelteKit",
	"install.prerequisites.card1.version": "Svelte 5",
	"install.prerequisites.card1.desc":
		"Bileşenler runes ile yazılmıştır, bu nedenle Svelte 5 gereklidir. Svelte 4 projeleri bunları derleyemez.",
	"install.prerequisites.card2.title": "Tailwind CSS",
	"install.prerequisites.card2.version": "v4",
	"install.prerequisites.card2.desc":
		"Biçimlendirme, Tailwind v4 yardımcı sınıflarına ve CSS özel özelliklerine dayanır.",
	"install.prerequisites.card3.title": "Node.js",
	"install.prerequisites.card3.version": "20.19+",
	"install.prerequisites.card3.desc":
		"FancyUI'nin test edildiği güncel derleme araçları tarafından gereklidir.",
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
	"install.step3.desc": "Paket kökünden içe aktarın ve doğrudan işaretlemenize yerleştirin.",
	"install.tailwind.heading": "Tailwind CSS kurulumu",
	"install.tailwind.body":
		"FancyUI, JavaScript yapılandırma dosyası yerine CSS içinde yapılandırılan Tailwind CSS v4 üzerine inşa edilmiştir. Tailwind projenizde zaten çalışıyorsa yapılandırılacak başka bir şey yoktur.",
	"install.tailwind.order":
		"İçe aktarma sırası önemlidir: önce Tailwind, sonra FancyUI. FancyUI içe aktarmasını kendi @custom-variant dark tanımınızdan önce yerleştirin; aksi halde FancyUI'ınki sizinkinin yerini alır.",
	"install.tailwind.note":
		"Giriş dosyası varsayılan renk belirteçlerini (background, primary, border ve diğerleri) ve bir koyu varyant sağlar. Kendi :root ve .dark bloklarınız bunları geçersiz kılar: CSS değişkenlerini yeniden tanımlayın, sizin değerleriniz geçerli olur.",
	"install.usage.heading": "Kullanım",
	"install.usage.body":
		"Her bileşen paket kökünün adlandırılmış bir dışa aktarımıdır, bu yüzden ezberlenecek bileşen başına içe aktarma yolu yoktur.",
	"install.usage.note":
		"Her bileşenin sayfası özelliklerini, canlı örneklerini ve erişilebilirlik notlarını listeler.",
	"install.typescript.heading": "TypeScript",
	"install.typescript.body":
		"Özellik türleri her bileşenin yanında dışa aktarılır, böylece sarmalayıcıları ve paylaşılan ön ayarları türleyebilirsiniz.",
	"install.typescript.note": "Türler paketin içinde gelir. Kurulacak ayrı bir tür paketi yoktur.",
	"install.peerDeps.heading": "Eş bağımlılıklar",
	"install.peerDeps.body": "FancyUI, bunların projenizde zaten var olmasını bekler:",
	"install.peerDeps.colPackage": "Paket",
	"install.peerDeps.colVersion": "Sürüm",
	"install.peerDeps.bundled":
		"Birkaç bileşen ek çalışma zamanı kitaplıklarına ihtiyaç duyar. Bunlar paketle birlikte gelir, bu yüzden kurulacak başka bir şey yoktur:",
	"install.peerDeps.bundledNote": "Yalnızca onları kullanan bileşenler tarafından dahil edilirler.",
	"install.nextSteps.heading": "Sonraki Adımlar",
	"install.nextSteps.components.title": "Bileşenlere Göz At",
	"install.nextSteps.components.desc":
		"Canlı önizlemeler, özellikler ve kopyala-yapıştır örnekleriyle {count} bileşen.",
	"install.nextSteps.theming.title": "Tema",
	"install.nextSteps.theming.desc":
		"Her bileşenin açık ve koyu modda markanızla eşleşmesi için tasarım belirteçlerini geçersiz kılın.",

	// Theming page
	"theming.metaTitle": "Tema",
	"theming.title": "Tema",
	"theming.lead":
		"Her FancyUI bileşeni, renklerini, köşe yarıçaplarını ve zamanlamalarını OKLCh renk uzayındaki CSS özel özelliklerinden okur — bir belirteci geçersiz kılın, tüm kitaplık buna uyum sağlar.",
	"theming.pill.oklch": "OKLCh renk uzayı",
	"theming.pill.shadcn": "Standart belirteç adları",
	"theming.pill.dark": "Karanlık mod",
	"theming.pill.tokens": "Tasarım belirteçleri",
	"theming.generator.body":
		"Görsel olarak ayarlamayı mı tercih edersiniz? Tema Oluşturucu bu belirteçleri canlı kaydırıcılarla ayarlar ve CSS'yi size verir.",
	"theming.generator.cta": "Tema Oluşturucu'yu Aç",
	"theming.cssSetup.heading": "CSS kurulumu",
	"theming.cssSetup.body":
		"FancyUI stil dosyasını uygulamanızın genel CSS'sine, genellikle src/app.css'e, içe aktarın:",
	"theming.colors.heading": "Renk sistemi",
	"theming.colors.body":
		"Tüm renkler, algısal olarak tutarlı gradyanlar için OKLCh renk uzayını kullanır:",
	"theming.colors.note":
		"Belirteç adları yaygın olarak kullanılan anlamsal kuralı izler (background, foreground, primary, …), bu nedenle aynı değişken adlarına sahip mevcut bir tema değişiklik yapılmadan kullanılabilir.",
	"theming.dark.heading": "Karanlık mod",
	"theming.dark.body":
		"Karanlık mod varsayılan olarak işletim sistemi tercihini izler. Karanlığı zorlamak için .dark sınıfını <html> üzerine veya herhangi bir üst öğeye, aydınlığı zorlamak için .light sınıfını ekleyin; dark: yardımcıları ve her belirteç buna uyar. Karanlık değerleri özelleştirmek için bunları .dark altında geçersiz kılın:",
	"theming.motion.heading": "Animasyon belirteçleri",
	"theming.motion.body": "Animasyon zamanlamasını genel olarak kontrol edin:",
	"theming.easing.heading": "Easing fonksiyonları",
	"theming.easing.body":
		"Easing eğrileri de birer belirteçtir ve her bileşen geçişinde paylaşılır:",
	"theming.rainbow.heading": "Gökkuşağı gradyanları",
	"theming.rainbow.body":
		"RainbowButton, GradientButton ve diğer gradyan efektleri tarafından kullanılır:",
	"theming.customizing.heading": "Özelleştirme",
	"theming.customizing.body":
		"Görünümü değiştirmek için kendi CSS'inizde herhangi bir belirteci geçersiz kılın:",
	"theming.customizing.note":
		"Belirteçler basamaklanır: onları genel olarak :root içinde geçersiz kılın veya tek bir bölümü temalandırmak için bir sarmalayıcı elemente sınırlayın.",
	"theming.nextSteps.heading": "Sonraki Adımlar",
	"theming.nextSteps.generator.title": "Tema Oluşturucu",
	"theming.nextSteps.generator.desc":
		"Her belirteci canlı kaydırıcılarla ayarlayın ve tamamlanmış CSS'yi kopyalayın.",
	"theming.nextSteps.components.title": "Bileşenlere Göz At",
	"theming.nextSteps.components.desc":
		"Belirteçlerin tüm bileşen galerisinde nasıl çalıştığını görün.",

	// Changelog page
	"changelog.metaTitle": "Değişiklik Günlüğü",
	"changelog.title": "Değişiklik Günlüğü",
	"changelog.lead":
		"FancyUI'nin tüm sürümleri ve her birinde değişenler, en yeniden en eskiye sıralanmıştır.",
	"changelog.latest": "En yeni",
	"changelog.major": "Büyük değişiklikler",
	"changelog.minor": "Küçük değişiklikler",
	"changelog.patch": "Yama değişiklikleri",
	// Cameleon docs skins
	"skin.heading": "Görünüm",
	"skin.standard": "Standart",
	"skin.brutal": "Brutal",
	"skin.retroOs": "Retro OS",
	"skin.beta": "Beta",
	"a11y.changeSkin": "Görünümü değiştir",
	"a11y.sound": "Ses",
	"retro.explorer": "Gezgin",
	"retro.start": "Başlat",
	"retro.tagline": "Svelte 5 için animasyonlu bileşenler — kopyalayıp yapıştırmaya hazır.",
	"comp.snippetSvelteOnly":
		"Bu framework için tam bir örnek henüz yazılmadı; şimdilik yalnızca Svelte sürümünde var.",
	"comp.copyMarkdownSvelte": "Markdown olarak kopyala (Svelte)",
	"comp.markdownSvelteOnly": "Markdown dışa aktarımı yalnızca Svelte sürümünü anlatır.",
	"comp.apiNoticeReact":
		"Bu API başvurusu Svelte adlarını kullanır. React'te class className olur, on* işleyicileri camelCase yazılır (onclick onClick olur) ve snippet'ler ReactNode prop'larına ya da render fonksiyonlarına dönüşür.",
	"comp.apiNoticeVue":
		"Bu API başvurusu Svelte adlarını kullanır. Vue'da snippet'ler slot'a, bağlanabilir prop'lar ise v-model:ad biçimine dönüşür.",
	"comp.apiNoticeLink": "Svelte API'sinden farklar",
	"install.lead.react":
		"FancyUI'yi üç adımda bir React projesine ekleyin: paketi kurun, stil dosyasını içe aktarın, bir bileşen render edin.",
	"install.lead.vue":
		"FancyUI'yi üç adımda bir Vue projesine ekleyin: paketi kurun, stil dosyasını içe aktarın, bir bileşen render edin.",
	"install.pill.react": "React 18+",
	"install.pill.vue": "Vue 3.5+",
	"install.prerequisites.card1.title.react": "React",
	"install.prerequisites.card1.version.react": "18 / 19",
	"install.prerequisites.card1.desc.react":
		"React 18 ve 19'u destekler. Bileşenler istemci modülleri olarak gönderilir, bu yüzden Server Components bunları doğrudan içe aktarabilir.",
	"install.prerequisites.card1.title.vue": "Vue",
	"install.prerequisites.card1.version.vue": "3.5+",
	"install.prerequisites.card1.desc.vue":
		"Bileşenler Vue 3.5 tek dosyalı bileşenleridir, bu nedenle Vue 3.5.2 veya üzeri gerekir.",

	// Docs audit: chrome, contribution, status, recipes, errors, SEO (native translations, pending review)
	"a11y.skipToContent": "İçeriğe geç",
	"a11y.docsBreadcrumb": "Dokümantasyon gezinti yolu",
	"a11y.prevNext": "Önceki ve sonraki sayfa",
	"a11y.search": "Ara",
	"search.a11y.close": "Aramayı kapat",
	"nav.backToSite": "FancyUI ana sayfasına dön",
	"nav.recipes": "Tarifler",
	"toc.show": "İçindekileri göster",
	"footer.docs": "Dokümantasyon",
	"footer.contribute": "Katkıda bulunun",
	"footer.issues": "Issues",
	"footer.discussions": "Tartışmalar",
	"footer.security": "Güvenlik",
	"footer.conduct": "Davranış kuralları",
	"footer.changelog": "Değişiklik günlüğü",
	"footer.versions": "Sürümler",
	"footer.install": "Kurulum",
	"footer.license": "MIT Lisansı",
	"comp.editPage": "Bu sayfayı düzenleyin",
	"comp.reportIssue": "Sorun bildirin",
	"comp.issueTitle": "[docs] {name}",
	"intro.lead":
		"Svelte 5, React ve Vue için aynı tasarım belirteçleri üzerine kurulu, <grad>{count}</grad> animasyonlu ve etkileşimli arayüz bileşeninden oluşan bir koleksiyondur.",
	"intro.importHint":
		"İhtiyacınız olan bileşenleri içe aktarın. İçe aktarma yolu kullandığınız framework'e bağlıdır.",
	"install.kitOptional":
		"SvelteKit isteğe bağlıdır: FancyUI, Vite ile derlenen her Svelte 5 projesinde çalışır.",
	"theming.cssPerFramework":
		"Framework'ünüze uygun stil dosyasını içe aktarın: her paket kendi stil dosyasıyla gelir.",
	"status.planned": "Planlandı",
	"status.deprecated": "Kullanımdan kaldırıldı",
	"comp.sinceVersion": "v{version} ile geldi",
	"comp.deprecatedNotice":
		"Bu bileşen kullanımdan kaldırılmıştır ve gelecekteki bir sürümde kaldırılabilir.",
	"comp.inspiredByNoLink": "{name}'den ilham alınmıştır",
	"recipes.title": "Tarifler",
	"recipes.lead":
		"Birden fazla bileşeni tamamlanmış bir arayüzde birleştiren adım adım kompozisyonlar.",
	"recipes.components": "Bileşenler: {count}",
	"error.notFoundTitle": "Sayfa bulunamadı",
	"error.genericTitle": "Bir şeyler ters gitti",
	"error.notFoundBody": "Aradığınız sayfa mevcut değil veya taşınmış.",
	"error.genericBody": "Beklenmeyen bir hata oluştu. Yeniden deneyin veya dokümantasyona dönün.",
	"error.unauthorizedTitle": "Oturum açmanız gerekiyor",
	"error.unauthorizedBody": "Bu sayfayı kullanmak için oturum açmış olmanız gerekir.",
	"error.home": "Ana sayfaya dön",
	"error.browse": "Bileşenlere göz atın",
	"error.search": "Dokümantasyonda arayın",
	"error.report": "Bozuk bağlantıyı bildirin",
	"comp.previewFailed": "Bu önizleme yüklenemedi.",
	"demo.noPreview": "Bu bileşen için henüz önizleme yok.",
	"demo.notFound": "Bileşen bulunamadı.",
	"recipes.steps": "Adımlar",
	"recipes.pitfalls": "Sık yapılan hatalar",
	"recipes.componentsUsed": "Kullanılan bileşenler",
	"seo.introduction":
		"FancyUI, Svelte 5, React ve Vue için animasyonlu ve etkileşimli arayüz bileşenleri kütüphanesidir. İçeriğini ve nasıl başlayacağınızı öğrenin.",
	"seo.installation":
		"FancyUI'ı Svelte 5, React veya Vue için kurun: paketi ekleyin, stil dosyasını içe aktarın ve ilk bileşeninizi oluşturun.",
	"seo.theming":
		"FancyUI'ı tasarım belirteçleriyle özelleştirin: OKLCh renkler, yarıçap, hareket ve karanlık mod; Svelte 5, React ve Vue için.",
	"seo.themeGenerator":
		"FancyUI'ın OKLCh tasarım belirteçlerini canlı olarak ayarlayın ve oluşturulan CSS'i uygulamanıza kopyalayın.",
	"seo.changelog": "Svelte 5, React ve Vue için FancyUI paketlerinin sürüm notları.",
} satisfies Catalog;

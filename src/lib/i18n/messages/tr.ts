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

	// Component page
	"comp.preview": "Önizleme",
	"comp.code": "Kod",
	"comp.installation": "Kurulum",
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

	// Copy buttons
	"action.copy": "Kopyala",
	"action.copied": "Kopyalandı!",

	// Table of contents
	"toc.onThisPage": "Bu sayfada",

	// Theme toggle (aria)
	"theme.switchToLight": "Aydınlık moda geç",
	"theme.switchToDark": "Karanlık moda geç",

	// Components gallery
	"gallery.title": "Bileşenler",
	"gallery.intro":
		"Her bileşen runes ile Svelte 5 için yerel olarak geliştirildi, Tailwind CSS v4 ile biçimlendirildi, TypeScript ile tiplendirildi ve canlı önizleme ile kopyala-yapıştır örnekleriyle geliyor. Paketi bir kez kurun, kod sizin olsun.",
	"gallery.statComponents": "Bileşenler",
	"gallery.statCategories": "Kategoriler",
	"gallery.statTypescript": "TypeScript",
	"gallery.filterPlaceholder": "Bileşenleri filtrele...",
	"gallery.all": "Tümü",
	"gallery.noMatch": "Aramanızla eşleşen bileşen yok.",
	"gallery.subtitle":
		"Svelte 5 için güzelce animasyonlu {count} bileşen. Göz atın, arayın ve ihtiyacınız olanı bulun.",

	// Theme-generator page
	"tg.metaDescription":
		"FancyUI'nin OKLCh tasarım belirteçlerini canlı olarak ayarlayın ve CSS'yi uygulamanıza kopyalayın.",
	"tg.intro":
		"FancyUI'nin tasarım belirteçlerini ayarlayın ve bileşenlerin gerçek zamanlı olarak tepki vermesini izleyin. Doğru göründüğünde, oluşturulan CSS'yi uygulamanızın stil sayfasına (örneğin src/app.css) kopyalayın. Renkler OKLCh renk uzayını kullanır; gökkuşağı paleti HSL kullanır.",
	"tg.seeTheming": "Tüm belirteç referansı için bkz.",
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
	"tg.beamDesc": "Işın renkleri Primary → Accent sırasını izler.",
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

	// Introduction (redesigned page)
	"intro.title": "Giriş",
	"intro.metaTitle": "Giriş",
	"intro.leadPre": "Svelte 5 için doğal olarak geliştirilmiş",
	"intro.leadHighlight": "{count} animasyonlu",
	"intro.leadHighlight2": "etkileşimli arayüz bileşeninden",
	"intro.leadPost": "oluşan bir koleksiyondur.",
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
	"intro.whatsIncluded.body": "10 kategoride {count} bileşen:",
	"intro.category.buttons": "Düğmeler",
	"intro.category.cards": "Kartlar",
	"intro.category.text": "Metin",
	"intro.category.backgrounds": "Arka Planlar",
	"intro.category.effects": "Efektler",
	"intro.category.layout": "Düzen",
	"intro.category.navigation": "Gezinme",
	"intro.category.dataDisplay": "Veri Görüntüleme",
	"intro.category.feedback": "Geri Bildirim",
	"intro.category.media": "Medya",
	"intro.stats.buttons": "Rainbow, Ripple, Shimmer ve arkadaşları. Tıklanmak isteyen düğmeler.",
	"intro.stats.cards": "Karuseller, bento ızgaralar, 3D efektler. İçeriği sıkmadan sunmanın yolları.",
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
		"Renkleri özelleştirmek ve bileşenlerin gerçek zamanlı nasıl tepki verdiğini görmek için <strong>Tema Oluşturucu</strong>'yu inceleyin.",
	"intro.cta.button": "Tema Oluşturucu'yu Dene →",

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
		"FancyUI, güncel Svelte araç zincirini hedefler. Kurulumdan önce şu üç maddeyi kontrol edin.",
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
		"FancyUI'nin üzerine inşa edildiği SvelteKit ve Vite sürümleri için gereklidir.",
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
		"İçe aktarma sırası önemlidir: önce Tailwind, sonra FancyUI; böylece FancyUI'nin katmanları ve özel özellikleri varsayılanların üzerinde çözümlenir.",
	"install.tailwind.note":
		"Stil dosyası, her bileşenin okuduğu tasarım belirteçlerini taşır: renkler, köşe yarıçapları ve animasyon zamanlamaları. O olmadan bileşenler stilsiz görünür.",
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
	"theming.pill.shadcn": "shadcn-svelte uyumlu",
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
		"Belirteç adları shadcn-svelte kurallarını izler, bu nedenle mevcut bir shadcn teması değişiklik yapılmadan kullanılabilir.",
	"theming.dark.heading": "Karanlık mod",
	"theming.dark.body":
		"Karanlık mod, bir üst elementteki .dark sınıfıyla etkinleştirilir. FancyUI her belirteci geçersiz kılar:",
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
	"a11y.changeSkin": "Görünümü değiştir",
	"retro.explorer": "Gezgin",
	"retro.start": "Başlat",
	"retro.tagline": "Svelte 5 için animasyonlu bileşenler — kopyalayıp yapıştırmaya hazır.",
} satisfies Catalog;

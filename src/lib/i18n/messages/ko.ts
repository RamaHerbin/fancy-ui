// Korean (ko) — machine-translated draft. TODO: native review.
import type { Catalog } from "./en.js";

export default {
	// Sidebar / nav
	"nav.gettingStarted": "시작하기",
	"nav.components": "컴포넌트",
	"nav.home": "홈",
	"nav.docsSuffix": "문서",
	"a11y.closeSidebar": "사이드바 닫기",
	"a11y.toggleSidebar": "사이드바 열기/닫기",
	"a11y.breadcrumb": "탐색 경로",

	// Getting-started page titles
	"page.introduction": "소개",
	"page.installation": "설치",
	"page.theming": "테마 설정",
	"page.themeGenerator": "테마 생성기",
	"page.changelog": "변경 이력",

	// Header
	"header.search": "검색...",
	"a11y.github": "GitHub",
	"a11y.changeTheme": "테마 변경",
	"a11y.changeLanguage": "언어 변경",
	"theme.heading": "테마",
	"theme.system": "시스템",
	"language.heading": "언어",

	// Command search
	"search.placeholder": "컴포넌트 및 페이지 검색...",
	"search.noResults": "검색 결과가 없습니다",
	"search.esc": "ESC",

	// Component page
	"comp.preview": "미리보기",
	"comp.code": "코드",
	"comp.installation": "설치",
	"comp.usage": "사용법",
	"comp.props": "속성",
	"comp.slots": "슬롯",
	"comp.links": "링크",
	"comp.sourceCode": "소스 코드",
	"comp.inspiredBy": "영감을 받은 출처",
	"comp.examples": "예제",
	"comp.related": "관련 컴포넌트",
	"comp.previous": "이전",
	"comp.next": "다음",
	"status.stable": "안정",

	// Tables
	"table.prop": "속성",
	"table.type": "타입",
	"table.default": "기본값",
	"table.description": "설명",
	"table.slot": "슬롯",

	// Copy buttons
	"action.copy": "복사",
	"action.copied": "복사됨!",

	// Table of contents
	"toc.onThisPage": "이 페이지에서",

	// Theme toggle (aria)
	"theme.switchToLight": "라이트 모드로 전환",
	"theme.switchToDark": "다크 모드로 전환",

	// Components gallery
	"gallery.title": "컴포넌트",
	"gallery.subtitle":
		"Svelte 5를 위한 아름답게 애니메이션된 {count}개의 컴포넌트. 둘러보고, 검색하여 필요한 것을 찾으세요.",
	"gallery.intro":
		"모든 컴포넌트는 runes를 사용해 Svelte 5용으로 네이티브하게 만들어졌고, Tailwind CSS v4로 스타일링되었으며, TypeScript로 타입이 지정되어 있고, 라이브 미리보기와 복사해 붙여넣는 예제를 함께 제공합니다. 패키지를 한 번만 설치하면 코드는 여러분의 것입니다.",
	"gallery.statComponents": "컴포넌트",
	"gallery.statCategories": "카테고리",
	"gallery.statTypescript": "TypeScript",
	"gallery.filterPlaceholder": "컴포넌트 필터링...",
	"gallery.all": "전체",
	"gallery.noMatch": "검색과 일치하는 컴포넌트가 없습니다.",

	// Theme-generator page
	"tg.metaDescription": "FancyUI의 OKLCh 디자인 토큰을 실시간으로 조정하고 CSS를 앱에 복사하세요.",
	"tg.intro":
		"FancyUI의 디자인 토큰을 조정하고 컴포넌트가 실시간으로 반응하는 모습을 확인하세요. 마음에 들면 생성된 CSS를 앱의 스타일시트(예: src/app.css)에 복사하세요. 색상은 OKLCh 색 공간을 사용하며, 무지개 팔레트는 HSL을 사용합니다.",
	"tg.seeTheming": "전체 토큰 참조는 다음을 확인하세요",
	"tg.presets": "프리셋",
	"tg.base": "기본",
	"tg.light": "라이트",
	"tg.dark": "다크",
	"tg.primary": "주 색상",
	"tg.accent": "강조 색상",
	"tg.lightness": "명도",
	"tg.chroma": "채도",
	"tg.hue": "색조",
	"tg.radius": "반경",
	"tg.motion": "모션",
	"tg.rainbowPalette": "무지개 팔레트",
	"tg.livePreview": "실시간 미리보기",
	"tg.cardSurface": "카드 표면",
	"tg.cardSurfaceDesc": "--card, --foreground, --border 및 --radius를 사용합니다.",
	"tg.primaryAction": "주요 작업",
	"tg.accentBadge": "강조 배지",
	"tg.beamDesc": "빔 색상은 Primary → Accent를 따릅니다.",
	"tg.generatedCss": "생성된 CSS",
	"tg.copyCss": "CSS 복사",
	"tg.copied": "복사됨",

	// Category labels (docs-only overlay; registry stays English)
	"category.buttons": "버튼",
	"category.cards": "카드",
	"category.backgrounds": "배경",
	"category.text": "텍스트 및 타이포그래피",
	"category.layout": "레이아웃",
	"category.feedback": "피드백",
	"category.data-display": "데이터 표시",
	"category.navigation": "내비게이션",
	"category.media": "미디어",
	"category.effects": "효과",

	// Introduction (redesigned page)
	"intro.title": "소개",
	"intro.metaTitle": "소개",
	"intro.leadPre": "는 Svelte 5 네이티브로 제작된",
	"intro.leadHighlight": "{count}개의 애니메이션",
	"intro.leadHighlight2": "인터랙티브 UI 컴포넌트",
	"intro.leadPost": "모음입니다.",
	"intro.pill.svelte": "Svelte 5 네이티브",
	"intro.pill.animation": "애니메이션 우선",
	"intro.pill.copyPaste": "복사-붙여넣기 친화적",
	"intro.pill.tailwind": "Tailwind CSS 4",
	"intro.pill.typescript": "TypeScript",
	"intro.philosophy.heading": "철학",
	"intro.philosophy.card1.title": "Svelte 5 네이티브",
	"intro.philosophy.card1.desc": "룬으로 제작되었으며, 레거시 API를 사용하지 않습니다.",
	"intro.philosophy.card2.title": "애니메이션 우선",
	"intro.philosophy.card2.desc": "모든 컴포넌트가 다듬어진 애니메이션을 기본으로 제공합니다.",
	"intro.philosophy.card3.title": "복사-붙여넣기 친화적",
	"intro.philosophy.card3.desc": "패키지로 사용하거나 소스를 직접 복사하세요.",
	"intro.philosophy.card4.title": "Tailwind CSS 4",
	"intro.philosophy.card4.desc": "유틸리티 클래스와 CSS 사용자 정의 속성으로 스타일링됩니다.",
	"intro.philosophy.card5.title": "TypeScript",
	"intro.philosophy.card5.desc": "내보낸 속성 인터페이스로 완전한 타입 안전성을 제공합니다.",
	"intro.quickStart.heading": "빠른 시작",
	"intro.quickStart.step1.title": "설치",
	"intro.quickStart.step1.desc": "프로젝트에 FancyUI를 추가하세요.",
	"intro.quickStart.step2.title": "가져오기",
	"intro.quickStart.step2.desc": "필요한 컴포넌트를 가져오세요.",
	"intro.quickStart.step3.title": "사용",
	"intro.quickStart.step3.desc": "Svelte 컴포넌트에 추가하세요.",
	"intro.whatsIncluded.heading": "포함된 내용",
	"intro.whatsIncluded.body": "10개 카테고리에 걸친 {count}개의 컴포넌트:",
	"intro.category.buttons": "버튼",
	"intro.category.cards": "카드",
	"intro.category.text": "텍스트",
	"intro.category.backgrounds": "배경",
	"intro.category.effects": "효과",
	"intro.category.layout": "레이아웃",
	"intro.category.navigation": "내비게이션",
	"intro.category.dataDisplay": "데이터 표시",
	"intro.category.feedback": "피드백",
	"intro.category.media": "미디어",
	"intro.nextSteps.heading": "다음 단계",
	"intro.nextSteps.installation": "설치",
	"intro.nextSteps.theming": "테마 설정",
	"intro.nextSteps.components": "컴포넌트 둘러보기",
	"intro.cta.title": "FancyUI가 처음이신가요?",
	"intro.cta.body":
		"색상을 사용자 지정하고 컴포넌트가 실시간으로 반응하는 모습을 확인하려면 <strong>테마 생성기</strong>를 확인해 보세요.",
	"intro.cta.button": "테마 생성기 사용해보기 →",

	// Installation (redesigned page)
	"install.metaTitle": "설치",
	"install.title": "설치",
	"install.lead":
		"세 단계로 FancyUI를 SvelteKit 프로젝트에 추가하세요: 패키지를 설치하고, 스타일시트를 가져오고, 컴포넌트를 렌더링하면 됩니다.",
	"install.pill.svelte": "Svelte 5",
	"install.pill.tailwind": "Tailwind CSS 4",
	"install.pill.node": "Node.js 20.19+",
	"install.pill.typescript": "TypeScript",
	"install.prerequisites.heading": "사전 요구 사항",
	"install.prerequisites.body":
		"FancyUI는 최신 Svelte 툴체인을 대상으로 합니다. 설치 전에 다음 세 가지를 확인하세요.",
	"install.prerequisites.card1.title": "SvelteKit",
	"install.prerequisites.card1.version": "Svelte 5",
	"install.prerequisites.card1.desc":
		"컴포넌트가 룬으로 작성되어 있어 Svelte 5가 필요합니다. Svelte 4 프로젝트에서는 컴파일되지 않습니다.",
	"install.prerequisites.card2.title": "Tailwind CSS",
	"install.prerequisites.card2.version": "v4",
	"install.prerequisites.card2.desc":
		"스타일링은 Tailwind v4 유틸리티와 CSS 사용자 정의 속성에 의존합니다.",
	"install.prerequisites.card3.title": "Node.js",
	"install.prerequisites.card3.version": "20.19+",
	"install.prerequisites.card3.desc":
		"FancyUI가 빌드 대상으로 삼는 SvelteKit 및 Vite 버전에서 필요합니다.",
	"install.steps.heading": "설치",
	"install.steps.body":
		"패키지 매니저를 선택하고, 스타일시트를 연결한 다음, 첫 컴포넌트를 렌더링하세요.",
	"install.step1.title": "패키지 설치",
	"install.step1.desc":
		"모든 컴포넌트가 하나의 패키지에 담겨 있습니다. 탭을 전환하여 사용 중인 패키지 매니저에 맞는 명령어를 복사하세요.",
	"install.step2.title": "스타일시트 가져오기",
	"install.step2.desc": "Tailwind 가져오기 바로 뒤에 FancyUI 스타일시트를 추가하세요.",
	"install.step2.caption": "전역 스타일시트(보통 src/app.css)에 추가합니다.",
	"install.step3.title": "컴포넌트 렌더링",
	"install.step3.desc": "패키지 루트에서 가져와 마크업에 배치하세요.",
	"install.tailwind.heading": "Tailwind CSS 설정",
	"install.tailwind.body":
		"FancyUI는 Tailwind CSS v4 기반으로 제작되었으며, v4는 JavaScript 설정 파일 대신 CSS에서 설정합니다. 프로젝트에서 Tailwind가 이미 동작한다면 추가로 설정할 것은 없습니다.",
	"install.tailwind.order":
		"가져오기 순서가 중요합니다: Tailwind를 먼저, FancyUI를 나중에 가져와야 FancyUI의 레이어와 사용자 정의 속성이 기본값 위에서 해석됩니다.",
	"install.tailwind.note":
		"이 스타일시트에는 모든 컴포넌트가 읽는 디자인 토큰(색상, 반경, 애니메이션 타이밍)이 담겨 있습니다. 없으면 컴포넌트가 스타일 없이 렌더링됩니다.",
	"install.usage.heading": "사용법",
	"install.usage.body":
		"모든 컴포넌트는 패키지 루트의 이름 있는 내보내기이므로, 컴포넌트별 가져오기 경로를 기억할 필요가 없습니다.",
	"install.usage.note":
		"각 컴포넌트 페이지에는 속성, 실시간 예제, 접근성 참고 사항이 정리되어 있습니다.",
	"install.typescript.heading": "TypeScript",
	"install.typescript.body":
		"속성 타입이 각 컴포넌트와 함께 내보내지므로, 래퍼와 공유 프리셋에 타입을 지정할 수 있습니다.",
	"install.typescript.note":
		"타입은 패키지에 포함되어 있습니다. 별도로 설치할 타입 패키지는 없습니다.",
	"install.peerDeps.heading": "피어 의존성",
	"install.peerDeps.body": "FancyUI는 다음 패키지가 프로젝트에 이미 존재한다고 가정합니다:",
	"install.peerDeps.colPackage": "패키지",
	"install.peerDeps.colVersion": "버전",
	"install.peerDeps.bundled":
		"일부 컴포넌트는 추가 런타임 라이브러리가 필요합니다. 이들은 패키지에 함께 제공되므로 추가로 설치할 것은 없습니다:",
	"install.peerDeps.bundledNote": "해당 라이브러리는 이를 사용하는 컴포넌트에서만 불러옵니다.",
	"install.nextSteps.heading": "다음 단계",
	"install.nextSteps.components.title": "컴포넌트 둘러보기",
	"install.nextSteps.components.desc":
		"실시간 미리보기, 속성, 복사-붙여넣기 예제를 갖춘 {count}개의 컴포넌트.",
	"install.nextSteps.theming.title": "테마 설정",
	"install.nextSteps.theming.desc":
		"디자인 토큰을 재정의하여 라이트 모드와 다크 모드 모두에서 모든 컴포넌트를 브랜드에 맞추세요.",

	// Theming page
	"theming.metaTitle": "테마 설정",
	"theming.title": "테마 설정",
	"theming.lead":
		"모든 FancyUI 컴포넌트는 OKLCh 색 공간의 CSS 사용자 정의 속성에서 색상, 반경, 타이밍을 읽어옵니다. 토큰을 재정의하면 라이브러리 전체가 그에 따라 바뀝니다.",
	"theming.pill.oklch": "OKLCh 색 공간",
	"theming.pill.shadcn": "shadcn-svelte 호환",
	"theming.pill.dark": "다크 모드",
	"theming.pill.tokens": "디자인 토큰",
	"theming.generator.body":
		"시각적으로 조정하고 싶으신가요? 테마 생성기는 실시간 슬라이더로 이 토큰들을 조정하고 CSS를 바로 제공합니다.",
	"theming.generator.cta": "테마 생성기 열기",
	"theming.cssSetup.heading": "CSS 설정",
	"theming.cssSetup.body": "앱의 전역 CSS(보통 src/app.css)에 FancyUI 스타일시트를 가져옵니다:",
	"theming.colors.heading": "색상 시스템",
	"theming.colors.body":
		"모든 색상은 시각적으로 균일한 그레이디언트를 위해 OKLCh 색 공간을 사용합니다:",
	"theming.colors.note":
		"토큰 이름은 shadcn-svelte 규칙을 따르므로, 기존 shadcn 테마를 그대로 적용할 수 있습니다.",
	"theming.dark.heading": "다크 모드",
	"theming.dark.body":
		"다크 모드는 상위 요소에 붙은 .dark 클래스로 활성화됩니다. FancyUI는 모든 토큰을 재정의합니다:",
	"theming.motion.heading": "애니메이션 토큰",
	"theming.motion.body": "애니메이션 타이밍을 전역으로 제어하세요:",
	"theming.easing.heading": "이징 함수",
	"theming.easing.body": "이징 곡선도 토큰이며, 모든 컴포넌트 트랜지션에서 공유됩니다:",
	"theming.rainbow.heading": "무지개 그레이디언트",
	"theming.rainbow.body": "RainbowButton, GradientButton 및 기타 그레이디언트 효과에서 사용됩니다:",
	"theming.customizing.heading": "커스터마이징",
	"theming.customizing.body": "직접 작성한 CSS에서 토큰을 재정의하여 모양을 바꾸세요:",
	"theming.customizing.note":
		"토큰은 캐스케이딩됩니다. :root에서 전역으로 재정의하거나, 래퍼 요소로 범위를 좁혀 특정 섹션만 테마를 지정할 수 있습니다.",
	"theming.nextSteps.heading": "다음 단계",
	"theming.nextSteps.generator.title": "테마 생성기",
	"theming.nextSteps.generator.desc":
		"실시간 슬라이더로 모든 토큰을 조정하고 완성된 CSS를 복사하세요.",
	"theming.nextSteps.components.title": "컴포넌트 둘러보기",
	"theming.nextSteps.components.desc":
		"전체 컴포넌트 갤러리에서 토큰이 실제로 동작하는 모습을 확인하세요.",

	// Changelog page
	"changelog.metaTitle": "변경 이력",
	"changelog.title": "변경 이력",
	"changelog.lead": "FancyUI의 모든 릴리스와 변경 내용을 최신순으로 정리했습니다.",
	"changelog.latest": "최신",
	"changelog.major": "메이저 변경",
	"changelog.minor": "마이너 변경",
	"changelog.patch": "패치 변경",
	// Cameleon docs skins
	"skin.heading": "스킨",
	"skin.standard": "표준",
	"skin.brutal": "Brutal",
	"skin.retroOs": "Retro OS",
	"a11y.changeSkin": "스킨 변경",
	"retro.explorer": "탐색기",
	"retro.start": "시작",
	"retro.tagline": "Svelte 5를 위한 애니메이션 컴포넌트 — 복사해서 바로 사용하세요.",
} satisfies Catalog;

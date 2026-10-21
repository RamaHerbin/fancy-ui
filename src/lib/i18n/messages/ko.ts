// Korean (ko). Register: 합니다체 statements, -하세요 instructions; terms follow reviewed/glossary.md.
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
	"theme.system": "시스템 설정",
	"language.heading": "언어",

	// Command search
	"search.placeholder": "컴포넌트 및 페이지 검색...",
	"search.noResults": "검색 결과가 없습니다",
	"search.esc": "ESC",
	"search.tryInstead": "대신 다음 중 하나를 검색해 보세요:",
	"jobs.heading": "용도별로 둘러보기",
	"jobs.feedback": "피드백 주기",
	"jobs.input": "입력 받기",
	"jobs.attention": "시선 유도하기",
	"jobs.navigate": "내비게이션 구성하기",
	"jobs.progress": "진행 상황 보여 주기",
	"jobs.surprise": "깜짝 효과 주기",

	// Component page
	"comp.preview": "미리보기",
	"comp.code": "코드",
	"comp.installation": "설치",
	"install.framework": "프레임워크",
	"install.sourceOnly": "아직 npm에 배포되지 않았습니다. 이 포팅 버전은 저장소에만 있습니다.",
	"install.unavailable": "이 컴포넌트는 아직 이 프레임워크용으로 포팅되지 않았습니다.",
	"install.copySource": "소스 복사",
	"install.copySourceNote":
		"컴포넌트 소스를 프로젝트에 복사합니다. 이후 코드는 여러분이 직접 소유하고 관리합니다.",
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
	"table.event": "이벤트",
	"table.payload": "페이로드",
	"table.portName": "{framework}에서의 이름",
	"table.portNameUnknown": "명명 규칙으로 도출할 수 없습니다. Svelte API와의 차이점을 참고하세요.",
	"comp.events": "이벤트",
	"comp.copyMarkdown": "Markdown으로 복사",

	// Copy buttons
	"action.copy": "복사",
	"action.copied": "복사됨!",

	// Table of contents
	"toc.onThisPage": "이 페이지의 목차",

	// Components gallery
	"gallery.title": "컴포넌트",
	"gallery.subtitle":
		"Svelte 5, React, Vue를 위한 아름다운 애니메이션 컴포넌트 {count}개. 둘러보고 검색해서 필요한 컴포넌트를 찾아보세요.",
	"gallery.intro":
		"컴포넌트는 Svelte 5, React, Vue용으로 제공되며, Tailwind CSS v4로 스타일링하고 TypeScript로 타입을 지정했습니다. 모든 페이지에 라이브 미리보기와 복사해 붙여넣을 수 있는 Svelte 예제가 있고, 가능한 경우 React와 Vue 사용법도 함께 보여 줍니다. 패키지를 한 번만 설치하면 코드는 온전히 여러분의 것입니다.",
	"gallery.filterPlaceholder": "컴포넌트 필터링...",
	"gallery.all": "전체",
	"gallery.noMatch": "검색과 일치하는 컴포넌트가 없습니다.",
	"gallery.meta":
		"{components}개 컴포넌트 · {categories}개 카테고리 · Svelte 5 · React · Vue · TypeScript",
	"gallery.results.other": "결과 {count}개",
	"gallery.clearFilters": "필터 지우기",
	"gallery.clearSearch": "검색 지우기",
	"gallery.searchHint": "/ 키를 눌러 검색",
	"gallery.groupLabel": "컴포넌트 그룹",
	"gallery.categoryLabel": "카테고리",
	"gallery.desc.buttons": "호버하고 누를 때 풍부한 모션으로 반응하는 인터랙티브 버튼",
	"gallery.desc.cards": "포인터에 반응하는 카드와 컨테이너",
	"gallery.desc.backgrounds": "애니메이션 배경과 장식용 배경",
	"gallery.desc.text": "텍스트 애니메이션과 타이포그래피 효과",
	"gallery.desc.layout": "레이아웃 기본 요소와 구조 컴포넌트",
	"gallery.desc.feedback": "툴팁, 토스트, 로더 등 피드백 컴포넌트",
	"gallery.desc.data-display": "목록, 타임라인, 데이터 모음",
	"gallery.desc.navigation": "메뉴, 탭, 링크와 길 안내",
	"gallery.desc.media": "이미지, 비디오, 미디어 표시",
	"gallery.desc.effects": "시각 효과와 장식 모션",
	"gallery.desc.ai-chat": "메시지, 입력창, 스레드, 스트리밍 텍스트",
	"gallery.desc.ai-agents": "추론, 도구 사용, 계획, 사람의 개입을 위한 카드",
	"gallery.desc.actions": "버튼, 토글 등 액션 기본 요소",
	"gallery.desc.forms": "사용자 입력을 받는 입력창과 기본 요소",
	"gallery.desc.overlays": "대화상자, 팝오버, 메뉴, 시트",
	"gallery.desc.display": "배지, 아바타, 상태 표시",

	// Theme-generator page
	"tg.metaDescription": "FancyUI의 OKLCh 디자인 토큰을 실시간으로 조정하고 CSS를 앱에 복사하세요.",
	"tg.intro":
		"FancyUI의 디자인 토큰을 조정하고 컴포넌트가 실시간으로 반응하는 모습을 확인하세요. 마음에 들면 생성된 CSS를 앱의 스타일시트(예: src/app.css)에 복사하세요. 색상은 OKLCh 색 공간을, 무지개 팔레트는 HSL을 사용합니다. 전체 토큰 목록은 <link>테마 설정</link> 페이지를 참고하세요.",
	"tg.presets": "프리셋",
	"tg.base": "기본",
	"tg.light": "라이트",
	"tg.dark": "다크",
	"tg.primary": "주 색상",
	"tg.accent": "강조 색상",
	"tg.lightness": "명도",
	"tg.chroma": "채도",
	"tg.hue": "색조",
	"tg.radius": "모서리 반경",
	"tg.motion": "모션",
	"tg.rainbowPalette": "무지개 팔레트",
	"tg.livePreview": "실시간 미리보기",
	"tg.cardSurface": "카드 표면",
	"tg.cardSurfaceDesc": "--card, --foreground, --border, --radius를 사용합니다.",
	"tg.primaryAction": "주요 액션",
	"tg.accentBadge": "강조 배지",
	"tg.beamDesc": "빔 색상은 {primary} → {accent} 순서를 따릅니다.",
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
	"category.ai-chat": "AI 채팅",
	"category.ai-agents": "AI 에이전트",

	// Introduction (redesigned page)
	"intro.title": "소개",
	"intro.metaTitle": "소개",
	"intro.pill.animation": "애니메이션 우선",
	"intro.pill.copyPaste": "복사·붙여넣기 친화적",
	"intro.pill.tailwind": "Tailwind CSS 4",
	"intro.pill.typescript": "TypeScript",
	"intro.philosophy.heading": "철학",
	"intro.philosophy.card2.title": "애니메이션 우선",
	"intro.philosophy.card2.desc": "모든 컴포넌트가 다듬어진 애니메이션을 기본으로 제공합니다.",
	"intro.philosophy.card3.title": "복사·붙여넣기 친화적",
	"intro.philosophy.card3.desc": "패키지로 사용하거나 소스를 직접 복사하세요.",
	"intro.philosophy.card4.title": "Tailwind CSS 4",
	"intro.philosophy.card4.desc": "유틸리티 클래스와 CSS 사용자 지정 속성으로 스타일링합니다.",
	"intro.philosophy.card5.title": "TypeScript",
	"intro.philosophy.card5.desc": "내보낸 속성 인터페이스로 완전한 타입 안전성을 제공합니다.",
	"intro.quickStart.heading": "빠른 시작",
	"intro.quickStart.step1.title": "설치하기",
	"intro.quickStart.step1.desc": "프로젝트에 FancyUI를 추가하세요.",
	"intro.quickStart.step2.title": "가져오기",
	"intro.quickStart.step3.title": "사용하기",
	"intro.whatsIncluded.heading": "포함된 내용",
	"intro.whatsIncluded.body.other":
		"{categories}개 카테고리에 걸쳐 {count}개의 컴포넌트를 제공합니다:",
	"intro.category.buttons": "버튼",
	"intro.category.cards": "카드",
	"intro.category.effects": "효과",
	"intro.stats.buttons":
		"Rainbow, Ripple, Shimmer 등 다양한 버튼. 클릭하지 않고는 못 배기는 버튼들입니다.",
	"intro.stats.cards":
		"캐러셀, 벤토 그리드, 3D 틸트. 지루할 틈 없이 콘텐츠를 보여 주는 방법입니다.",
	"intro.stats.effects": "커서, 트레일, 애니메이션 텍스트. 차이를 만드는 작은 디테일입니다.",
	"sidebar.starTitle": "GitHub에서 스타 남기기",
	"sidebar.starBody": "FancyUI가 마음에 들면 스타를 남겨 주세요!",
	"rail.nextPage": "다음 페이지",
	"intro.nextSteps.heading": "다음 단계",
	"intro.nextSteps.installation": "설치",
	"intro.nextSteps.theming": "테마 설정",
	"intro.nextSteps.components": "컴포넌트 둘러보기",
	"intro.cta.title": "FancyUI가 처음이신가요?",
	"intro.cta.body":
		"<b>테마 생성기</b>에서 색상을 사용자 지정하고 컴포넌트가 실시간으로 반응하는 모습을 확인해 보세요.",
	"intro.cta.button": "테마 생성기 사용해 보기",

	// Core components workspace (sidebar groups, categories, status)
	"group.core": "Core",
	"group.fancy": "Fancy",
	"category.actions": "액션",
	"category.forms": "입력 폼",
	"category.overlays": "오버레이",
	"category.display": "표시",
	"status.inProgress": "개발 중",

	// Installation (redesigned page)
	"install.metaTitle": "설치",
	"install.title": "설치",
	"install.lead":
		"FancyUI를 SvelteKit 프로젝트에 세 단계로 추가하세요. 패키지를 설치하고, 스타일시트를 가져온 다음, 컴포넌트를 렌더링하면 됩니다.",
	"install.pill.svelte": "Svelte 5",
	"install.pill.tailwind": "Tailwind CSS 4",
	"install.pill.node": "Node.js 20.19+",
	"install.pill.typescript": "TypeScript",
	"install.prerequisites.heading": "사전 요구 사항",
	"install.prerequisites.body":
		"FancyUI는 최신 툴체인을 대상으로 합니다. 설치하기 전에 다음 세 가지를 확인하세요.",
	"install.prerequisites.card1.title": "SvelteKit",
	"install.prerequisites.card1.version": "Svelte 5",
	"install.prerequisites.card1.desc":
		"컴포넌트가 runes로 작성되어 있어 Svelte 5가 필요합니다. Svelte 4 프로젝트에서는 컴파일되지 않습니다.",
	"install.prerequisites.card2.title": "Tailwind CSS",
	"install.prerequisites.card2.version": "v4",
	"install.prerequisites.card2.desc":
		"스타일링은 Tailwind v4 유틸리티와 CSS 사용자 지정 속성을 기반으로 합니다.",
	"install.prerequisites.card3.title": "Node.js",
	"install.prerequisites.card3.version": "20.19+",
	"install.prerequisites.card3.desc": "FancyUI를 테스트하는 현재 빌드 도구에 필요합니다.",
	"install.steps.heading": "설치",
	"install.steps.body":
		"패키지 매니저를 선택하고, 스타일시트를 연결한 다음, 첫 컴포넌트를 렌더링하세요.",
	"install.step1.title": "패키지 설치",
	"install.step1.desc":
		"모든 컴포넌트가 하나의 패키지에 담겨 있습니다. 탭을 전환해 사용하는 패키지 매니저에 맞는 명령어를 복사하세요.",
	"install.step2.title": "스타일시트 가져오기",
	"install.step2.desc": "Tailwind import 문 바로 다음에 FancyUI 스타일시트를 추가하세요.",
	"install.step2.caption": "전역 스타일시트(보통 src/app.css)에 추가합니다.",
	"install.step3.title": "컴포넌트 렌더링",
	"install.step3.desc": "패키지 루트에서 가져와 마크업에 넣으세요.",
	"install.tailwind.heading": "Tailwind CSS 설정",
	"install.tailwind.body":
		"FancyUI는 Tailwind CSS v4를 기반으로 하며, v4는 JavaScript 설정 파일 대신 CSS에서 설정합니다. 프로젝트에서 Tailwind가 이미 동작한다면 따로 설정할 것은 없습니다.",
	"install.tailwind.order":
		"import 순서가 중요합니다. Tailwind를 먼저, FancyUI를 그다음에 가져오세요. FancyUI import 문은 직접 작성한 @custom-variant dark보다 앞에 두세요. 그렇지 않으면 FancyUI의 정의가 여러분의 정의를 대체합니다.",
	"install.tailwind.note":
		"이 엔트리는 기본 색상 토큰(background, primary, border 등)과 다크 변형을 제공합니다. 직접 작성한 :root와 .dark 블록이 이를 덮어씁니다. CSS 변수를 다시 정의하면 여러분의 값이 우선 적용됩니다.",
	"install.usage.heading": "사용법",
	"install.usage.body":
		"모든 컴포넌트는 패키지 루트의 명명된 내보내기이므로, 컴포넌트별 가져오기 경로를 기억할 필요가 없습니다.",
	"install.usage.note":
		"각 컴포넌트 페이지에는 속성, 라이브 예제, 접근성 참고 사항이 정리되어 있습니다.",
	"install.typescript.heading": "TypeScript",
	"install.typescript.body":
		"속성 타입을 각 컴포넌트와 함께 내보내므로, 래퍼와 공유 프리셋에도 타입을 지정할 수 있습니다.",
	"install.typescript.note":
		"타입은 패키지에 포함되어 있습니다. 따로 설치할 타입 패키지는 없습니다.",
	"install.peerDeps.heading": "피어 의존성",
	"install.peerDeps.body": "FancyUI를 사용하려면 프로젝트에 다음 패키지가 이미 있어야 합니다:",
	"install.peerDeps.colPackage": "패키지",
	"install.peerDeps.colVersion": "버전",
	"install.peerDeps.bundled":
		"일부 컴포넌트는 추가 런타임 라이브러리가 필요합니다. 이 라이브러리들은 패키지에 함께 포함되어 있으므로 따로 설치할 것은 없습니다:",
	"install.peerDeps.bundledNote": "이 라이브러리들은 이를 사용하는 컴포넌트에서만 불러옵니다.",
	"install.nextSteps.heading": "다음 단계",
	"install.nextSteps.components.title": "컴포넌트 둘러보기",
	"install.nextSteps.components.desc":
		"라이브 미리보기, 속성, 복사해 붙여넣을 수 있는 예제를 갖춘 컴포넌트 {count}개.",
	"install.nextSteps.theming.title": "테마 설정",
	"install.nextSteps.theming.desc":
		"디자인 토큰을 재정의해 라이트 모드와 다크 모드 모두에서 모든 컴포넌트를 브랜드에 맞추세요.",

	// Theming page
	"theming.metaTitle": "테마 설정",
	"theming.title": "테마 설정",
	"theming.lead":
		"모든 FancyUI 컴포넌트는 OKLCh 색 공간의 CSS 사용자 지정 속성에서 색상, 모서리 반경, 타이밍을 읽어 옵니다. 토큰 하나를 재정의하면 라이브러리 전체가 따라 바뀝니다.",
	"theming.pill.oklch": "OKLCh 색 공간",
	"theming.pill.shadcn": "표준 토큰 이름",
	"theming.pill.dark": "다크 모드",
	"theming.pill.tokens": "디자인 토큰",
	"theming.generator.body":
		"시각적으로 조정하고 싶으신가요? 테마 생성기에서 실시간 슬라이더로 이 토큰들을 조정하고 CSS를 바로 받을 수 있습니다.",
	"theming.generator.cta": "테마 생성기 열기",
	"theming.cssSetup.heading": "CSS 설정",
	"theming.cssSetup.body": "앱의 전역 CSS(보통 src/app.css)에서 FancyUI 스타일시트를 가져오세요:",
	"theming.colors.heading": "색상 시스템",
	"theming.colors.body":
		"모든 색상은 지각적으로 균일한 그레이디언트를 위해 OKLCh 색 공간을 사용합니다:",
	"theming.colors.note":
		"토큰 이름은 널리 쓰이는 시맨틱 규칙(background, foreground, primary 등)을 따르므로, 같은 변수 이름을 쓰는 기존 테마를 그대로 적용할 수 있습니다.",
	"theming.dark.heading": "다크 모드",
	"theming.dark.body":
		"다크 모드는 기본적으로 운영체제 설정을 따릅니다. <html> 또는 임의의 상위 요소에 .dark 클래스를 지정하면 다크 모드로, .light를 지정하면 라이트 모드로 고정되며, dark: 유틸리티와 모든 토큰이 이를 따릅니다. 다크 값을 직접 지정하려면 .dark 아래에서 재정의하세요:",
	"theming.motion.heading": "애니메이션 토큰",
	"theming.motion.body": "애니메이션 타이밍을 전역으로 제어하세요:",
	"theming.easing.heading": "이징 함수",
	"theming.easing.body": "이징 곡선도 토큰이며, 모든 컴포넌트 트랜지션에서 공유됩니다:",
	"theming.rainbow.heading": "무지개 그레이디언트",
	"theming.rainbow.body": "RainbowButton, GradientButton 및 기타 그레이디언트 효과에서 사용됩니다:",
	"theming.customizing.heading": "커스터마이징",
	"theming.customizing.body": "직접 작성한 CSS에서 토큰을 재정의해 모양을 바꾸세요:",
	"theming.customizing.note":
		"토큰은 캐스케이드됩니다. :root에서 전역으로 재정의하거나, 래퍼 요소로 범위를 한정해 특정 섹션에만 테마를 적용할 수 있습니다.",
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
	"changelog.major": "메이저 변경 사항",
	"changelog.minor": "마이너 변경 사항",
	"changelog.patch": "패치 변경 사항",
	// Cameleon docs skins
	"skin.heading": "스킨",
	"skin.standard": "표준",
	"skin.brutal": "Brutal",
	"skin.retroOs": "Retro OS",
	"skin.beta": "베타",
	"a11y.changeSkin": "스킨 변경",
	"a11y.sound": "사운드",
	"retro.explorer": "탐색기",
	"retro.start": "시작",
	"retro.tagline": "Svelte 5용 애니메이션 컴포넌트 — 복사해서 바로 쓰세요.",
	"comp.snippetSvelteOnly":
		"이 프레임워크용 전체 예제는 아직 작성되지 않았습니다. 지금은 Svelte 버전에만 있습니다.",
	"comp.copyMarkdownSvelte": "Markdown으로 복사 (Svelte)",
	"comp.markdownSvelteOnly": "Markdown 내보내기는 Svelte 버전만 설명합니다.",
	"comp.apiNoticeReact":
		"이 API 레퍼런스는 Svelte 이름을 사용합니다. React에서는 class가 className이 되고, on* 핸들러는 카멜 케이스로 쓰며(onclick은 onClick), 스니펫은 ReactNode 속성이나 렌더 함수가 됩니다.",
	"comp.apiNoticeVue":
		"이 API 레퍼런스는 Svelte 이름을 사용합니다. Vue에서는 스니펫이 슬롯이 되고, 바인딩 가능한 속성은 v-model:name이 됩니다.",
	"comp.apiNoticeLink": "Svelte API와의 차이점",
	"install.lead.react":
		"FancyUI를 React 프로젝트에 세 단계로 추가하세요. 패키지를 설치하고, 스타일시트를 가져온 다음, 컴포넌트를 렌더링하면 됩니다.",
	"install.lead.vue":
		"FancyUI를 Vue 프로젝트에 세 단계로 추가하세요. 패키지를 설치하고, 스타일시트를 가져온 다음, 컴포넌트를 렌더링하면 됩니다.",
	"install.pill.react": "React 18+",
	"install.pill.vue": "Vue 3.5+",
	"install.prerequisites.card1.title.react": "React",
	"install.prerequisites.card1.version.react": "18 / 19",
	"install.prerequisites.card1.desc.react":
		"React 18과 19를 지원합니다. 컴포넌트는 클라이언트 모듈로 배포되므로 서버 컴포넌트에서도 바로 가져올 수 있습니다.",
	"install.prerequisites.card1.title.vue": "Vue",
	"install.prerequisites.card1.version.vue": "3.5+",
	"install.prerequisites.card1.desc.vue":
		"컴포넌트는 Vue 3.5 단일 파일 컴포넌트이므로 Vue 3.5.2 이상이 필요합니다.",

	// Docs audit: framework-neutral Introduction and Installation copy
	"intro.pill.frameworks": "Svelte 5, React, Vue 지원",
	"intro.philosophy.card1.title": "Svelte, React와 Vue",
	"intro.philosophy.card1.desc":
		"각 프레임워크에 맞게 네이티브로 작성되었습니다. Svelte에서는 runes, React에서는 hooks, Vue에서는 Composition API를 사용합니다.",
	"intro.quickStart.step3.desc": "작성 중인 컴포넌트에 바로 넣어 사용하세요.",
	"install.peerDeps.optional": "선택 사항",

	// Docs audit: chrome, contribution, status, recipes, errors, SEO
	"a11y.skipToContent": "본문으로 건너뛰기",
	"a11y.docsBreadcrumb": "문서 탐색 경로",
	"a11y.prevNext": "이전 및 다음 페이지",
	"a11y.search": "검색",
	"search.a11y.close": "검색 닫기",
	"nav.backToSite": "FancyUI 홈으로 돌아가기",
	"nav.recipes": "레시피",
	"footer.contribute": "기여하기",
	"footer.issues": "이슈",
	"footer.discussions": "토론",
	"footer.security": "보안",
	"footer.conduct": "행동 강령",
	"footer.changelog": "변경 이력",
	"footer.versions": "버전",
	"footer.install": "설치",
	"footer.license": "MIT 라이선스",
	"comp.editPage": "이 페이지 편집",
	"comp.reportIssue": "문제 신고",
	"comp.issueTitle": "[docs] {name}",
	"intro.lead":
		"라이브러리는 Svelte 5, React, Vue용 애니메이션 인터랙티브 UI 컴포넌트 <grad>{count}</grad>개를 제공하며, 모든 컴포넌트가 같은 디자인 토큰을 기반으로 합니다.",
	"intro.importHint":
		"필요한 컴포넌트를 가져오세요. 가져오기 경로는 사용하는 프레임워크에 따라 달라집니다.",
	"install.kitOptional":
		"SvelteKit은 선택 사항입니다. FancyUI는 Vite로 빌드하는 모든 Svelte 5 프로젝트에서 동작합니다.",
	"theming.cssPerFramework":
		"사용하는 프레임워크에 맞는 스타일시트를 가져오세요. 패키지마다 자체 스타일시트가 포함되어 있습니다.",
	"status.planned": "예정",
	"status.deprecated": "지원 중단",
	"comp.sinceVersion": "v{version}에서 추가됨",
	"comp.deprecatedNotice": "이 컴포넌트는 지원이 중단되었으며 향후 릴리스에서 제거될 수 있습니다.",
	"comp.inspiredByNoLink": "영감을 받은 출처: {name}",
	"recipes.title": "레시피",
	"recipes.lead": "여러 컴포넌트를 조합해 완성된 인터페이스를 만드는 단계별 구성 예시입니다.",
	"recipes.components": "컴포넌트: {count}개",
	"error.notFoundTitle": "페이지를 찾을 수 없습니다",
	"error.genericTitle": "문제가 발생했습니다",
	"error.notFoundBody": "찾으시는 페이지가 없거나 다른 곳으로 이동되었습니다.",
	"error.genericBody": "예기치 않은 오류가 발생했습니다. 다시 시도하거나 문서로 돌아가세요.",
	"error.unauthorizedTitle": "로그인이 필요합니다",
	"error.unauthorizedBody": "이 페이지를 사용하려면 로그인해야 합니다.",
	"error.home": "홈으로 돌아가기",
	"error.browse": "컴포넌트 둘러보기",
	"error.search": "문서 검색",
	"error.report": "깨진 링크 신고",
	"comp.previewFailed": "이 미리보기를 불러오지 못했습니다.",
	"demo.noPreview": "이 컴포넌트의 미리보기는 아직 없습니다.",
	"demo.notFound": "컴포넌트를 찾을 수 없습니다.",
	"recipes.steps": "단계",
	"recipes.pitfalls": "자주 하는 실수",
	"recipes.componentsUsed": "사용한 컴포넌트",
	"seo.installation":
		"Svelte 5, React, Vue용 FancyUI를 설치하세요. 패키지를 추가하고 스타일시트를 가져온 뒤 첫 컴포넌트를 렌더링합니다.",
	"seo.theming":
		"디자인 토큰으로 FancyUI를 사용자 지정하세요. Svelte 5, React, Vue에서 OKLCh 색상, 모서리 반경, 모션, 다크 모드를 설정할 수 있습니다.",
	"seo.themeGenerator":
		"FancyUI의 OKLCh 디자인 토큰을 실시간으로 조정하고 생성된 CSS를 앱에 복사하세요.",
	"seo.changelog": "Svelte 5, React, Vue용 FancyUI 패키지의 릴리스 노트입니다.",
} satisfies Catalog;

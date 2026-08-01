// Japanese (ja) — machine-translated draft. TODO: native review.
import type { Catalog } from "./en.js";

export default {
	// Sidebar / nav
	"nav.gettingStarted": "スタートガイド",
	"nav.components": "コンポーネント",
	"nav.home": "ホーム",
	"nav.docsSuffix": "ドキュメント",
	"a11y.closeSidebar": "サイドバーを閉じる",
	"a11y.toggleSidebar": "サイドバーの表示切り替え",
	"a11y.breadcrumb": "パンくずリスト",

	// Getting-started page titles
	"page.introduction": "はじめに",
	"page.installation": "インストール",
	"page.theming": "テーマ設定",
	"page.themeGenerator": "テーマジェネレーター",
	"page.changelog": "変更履歴",

	// Header
	"header.search": "検索...",
	"a11y.github": "GitHub",
	"a11y.changeTheme": "テーマを変更",
	"a11y.changeLanguage": "言語を変更",
	"theme.heading": "テーマ",
	"theme.system": "システム",
	"language.heading": "言語",

	// Command search
	"search.placeholder": "コンポーネントとページを検索...",
	"search.noResults": "結果が見つかりません",
	"search.esc": "ESC",

	// Component page
	"comp.preview": "プレビュー",
	"comp.code": "コード",
	"comp.installation": "インストール",
	"comp.usage": "使い方",
	"comp.props": "プロパティ",
	"comp.slots": "スロット",
	"comp.links": "リンク",
	"comp.sourceCode": "ソースコード",
	"comp.inspiredBy": "インスピレーション元",
	"comp.examples": "使用例",
	"comp.related": "関連コンポーネント",
	"comp.previous": "前へ",
	"comp.next": "次へ",
	"status.stable": "安定版",

	// Tables
	"table.prop": "プロパティ",
	"table.type": "型",
	"table.default": "デフォルト",
	"table.description": "説明",
	"table.slot": "スロット",

	// Copy buttons
	"action.copy": "コピー",
	"action.copied": "コピーしました!",

	// Table of contents
	"toc.onThisPage": "このページの内容",

	// Theme toggle (aria)
	"theme.switchToLight": "ライトモードに切り替え",
	"theme.switchToDark": "ダークモードに切り替え",

	// Components gallery
	"gallery.title": "コンポーネント",
	"gallery.intro":
		"すべてのコンポーネントは runes を使って Svelte 5 向けにネイティブに作られ、Tailwind CSS v4 でスタイリングされ、TypeScript で型付けされ、ライブプレビューとコピー＆ペーストできる使用例が付属します。パッケージを一度インストールすれば、コードはあなたのものです。",
	"gallery.statComponents": "コンポーネント",
	"gallery.statCategories": "カテゴリー",
	"gallery.statTypescript": "TypeScript",
	"gallery.filterPlaceholder": "コンポーネントを絞り込む...",
	"gallery.all": "すべて",
	"gallery.noMatch": "検索に一致するコンポーネントがありません。",
	"gallery.subtitle":
		"Svelte 5 向けの美しくアニメーションする {count} 個のコンポーネント。閲覧・検索して、必要なものを見つけましょう。",

	// Theme-generator page
	"tg.metaDescription":
		"FancyUI の OKLCh デザイントークンをライブで調整し、CSS をアプリにコピーできます。",
	"tg.intro":
		"FancyUI のデザイントークンを調整すると、コンポーネントがリアルタイムに反応します。気に入ったら、生成された CSS をアプリのスタイルシート（例: src/app.css）にコピーしてください。色は OKLCh 色空間を使用し、レインボーパレットは HSL を使用します。",
	"tg.seeTheming": "トークンの完全なリファレンスについては、以下を参照してください",
	"tg.presets": "プリセット",
	"tg.base": "ベース",
	"tg.light": "ライト",
	"tg.dark": "ダーク",
	"tg.primary": "プライマリ",
	"tg.accent": "アクセント",
	"tg.lightness": "明度",
	"tg.chroma": "彩度",
	"tg.hue": "色相",
	"tg.radius": "角丸",
	"tg.motion": "モーション",
	"tg.rainbowPalette": "レインボーパレット",
	"tg.livePreview": "ライブプレビュー",
	"tg.cardSurface": "カードサーフェス",
	"tg.cardSurfaceDesc": "--card、--foreground、--border、--radius を使用します。",
	"tg.primaryAction": "プライマリアクション",
	"tg.accentBadge": "アクセントバッジ",
	"tg.beamDesc": "ビームの色は Primary → Accent に従います。",
	"tg.generatedCss": "生成された CSS",
	"tg.copyCss": "CSS をコピー",
	"tg.copied": "コピーしました",

	// Category labels (docs-only overlay; registry stays English)
	"category.buttons": "ボタン",
	"category.cards": "カード",
	"category.backgrounds": "背景",
	"category.text": "テキストとタイポグラフィ",
	"category.layout": "レイアウト",
	"category.feedback": "フィードバック",
	"category.data-display": "データ表示",
	"category.navigation": "ナビゲーション",
	"category.media": "メディア",
	"category.effects": "エフェクト",

	// Introduction (redesigned page)
	"intro.title": "はじめに",
	"intro.metaTitle": "はじめに",
	"intro.leadPre": "は、",
	"intro.leadHighlight": "{count}種のアニメーション",
	"intro.leadHighlight2": "インタラクティブな UI コンポーネント",
	"intro.leadPost": "の詰め合わせで、Svelte 5 向けにネイティブに構築されています。",
	"intro.pill.svelte": "Svelte 5 ネイティブ",
	"intro.pill.animation": "アニメーション優先",
	"intro.pill.copyPaste": "コピー＆ペーストに対応",
	"intro.pill.tailwind": "Tailwind CSS 4",
	"intro.pill.typescript": "TypeScript",
	"intro.philosophy.heading": "設計思想",
	"intro.philosophy.card1.title": "Svelte 5 ネイティブ",
	"intro.philosophy.card1.desc": "runes で構築。レガシー API は不使用。",
	"intro.philosophy.card2.title": "アニメーション優先",
	"intro.philosophy.card2.desc":
		"すべてのコンポーネントに、洗練されたアニメーションが標準で付属しています。",
	"intro.philosophy.card3.title": "コピー＆ペーストに対応",
	"intro.philosophy.card3.desc": "パッケージとして利用するか、ソースコードを直接コピーできます。",
	"intro.philosophy.card4.title": "Tailwind CSS 4",
	"intro.philosophy.card4.desc":
		"ユーティリティクラスと CSS カスタムプロパティでスタイリングされています。",
	"intro.philosophy.card5.title": "TypeScript",
	"intro.philosophy.card5.desc":
		"エクスポートされた prop インターフェースによる、完全な型安全性を提供します。",
	"intro.quickStart.heading": "クイックスタート",
	"intro.quickStart.step1.title": "インストール",
	"intro.quickStart.step1.desc": "FancyUI をプロジェクトに追加します。",
	"intro.quickStart.step2.title": "インポート",
	"intro.quickStart.step2.desc": "必要なコンポーネントをインポートします。",
	"intro.quickStart.step3.title": "使用",
	"intro.quickStart.step3.desc": "Svelte コンポーネント内に配置するだけです。",
	"intro.whatsIncluded.heading": "収録内容",
	"intro.whatsIncluded.body": "10 のカテゴリーにわたる {count} 個のコンポーネント:",
	"intro.category.buttons": "ボタン",
	"intro.category.cards": "カード",
	"intro.category.text": "テキスト",
	"intro.category.backgrounds": "背景",
	"intro.category.effects": "エフェクト",
	"intro.category.layout": "レイアウト",
	"intro.category.navigation": "ナビゲーション",
	"intro.category.dataDisplay": "データ表示",
	"intro.category.feedback": "フィードバック",
	"intro.category.media": "メディア",
	"intro.nextSteps.heading": "次のステップ",
	"intro.nextSteps.installation": "インストール",
	"intro.nextSteps.theming": "テーマ設定",
	"intro.nextSteps.components": "コンポーネント一覧",
	"intro.cta.title": "FancyUI は初めてですか？",
	"intro.cta.body":
		"<strong>テーマジェネレーター</strong> をチェックして、色をカスタマイズしたり、コンポーネントがリアルタイムに反応する様子を確認したりしましょう。",
	"intro.cta.button": "テーマジェネレーターを試す →",

	// Installation (redesigned page)
	"install.metaTitle": "インストール",
	"install.title": "インストール",
	"install.lead":
		"FancyUI は 3 つのステップで SvelteKit プロジェクトに追加できます: パッケージをインストールし、スタイルシートをインポートし、コンポーネントをレンダリングするだけです。",
	"install.pill.svelte": "Svelte 5",
	"install.pill.tailwind": "Tailwind CSS 4",
	"install.pill.node": "Node.js 20.19+",
	"install.pill.typescript": "TypeScript",
	"install.prerequisites.heading": "前提条件",
	"install.prerequisites.body":
		"FancyUI は現行の Svelte ツールチェーンを対象としています。インストール前に次の 3 点を確認してください。",
	"install.prerequisites.card1.title": "SvelteKit",
	"install.prerequisites.card1.version": "Svelte 5",
	"install.prerequisites.card1.desc":
		"コンポーネントは runes で書かれているため、Svelte 5 が必須です。Svelte 4 のプロジェクトではコンパイルできません。",
	"install.prerequisites.card2.title": "Tailwind CSS",
	"install.prerequisites.card2.version": "v4",
	"install.prerequisites.card2.desc":
		"スタイリングは Tailwind v4 のユーティリティと CSS カスタムプロパティに依存しています。",
	"install.prerequisites.card3.title": "Node.js",
	"install.prerequisites.card3.version": "20.19+",
	"install.prerequisites.card3.desc":
		"FancyUI がビルド対象とする SvelteKit と Vite のバージョンで必要になります。",
	"install.steps.heading": "インストール",
	"install.steps.body":
		"パッケージマネージャーを選び、スタイルシートを設定して、最初のコンポーネントをレンダリングしましょう。",
	"install.step1.title": "パッケージをインストール",
	"install.step1.desc":
		"すべてのコンポーネントが 1 つのパッケージに含まれています。タブを切り替えて、お使いのパッケージマネージャー用のコマンドをコピーしてください。",
	"install.step2.title": "スタイルシートをインポート",
	"install.step2.desc": "Tailwind のインポート直後に FancyUI のスタイルシートを追加します。",
	"install.step2.caption": "グローバルスタイルシート（通常は src/app.css）に記述します。",
	"install.step3.title": "コンポーネントをレンダリング",
	"install.step3.desc": "パッケージルートからインポートして、マークアップに配置するだけです。",
	"install.tailwind.heading": "Tailwind CSS のセットアップ",
	"install.tailwind.body":
		"FancyUI は Tailwind CSS v4 上に構築されており、JavaScript の設定ファイルではなく CSS で設定します。プロジェクトで Tailwind がすでに動作していれば、追加の設定は不要です。",
	"install.tailwind.order":
		"インポートの順序が重要です: Tailwind を先に、FancyUI を後にすることで、FancyUI のレイヤーとカスタムプロパティがデフォルトの上に解決されます。",
	"install.tailwind.note":
		"このスタイルシートには、すべてのコンポーネントが参照するデザイントークン（色、角丸、アニメーションのタイミング）が含まれています。これがないと、コンポーネントはスタイルなしで表示されます。",
	"install.usage.heading": "使い方",
	"install.usage.body":
		"すべてのコンポーネントはパッケージルートの名前付きエクスポートなので、コンポーネントごとのインポートパスを覚える必要はありません。",
	"install.usage.note":
		"各コンポーネントのページには、プロパティ、ライブ例、アクセシビリティに関する注記が記載されています。",
	"install.typescript.heading": "TypeScript",
	"install.typescript.body":
		"prop の型は各コンポーネントと合わせてエクスポートされているため、ラッパーや共有プリセットに型を付けられます。",
	"install.typescript.note":
		"型はパッケージに同梱されています。別途インストールする型パッケージはありません。",
	"install.peerDeps.heading": "ピア依存関係",
	"install.peerDeps.body":
		"FancyUI は、次のパッケージがプロジェクトに既に存在することを前提としています:",
	"install.peerDeps.colPackage": "パッケージ",
	"install.peerDeps.colVersion": "バージョン",
	"install.peerDeps.bundled":
		"一部のコンポーネントは追加のランタイムライブラリを必要とします。これらはパッケージに同梱されているため、追加でインストールするものはありません:",
	"install.peerDeps.bundledNote": "これらは、使用するコンポーネントからのみ読み込まれます。",
	"install.nextSteps.heading": "次のステップ",
	"install.nextSteps.components.title": "コンポーネントを見る",
	"install.nextSteps.components.desc":
		"ライブプレビュー、プロパティ、コピー＆ペーストできる例を備えた {count} 個のコンポーネント。",
	"install.nextSteps.theming.title": "テーマ設定",
	"install.nextSteps.theming.desc":
		"デザイントークンを上書きして、ライトモードとダークモードの両方で、すべてのコンポーネントをブランドに合わせられます。",

	// Theming page
	"theming.metaTitle": "テーマ設定",
	"theming.title": "テーマ設定",
	"theming.lead":
		"すべての FancyUI コンポーネントは、OKLCh カラースペースの CSS カスタムプロパティから色、角丸、タイミングを読み取ります。トークンを上書きすれば、ライブラリ全体がそれに従います。",
	"theming.pill.oklch": "OKLCh カラースペース",
	"theming.pill.shadcn": "shadcn-svelte 互換",
	"theming.pill.dark": "ダークモード",
	"theming.pill.tokens": "デザイントークン",
	"theming.generator.body":
		"見た目で調整したいですか？ テーマジェネレーターならライブスライダーでこれらのトークンを調整し、CSS を渡してくれます。",
	"theming.generator.cta": "テーマジェネレーターを開く",
	"theming.cssSetup.heading": "CSS のセットアップ",
	"theming.cssSetup.body":
		"FancyUI のスタイルシートをアプリのグローバル CSS（通常は src/app.css）にインポートします:",
	"theming.colors.heading": "カラーシステム",
	"theming.colors.body":
		"すべての色は、知覚的に均一なグラデーションのために OKLCh カラースペースを使用します:",
	"theming.colors.note":
		"トークン名は shadcn-svelte の規則に従っているため、既存の shadcn テーマもそのまま使えます。",
	"theming.dark.heading": "ダークモード",
	"theming.dark.body":
		"ダークモードは、親要素に付けた .dark クラスで有効になります。FancyUI はすべてのトークンを上書きします:",
	"theming.motion.heading": "アニメーショントークン",
	"theming.motion.body": "アニメーションのタイミングをグローバルに制御します:",
	"theming.easing.heading": "イージング関数",
	"theming.easing.body":
		"イージングカーブもトークンで、すべてのコンポーネントのトランジションで共有されます:",
	"theming.rainbow.heading": "レインボーグラデーション",
	"theming.rainbow.body":
		"RainbowButton、GradientButton、その他のグラデーション効果で使用されます:",
	"theming.customizing.heading": "カスタマイズ",
	"theming.customizing.body": "見た目を変えるには、独自の CSS でトークンを上書きします:",
	"theming.customizing.note":
		"トークンはカスケードします。:root でグローバルに上書きするか、ラッパー要素に絞って単一セクションだけをテーマ設定できます。",
	"theming.nextSteps.heading": "次のステップ",
	"theming.nextSteps.generator.title": "テーマジェネレーター",
	"theming.nextSteps.generator.desc":
		"ライブスライダーで各トークンを調整し、完成した CSS をコピーします。",
	"theming.nextSteps.components.title": "コンポーネントを見る",
	"theming.nextSteps.components.desc":
		"コンポーネントギャラリー全体でトークンの働きを確認できます。",

	// Changelog page
	"changelog.metaTitle": "変更履歴",
	"changelog.title": "変更履歴",
	"changelog.lead": "FancyUI のすべてのリリースと変更内容を、新しい順に掲載しています。",
	"changelog.latest": "最新",
	"changelog.major": "メジャー変更",
	"changelog.minor": "マイナー変更",
	"changelog.patch": "パッチ変更",
} satisfies Catalog;

// Japanese (ja).
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
	"header.search": "検索…",
	"a11y.github": "GitHub",
	"a11y.changeTheme": "テーマを変更",
	"a11y.changeLanguage": "言語を変更",
	"theme.heading": "テーマ",
	"theme.system": "システム",
	"language.heading": "言語",

	// Command search
	"search.placeholder": "コンポーネントとページを検索…",
	"search.noResults": "結果が見つかりません",
	"search.esc": "ESC",
	"search.tryInstead": "代わりに次のいずれかをお試しください：",
	"jobs.heading": "目的から探す",
	"jobs.feedback": "フィードバックを返す",
	"jobs.input": "入力を受け取る",
	"jobs.attention": "視線を誘導する",
	"jobs.navigate": "ナビゲーションを作る",
	"jobs.progress": "進捗を表示する",
	"jobs.surprise": "エフェクトで驚かせる",

	// Component page
	"comp.preview": "プレビュー",
	"comp.code": "コード",
	"comp.installation": "インストール",
	"install.framework": "フレームワーク",
	"install.sourceOnly":
		"まだ npm では公開されていません。このフレームワーク版はリポジトリ内にあります。",
	"install.unavailable": "このフレームワーク向けのコンポーネントはまだありません。",
	"install.copySource": "ソースをコピー",
	"install.copySourceNote":
		"コンポーネントのソースコードをプロジェクトにコピーします。コピーしたコードは自由に編集・管理できます。",
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
	"table.event": "イベント",
	"table.payload": "ペイロード",
	"table.portName": "{framework} での名前",
	"table.portNameUnknown": "命名規則からは導けません。Svelte API との違いを参照してください。",
	"comp.events": "イベント",
	"comp.copyMarkdown": "Markdown としてコピー",

	// Copy buttons
	"action.copy": "コピー",
	"action.copied": "コピーしました！",

	// Table of contents
	"toc.onThisPage": "このページの内容",

	// Components gallery
	"gallery.title": "コンポーネント",
	"gallery.intro":
		"コンポーネントは Svelte 5、React、Vue で利用でき、Tailwind CSS v4 でスタイリングされ、TypeScript で型付けされています。各ページにはライブプレビューとコピー＆ペーストできる Svelte の使用例があり、React と Vue の使い方も用意されているものは掲載しています。パッケージを一度インストールすれば、あとはコードを自由に扱えます。",
	"gallery.filterPlaceholder": "コンポーネントを絞り込む…",
	"gallery.all": "すべて",
	"gallery.noMatch": "検索に一致するコンポーネントがありません。",
	"gallery.meta":
		"{components} 個のコンポーネント · {categories} カテゴリ · Svelte 5 · React · Vue · TypeScript",
	"gallery.results.other": "{count} 件の結果",
	"gallery.clearFilters": "フィルターをクリア",
	"gallery.clearSearch": "検索をクリア",
	"gallery.searchHint": "/ を押して検索",
	"gallery.groupLabel": "コンポーネントグループ",
	"gallery.categoryLabel": "カテゴリ",
	"gallery.desc.buttons": "ホバーや押下で豊かに動くインタラクティブなボタン",
	"gallery.desc.cards": "ポインターに反応するカードとコンテナ",
	"gallery.desc.backgrounds": "アニメーション付きの装飾的な背景",
	"gallery.desc.text": "テキストアニメーションとタイポグラフィ効果",
	"gallery.desc.layout": "レイアウトの基本要素と構造コンポーネント",
	"gallery.desc.feedback": "ツールチップ、トースト、ローダーなどのフィードバック",
	"gallery.desc.data-display": "リスト、タイムライン、データのコレクション",
	"gallery.desc.navigation": "メニュー、タブ、リンク、道案内",
	"gallery.desc.media": "画像、動画、メディアの表示",
	"gallery.desc.effects": "ビジュアルエフェクトと装飾的なモーション",
	"gallery.desc.ai-chat": "メッセージ、コンポーザー、スレッド、ストリーミングテキスト",
	"gallery.desc.ai-agents": "推論、ツール利用、プラン、人の確認を挟むカード",
	"gallery.desc.actions": "ボタン、トグルなどのアクション部品",
	"gallery.desc.forms": "ユーザー入力を受け取るための入力欄と基本要素",
	"gallery.desc.overlays": "ダイアログ、ポップオーバー、メニュー、シート",
	"gallery.desc.display": "バッジ、アバター、ステータス表示",
	"gallery.subtitle":
		"Svelte 5、React、Vue 向けの、美しいアニメーションを備えた {count} 個のコンポーネント。閲覧・検索して、必要なものを見つけられます。",

	// Theme-generator page
	"tg.metaDescription":
		"FancyUI の OKLCh デザイントークンをライブで調整し、CSS をアプリにコピーできます。",
	"tg.intro":
		"FancyUI のデザイントークンを調整すると、コンポーネントがリアルタイムに反応します。見た目が決まったら、生成された CSS をアプリのスタイルシート（例：src/app.css）にコピーしてください。色には OKLCh 色空間を、レインボーパレットには HSL を使用しています。トークンの詳しいリファレンスは<link>テーマ設定</link>を参照してください。",
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
	"tg.beamDesc": "ビームの色は {primary} → {accent} の順に変化します。",
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
	"category.ai-chat": "AI チャット",
	"category.ai-agents": "AI エージェント",

	// Introduction (redesigned page)
	"intro.title": "はじめに",
	"intro.metaTitle": "はじめに",
	"intro.pill.animation": "アニメーション重視",
	"intro.pill.copyPaste": "コピー＆ペーストに対応",
	"intro.pill.tailwind": "Tailwind CSS 4",
	"intro.pill.typescript": "TypeScript",
	"intro.philosophy.heading": "設計思想",
	"intro.philosophy.card2.title": "アニメーション重視",
	"intro.philosophy.card2.desc":
		"すべてのコンポーネントに、洗練されたアニメーションが標準で付属しています。",
	"intro.philosophy.card3.title": "コピー＆ペーストに対応",
	"intro.philosophy.card3.desc": "パッケージとして利用するか、ソースコードを直接コピーできます。",
	"intro.philosophy.card4.title": "Tailwind CSS 4",
	"intro.philosophy.card4.desc":
		"ユーティリティクラスと CSS カスタムプロパティでスタイリングされています。",
	"intro.philosophy.card5.title": "TypeScript",
	"intro.philosophy.card5.desc":
		"プロパティのインターフェースをエクスポートしており、完全な型安全性を提供します。",
	"intro.quickStart.heading": "クイックスタート",
	"intro.quickStart.step1.title": "インストール",
	"intro.quickStart.step1.desc": "FancyUI をプロジェクトに追加します。",
	"intro.quickStart.step2.title": "インポート",
	"intro.quickStart.step3.title": "使用",
	"intro.whatsIncluded.heading": "収録内容",
	"intro.whatsIncluded.body.other":
		"{count} 個のコンポーネントを {categories} のカテゴリに分けて収録しています：",
	"intro.category.buttons": "ボタン",
	"intro.category.cards": "カード",
	"intro.category.effects": "エフェクト",
	"intro.stats.buttons": "Rainbow、Ripple、Shimmer など。思わずクリックしたくなるボタン。",
	"intro.stats.cards": "カルーセル、ベントーグリッド、3D チルト。飽きさせないコンテンツ表現。",
	"intro.stats.effects": "カーソル、軌跡、アニメーションテキスト。違いを生む小さな演出。",
	"sidebar.starTitle": "GitHub でスターを付ける",
	"sidebar.starBody": "FancyUI が気に入ったら、スターをお願いします！",
	"rail.nextPage": "次のページ",
	"intro.nextSteps.heading": "次のステップ",
	"intro.nextSteps.installation": "インストール",
	"intro.nextSteps.theming": "テーマ設定",
	"intro.nextSteps.components": "コンポーネントを見る",
	"intro.cta.title": "FancyUI は初めてですか？",
	"intro.cta.body":
		"<b>テーマジェネレーター</b>で色をカスタマイズして、コンポーネントがリアルタイムに反応する様子を確かめてみてください。",
	"intro.cta.button": "テーマジェネレーターを試す",

	// Core components workspace (sidebar groups, categories, status)
	"group.core": "Core",
	"group.fancy": "Fancy",
	"category.actions": "アクション",
	"category.forms": "フォーム",
	"category.overlays": "オーバーレイ",
	"category.display": "表示要素",
	"status.inProgress": "開発中",

	// Installation (redesigned page)
	"install.metaTitle": "インストール",
	"install.title": "インストール",
	"install.lead":
		"FancyUI は 3 つのステップで SvelteKit プロジェクトに追加できます：パッケージをインストールし、スタイルシートをインポートして、コンポーネントをレンダリングするだけです。",
	"install.pill.svelte": "Svelte 5",
	"install.pill.tailwind": "Tailwind CSS 4",
	"install.pill.node": "Node.js 20.19+",
	"install.pill.typescript": "TypeScript",
	"install.prerequisites.heading": "前提条件",
	"install.prerequisites.body":
		"FancyUI は現行のツールチェーンを対象としています。インストール前にこの 3 点を確認してください。",
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
		"FancyUI の動作確認に使っている現行のビルドツールが、このバージョンを必要とします。",
	"install.steps.heading": "インストール",
	"install.steps.body":
		"パッケージマネージャーを選び、スタイルシートを読み込んでから、最初のコンポーネントをレンダリングします。",
	"install.step1.title": "パッケージをインストール",
	"install.step1.desc":
		"すべてのコンポーネントが 1 つのパッケージに含まれています。タブを切り替えて、お使いのパッケージマネージャー用のコマンドをコピーしてください。",
	"install.step2.title": "スタイルシートをインポート",
	"install.step2.desc": "Tailwind のインポートの直後に、FancyUI のスタイルシートを追加します。",
	"install.step2.caption": "グローバルスタイルシート（通常は src/app.css）に記述します。",
	"install.step3.title": "コンポーネントをレンダリング",
	"install.step3.desc": "パッケージのルートからインポートして、マークアップに配置するだけです。",
	"install.tailwind.heading": "Tailwind CSS のセットアップ",
	"install.tailwind.body":
		"FancyUI は Tailwind CSS v4 上に構築されています。v4 は JavaScript の設定ファイルではなく CSS で設定します。プロジェクトで Tailwind がすでに動作していれば、追加の設定は不要です。",
	"install.tailwind.order":
		"インポートの順序が重要です。先に Tailwind、次に FancyUI をインポートしてください。また、FancyUI のインポートは独自の @custom-variant dark より前に置いてください。後に置くと、独自の定義が FancyUI の定義で置き換えられます。",
	"install.tailwind.note":
		"このエントリは、既定のカラートークン（background、primary、border など）とダークバリアントを提供します。独自の :root ブロックと .dark ブロックはこれらを上書きするので、CSS 変数を再定義すれば独自の値が優先されます。",
	"install.usage.heading": "使い方",
	"install.usage.body":
		"すべてのコンポーネントはパッケージのルートから名前付きエクスポートされているため、コンポーネントごとのインポートパスを覚える必要はありません。",
	"install.usage.note":
		"各コンポーネントのページには、プロパティ、ライブの使用例、アクセシビリティに関する注記が掲載されています。",
	"install.typescript.heading": "TypeScript",
	"install.typescript.body":
		"プロパティの型は各コンポーネントと一緒にエクスポートされているため、ラッパーや共有プリセットにも型を付けられます。",
	"install.typescript.note":
		"型はパッケージに同梱されています。別途インストールする型パッケージはありません。",
	"install.peerDeps.heading": "ピア依存関係",
	"install.peerDeps.body":
		"FancyUI は、次のパッケージがプロジェクトにすでにあることを前提としています：",
	"install.peerDeps.colPackage": "パッケージ",
	"install.peerDeps.colVersion": "バージョン",
	"install.peerDeps.bundled":
		"一部のコンポーネントは追加のランタイムライブラリを必要とします。これらはパッケージに同梱されているため、追加でインストールするものはありません：",
	"install.peerDeps.bundledNote": "これらは、それを使うコンポーネントからのみ読み込まれます。",
	"install.nextSteps.heading": "次のステップ",
	"install.nextSteps.components.title": "コンポーネントを見る",
	"install.nextSteps.components.desc":
		"ライブプレビュー、プロパティ、コピー＆ペーストできる使用例を備えた {count} 個のコンポーネント。",
	"install.nextSteps.theming.title": "テーマ設定",
	"install.nextSteps.theming.desc":
		"デザイントークンを上書きして、ライトモードでもダークモードでも、すべてのコンポーネントをブランドに合わせられます。",

	// Theming page
	"theming.metaTitle": "テーマ設定",
	"theming.title": "テーマ設定",
	"theming.lead":
		"すべての FancyUI コンポーネントは、OKLCh 色空間で定義された CSS カスタムプロパティから色、角丸、タイミングを読み取ります。トークンを上書きすれば、ライブラリ全体がそれに従います。",
	"theming.pill.oklch": "OKLCh 色空間",
	"theming.pill.shadcn": "標準的なトークン名",
	"theming.pill.dark": "ダークモード",
	"theming.pill.tokens": "デザイントークン",
	"theming.generator.body":
		"視覚的に調整したい場合は、テーマジェネレーターを使えます。ライブスライダーでこれらのトークンを調整し、そのまま CSS を書き出せます。",
	"theming.generator.cta": "テーマジェネレーターを開く",
	"theming.cssSetup.heading": "CSS のセットアップ",
	"theming.cssSetup.body":
		"FancyUI のスタイルシートを、アプリのグローバル CSS（通常は src/app.css）でインポートします：",
	"theming.colors.heading": "カラーシステム",
	"theming.colors.body":
		"知覚的に均一なグラデーションを得るため、すべての色に OKLCh 色空間を使用しています：",
	"theming.colors.note":
		"トークン名は広く使われているセマンティックな命名規則（background、foreground、primary など）に従っているため、同じ変数名を使う既存のテーマもそのまま使えます。",
	"theming.dark.heading": "ダークモード",
	"theming.dark.body":
		"ダークモードは既定で OS の設定に従います。<html> または任意の祖先要素に .dark クラスを付けるとダークに、.light を付けるとライトに固定され、dark: ユーティリティとすべてのトークンもそれに従います。ダークの値をカスタマイズするには、.dark の下で上書きします：",
	"theming.motion.heading": "アニメーショントークン",
	"theming.motion.body": "アニメーションのタイミングをグローバルに制御します：",
	"theming.easing.heading": "イージング関数",
	"theming.easing.body":
		"イージングカーブもトークンで、すべてのコンポーネントのトランジションで共有されます：",
	"theming.rainbow.heading": "レインボーグラデーション",
	"theming.rainbow.body": "RainbowButton、GradientButton などのグラデーション効果で使用されます：",
	"theming.customizing.heading": "カスタマイズ",
	"theming.customizing.body": "見た目を変えるには、独自の CSS でトークンを上書きします：",
	"theming.customizing.note":
		"トークンはカスケードします。:root でグローバルに上書きすることも、ラッパー要素に限定して特定のセクションだけにテーマを適用することもできます。",
	"theming.nextSteps.heading": "次のステップ",
	"theming.nextSteps.generator.title": "テーマジェネレーター",
	"theming.nextSteps.generator.desc":
		"ライブスライダーですべてのトークンを調整し、完成した CSS をコピーできます。",
	"theming.nextSteps.components.title": "コンポーネントを見る",
	"theming.nextSteps.components.desc":
		"コンポーネントギャラリー全体で、トークンが実際にどう働くかを確認できます。",

	// Changelog page
	"changelog.metaTitle": "変更履歴",
	"changelog.title": "変更履歴",
	"changelog.lead": "FancyUI のすべてのリリースと変更内容を、新しい順に掲載しています。",
	"changelog.latest": "最新",
	"changelog.major": "メジャー変更",
	"changelog.minor": "マイナー変更",
	"changelog.patch": "パッチ変更",
	// Cameleon docs skins
	"skin.heading": "スキン",
	"skin.standard": "スタンダード",
	"skin.brutal": "Brutal",
	"skin.retroOs": "Retro OS",
	"skin.beta": "ベータ",
	"a11y.changeSkin": "スキンを変更",
	"a11y.sound": "サウンド",
	"retro.explorer": "エクスプローラー",
	"retro.start": "スタート",
	"retro.tagline":
		"Svelte 5 向けのアニメーションコンポーネント。コピー＆ペーストですぐに使えます。",
	"comp.snippetSvelteOnly":
		"このフレームワーク向けの完全な使用例はまだありません。現時点では Svelte 版のみ用意されています。",
	"comp.copyMarkdownSvelte": "Markdown としてコピー（Svelte）",
	"comp.markdownSvelteOnly": "Markdown エクスポートは Svelte 版のみを対象としています。",
	"comp.apiNoticeReact":
		"この API リファレンスは Svelte での名前を使っています。React では、class は className に、on* ハンドラーはキャメルケース（onclick は onClick）に、スニペットは ReactNode 型のプロパティまたはレンダー関数になります。",
	"comp.apiNoticeVue":
		"この API リファレンスは Svelte での名前を使っています。Vue では、スニペットはスロットに、バインド可能なプロパティは v-model:name になります。",
	"comp.apiNoticeLink": "Svelte API との違い",
	"install.lead.react":
		"FancyUI は 3 つのステップで React プロジェクトに追加できます：パッケージをインストールし、スタイルシートをインポートして、コンポーネントをレンダリングするだけです。",
	"install.lead.vue":
		"FancyUI は 3 つのステップで Vue プロジェクトに追加できます：パッケージをインストールし、スタイルシートをインポートして、コンポーネントをレンダリングするだけです。",
	"install.pill.react": "React 18+",
	"install.pill.vue": "Vue 3.5+",
	"install.prerequisites.card1.title.react": "React",
	"install.prerequisites.card1.version.react": "18 / 19",
	"install.prerequisites.card1.desc.react":
		"React 18 と 19 に対応しています。コンポーネントはクライアントモジュールとして配布されるため、Server Components から直接インポートできます。",
	"install.prerequisites.card1.title.vue": "Vue",
	"install.prerequisites.card1.version.vue": "3.5+",
	"install.prerequisites.card1.desc.vue":
		"コンポーネントは Vue 3.5 のシングルファイルコンポーネントのため、Vue 3.5.2 以降が必要です。",

	// Docs audit: framework-neutral Introduction and Installation copy
	"intro.pill.frameworks": "Svelte 5・React・Vue",
	"intro.philosophy.card1.title": "Svelte・React・Vue",
	"intro.philosophy.card1.desc":
		"フレームワークごとにネイティブで書かれています。Svelte では runes、React では hooks、Vue では Composition API を使っています。",
	"intro.quickStart.step3.desc": "コンポーネントの中に配置するだけです。",
	"install.peerDeps.optional": "任意",

	// Docs audit: chrome, contribution, status, recipes, errors, SEO
	"a11y.skipToContent": "本文へスキップ",
	"a11y.docsBreadcrumb": "ドキュメントのパンくずリスト",
	"a11y.prevNext": "前後のページ",
	"a11y.search": "検索",
	"search.a11y.close": "検索を閉じる",
	"nav.backToSite": "FancyUI のホームに戻る",
	"nav.recipes": "レシピ",
	"footer.contribute": "コントリビュート",
	"footer.issues": "Issue",
	"footer.discussions": "ディスカッション",
	"footer.security": "セキュリティ",
	"footer.conduct": "行動規範",
	"footer.changelog": "変更履歴",
	"footer.versions": "バージョン",
	"footer.install": "インストール",
	"footer.license": "MIT ライセンス",
	"comp.editPage": "このページを編集",
	"comp.reportIssue": "問題を報告",
	"comp.issueTitle": "[docs] {name}",
	"intro.lead":
		"は、Svelte 5、React、Vue 向けのアニメーション付きインタラクティブ UI コンポーネント <grad>{count}</grad> 個からなるコレクションです。すべて共通のデザイントークンの上に構築されています。",
	"intro.importHint":
		"必要なコンポーネントをインポートします。インポートパスはお使いのフレームワークによって異なります。",
	"install.kitOptional":
		"SvelteKit は必須ではありません。FancyUI は、Vite でビルドする Svelte 5 プロジェクトであれば動作します。",
	"theming.cssPerFramework":
		"お使いのフレームワーク用のスタイルシートをインポートします。スタイルシートはパッケージごとに同梱されています。",
	"status.planned": "計画中",
	"status.deprecated": "非推奨",
	"comp.sinceVersion": "v{version} で追加",
	"comp.deprecatedNotice":
		"このコンポーネントは非推奨で、今後のリリースで削除される可能性があります。",
	"comp.inspiredByNoLink": "インスピレーション元：{name}",
	"recipes.title": "レシピ",
	"recipes.lead":
		"複数のコンポーネントを組み合わせて完成したインターフェースを作る、ステップごとの構成例です。",
	"recipes.components": "コンポーネント数：{count}",
	"error.notFoundTitle": "ページが見つかりません",
	"error.genericTitle": "問題が発生しました",
	"error.notFoundBody": "お探しのページは存在しないか、移動した可能性があります。",
	"error.genericBody":
		"予期しないエラーが発生しました。もう一度お試しいただくか、ドキュメントに戻ってください。",
	"error.unauthorizedTitle": "サインインが必要です",
	"error.unauthorizedBody": "このページを利用するにはサインインが必要です。",
	"error.home": "ホームに戻る",
	"error.browse": "コンポーネントを見る",
	"error.search": "ドキュメントを検索",
	"error.report": "リンク切れを報告",
	"comp.previewFailed": "このプレビューを読み込めませんでした。",
	"demo.noPreview": "このコンポーネントのプレビューはまだありません。",
	"demo.notFound": "コンポーネントが見つかりません。",
	"recipes.steps": "手順",
	"recipes.pitfalls": "よくある落とし穴",
	"recipes.componentsUsed": "使用しているコンポーネント",
	"seo.installation":
		"FancyUI を Svelte 5、React、Vue にインストールする方法。パッケージを追加し、スタイルシートをインポートして、最初のコンポーネントをレンダリングします。",
	"seo.theming":
		"デザイントークンで FancyUI をカスタマイズ。OKLCh の色、角丸、モーション、ダークモードを Svelte 5、React、Vue で調整できます。",
	"seo.themeGenerator":
		"FancyUI の OKLCh デザイントークンをリアルタイムに調整し、生成された CSS をアプリにコピーできます。",
	"seo.changelog": "Svelte 5、React、Vue 向け FancyUI パッケージのリリースノートです。",
} satisfies Catalog;

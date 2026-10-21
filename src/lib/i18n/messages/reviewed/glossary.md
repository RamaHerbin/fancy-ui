# Docs glossary

The agreed rendering of the recurring terms in the docs UI, per locale. A reviewer
applies it consistently across the whole catalog (a term must read the same in the
sidebar, the tables, the buttons and the sentences) and reports a term that cannot
work in context instead of improvising a second rendering.

The renderings below are proposals prepared with the infrastructure, based on what
the catalogs already used. A reviewer may correct one: change the table in the same
pull request as the catalog, and say why in the report.

## Stays as written, in every locale

`FancyUI`, `GitHub`, `npm`, `pnpm`, `CLI`, `Tailwind CSS`, `Svelte 5`, `React`, `Vue`,
`TypeScript`, `OKLCh`, `HSL`, `Node.js`, and every code identifier, file path, CSS
variable, prop name and import line. Do not translate them, do not inflect them, do
not put them in quotation marks. In `ja`, `zh-Hans`, `ko`, `ar` and `fa` they stay in
Latin script; follow the spacing convention of the language around them (a thin gap
in `ja`/`zh-Hans`, an ordinary space elsewhere).

## Terms

| English              | fr                    | de                 | es                      | it                       | pt (BR)               |
| -------------------- | --------------------- | ------------------ | ----------------------- | ------------------------ | --------------------- |
| component            | composant             | Komponente         | componente              | componente               | componente            |
| prop                 | propriété             | Prop (pl. Props)   | prop                    | prop                     | propriedade           |
| slot                 | slot                  | Slot               | slot                    | slot                     | slot                  |
| event                | événement             | Ereignis           | evento                  | evento                   | evento                |
| design token / token | jeton de design       | Design-Token       | token de diseño         | design token             | token de design       |
| theme                | thème                 | Theme              | tema                    | tema                     | tema                  |
| skin                 | skin                  | Skin               | skin                    | skin                     | skin                  |
| preview              | aperçu                | Vorschau           | vista previa            | anteprima                | pré-visualização      |
| copy source          | copier le code source | Quellcode kopieren | copiar el código fuente | copia il codice sorgente | copiar o código-fonte |
| registry             | registre              | Registry           | registro                | registro                 | registro              |
| framework            | framework             | Framework          | framework               | framework                | framework             |

| English              | pl                   | cs                      | ja               | ko          | zh-Hans    |
| -------------------- | -------------------- | ----------------------- | ---------------- | ----------- | ---------- |
| component            | komponent            | komponenta              | コンポーネント   | 컴포넌트    | 组件       |
| prop                 | właściwość           | vlastnost               | プロパティ       | 속성        | 属性       |
| slot                 | slot                 | slot                    | スロット         | 슬롯        | 插槽       |
| event                | zdarzenie            | událost                 | イベント         | 이벤트      | 事件       |
| design token / token | token projektowy     | design token            | デザイントークン | 디자인 토큰 | 设计令牌   |
| theme                | motyw                | motiv                   | テーマ           | 테마        | 主题       |
| skin                 | skórka               | vzhled                  | スキン           | 스킨        | 皮肤       |
| preview              | podgląd              | náhled                  | プレビュー       | 미리보기    | 预览       |
| copy source          | skopiuj kod źródłowy | zkopírovat zdrojový kód | ソースをコピー   | 소스 복사   | 复制源代码 |
| registry             | rejestr              | registr                 | レジストリ       | 레지스트리  | 注册表     |
| framework            | framework            | framework               | フレームワーク   | 프레임워크  | 框架       |

| English              | hi                  | id                | tr                    | ar                   | fa          |
| -------------------- | ------------------- | ----------------- | --------------------- | -------------------- | ----------- |
| component            | कंपोनेंट            | komponen          | bileşen               | مكوّن                | کامپوننت    |
| prop                 | प्रॉप               | prop              | özellik               | خاصية                | پراپ        |
| slot                 | स्लॉट               | slot              | slot                  | فتحة                 | اسلات       |
| event                | इवेंट               | event             | olay                  | حدث                  | رویداد      |
| design token / token | डिज़ाइन टोकन        | token desain      | tasarım belirteci     | رمز التصميم          | توکن طراحی  |
| theme                | थीम                 | tema              | tema                  | سمة                  | تم          |
| skin                 | स्किन               | skin              | görünüm               | مظهر                 | پوسته       |
| preview              | प्रीव्यू            | pratinjau         | önizleme              | معاينة               | پیش‌نمایش   |
| copy source          | सोर्स कोड कॉपी करें | salin kode sumber | kaynak kodunu kopyala | نسخ الشيفرة المصدرية | کپی کد منبع |
| registry             | रजिस्ट्री           | registri          | kayıt defteri         | السجلّ               | رجیستری     |
| framework            | फ़्रेमवर्क          | framework         | framework             | إطار العمل           | فریم‌ورک    |

Notes on the table:

- **component** names a unit of the library (`RainbowButton`, `BorderBeam`), never the
  word "element". The plural follows the language's own plural rules (see
  CONTRIBUTING.md, plural messages).
- **prop**, **slot**, **event** are the API vocabulary used in the tables. Where the
  language keeps the English word (`slot`, `skin`, `framework`) keep it in lower case
  unless the language capitalizes common nouns (`de`).
- **design token** is the CSS custom property that carries a design decision (a color,
  a radius, a duration). Do not use the same word for a text or security token.
- **theme** is the set of tokens (light, dark, brand); **skin** is the visual style of
  the docs site chrome (standard, brutal, retro). They must never share a word in one
  language (`fa`: theme `تم`, skin `پوسته`).
- **copy source** is the action that copies the component's source code into the
  reader's project; the reader then owns the code. Never render it as "copy and
  paste the page" or as a package install.
- **registry** is the catalog the copy-source tools read from; it is not an operating-system
  registry, a notary's register or a package index.
- The `jobs.*` labels (browse by what you need) and the `category.*` labels must share
  their vocabulary: if the category is "Feedback", the job "Give feedback" uses the
  same noun or verb family in that language.
- A credit line ("Inspired by …") is a courtesy credit. Never render it as "ported
  from", "copied from" or "based on the code of".

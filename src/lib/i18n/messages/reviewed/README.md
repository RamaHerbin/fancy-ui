# Review manifests

This folder records which translations a native reviewer has read.

- `<code>.json` (one per locale, for example `fr.json`) maps every message key of the
  locale to `sha1(English text)`: the English the reviewer translated from. The file
  is written by `node scripts/i18n-manifest.mjs <code>`, never by hand.
- `glossary.md` is the agreed rendering of the recurring terms, per locale.

A locale without a manifest is a draft: `src/lib/i18n/catalog-quality.test.ts` only
warns about it (every locale not yet in `REVIEWED_LOCALES`). As soon as the manifest exists the locale is
reviewed and strict, and the test also fails on the style checks (untranslated,
punctuation, script hygiene, length). The reviewed locales are pinned in
`REVIEWED_LOCALES` in the test, so a manifest cannot be deleted silently; the pull
request that lands a new manifest adds its code there. The manifest check fails when:

- a key of the catalog is missing from the manifest (added, never read),
- the English of a key changed after the review (the stored hash no longer matches),
- the manifest lists a key the catalog no longer has,
- the catalog still starts with the `machine-translated draft` header line.

A plural message (`<base>.one`, `<base>.other`, …) hashes every English variant of the
group together, so editing any of them marks all of the locale's variants stale.

## Reviewer checklist

1. Read the whole catalog against the current `en.ts`, `messages/context.json` (context
   and length budget per key) and `glossary.md`; the register for your language is in
   CONTRIBUTING.md, "Docs translations (i18n)".
2. Fix what is wrong in `messages/<code>.ts`. Keep placeholders and tags intact. English
   that is ambiguous is reported, not corrected in the translation.
3. Remove the header line `// <Language> (<code>) — machine-translated draft…`.
4. `node scripts/i18n-manifest.mjs <code>` (it refuses while the header is still there),
   then `node scripts/i18n-manifest.mjs <code> --check`.
5. `I18N_STRICT=<code> pnpm vitest run src/lib/i18n/catalog-quality.test.ts -t "catalog <code>"`,
   then `pnpm check`, `pnpm check:i18n`, `pnpm test`.

A reviewer's pull request touches exactly two files: `messages/<code>.ts` and
`messages/reviewed/<code>.json`.

## Known draft defects (reviewer seeds)

The drafts are mechanical: a fragment-keyed sentence was merged into one message and the
old word order was kept. These are known and must be fixed by the reviewer of the
locale, on top of the checklist above.

- `tg.intro` (`see <link>…</link>.`) keeps the English order, which is wrong in `ko`
(should read `<link>테마 설정</link>을 확인하세요.`), `fa` (`به <link>…</link> مراجعه
کنید.`) and `hi` (`<link>थीमिंग</link> देखें।`). The link text is also in the wrong
case in `cs` (`v <link>Vzhled</link>`, needs the locative) and `pl` (`w
  <link>Motywy</link>`). In `ja` and `zh-Hans` there is a space after `。` and the final
  `.` is half-width (the script hygiene check flags it).
- `tg.beamDesc` (`{primary} → {accent}`): in `ar` and `fa` use `←`; the arrow is not
  mirrored in a right-to-left paragraph.
- `intro.whatsIncluded.body.*` is plural on `{count}` only, but the noun after
  `{categories}` also agrees with the number in `ar`, `pl` and `cs`. Rephrase freely
  (`… in categories: {categories}`) so no inflected noun is needed.
- `intro.lead`: in `ko` and `ja` the message starts with a particle (`는 …`, `は、…`),
  and the page renders `<strong>FancyUI</strong>` followed by a space before it, so `ko`
  shows `FancyUI 는`. The page or the message must close that gap (the Introduction page
  is owned by the docs-content mission).
- `cs`/`fa` terminology: see the notes under the glossary table (`page.theming`,
  `skin.heading`).
- `zh-Hans`: `注册表` is the Windows Registry; use the glossary's `组件注册中心`.
  `tr`: replace `kayıt defteri` by `registry` wherever the catalog uses it.

## When the English changes

Changing the English text of a key makes it stale in every locale's manifest, which is
the intent: each reviewer re-reads that key. `node scripts/i18n-manifest.mjs <code> --check`
lists the keys that are "not reviewed" or whose "English changed". After the catalogs are
updated, the reviewer reruns `node scripts/i18n-manifest.mjs <code>`; the script rewrites the hashes
for the whole catalog, so re-read the keys listed by the failing test before running it.

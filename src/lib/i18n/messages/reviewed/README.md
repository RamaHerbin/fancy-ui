# Review manifests

This folder records which translations a native reviewer has read.

- `<code>.json` (one per locale, for example `fr.json`) maps every message key of the
  locale to `sha1(English text)`: the English the reviewer translated from. The file
  is written by `node scripts/i18n-manifest.mjs <code>`, never by hand.
- `glossary.md` is the agreed rendering of the recurring terms, per locale.

A locale without a manifest is a draft: `src/lib/i18n/catalog-quality.test.ts` only
warns about it. As soon as the manifest exists the locale is reviewed, and the test
fails when:

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

## When the English changes

Changing the English text of a key makes it stale in every locale's manifest, which is
the intent: each reviewer re-reads that key. After the catalogs are updated, the
reviewer reruns `node scripts/i18n-manifest.mjs <code>`; the script rewrites the hashes
for the whole catalog, so re-read the keys listed by the failing test before running it.

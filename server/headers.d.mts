/**
 * @typedef {{ key: string, value: string }} Header
 * @typedef {{ pattern: RegExp, headers: Header[] }} HeaderRule
 */
/**
 * A `source` of vercel.json as a RegExp. The patterns in use are literal paths
 * with regex groups (`/(llms|llms-full).txt`, `/r/(.*)`): a dot is literal
 * unless it is the `.` of `.*`.
 *
 * @param {string} source
 * @returns {RegExp}
 */
export function sourceToRegExp(source: string): RegExp;
/**
 * Reads the `headers` rules of a vercel.json file.
 *
 * @param {string | URL} configFile path or file URL
 * @returns {HeaderRule[]}
 */
export function loadHeaderRules(configFile: string | URL): HeaderRule[];
/**
 * The headers every matching rule sets for a pathname.
 *
 * @param {HeaderRule[]} rules
 * @param {string} pathname
 * @returns {[string, string][]}
 */
export function headersFor(rules: HeaderRule[], pathname: string): [string, string][];
export type Header = {
    key: string;
    value: string;
};
export type HeaderRule = {
    pattern: RegExp;
    headers: Header[];
};

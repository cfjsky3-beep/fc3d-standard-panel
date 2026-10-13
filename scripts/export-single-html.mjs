import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const buildDirectory = resolve(process.cwd(), "vercel-dist");
const outputFile = resolve(process.argv[2] ?? "时时彩快三标准盘原型.html");
const entryFile = resolve(buildDirectory, "index.html");
const entryHtml = await readFile(entryFile, "utf8");

const scriptMatch = entryHtml.match(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*><\/script>/i);
const styleMatch = entryHtml.match(/<link\b[^>]*\brel=["']stylesheet["'][^>]*\bhref=["']([^"']+)["'][^>]*>/i)
  ?? entryHtml.match(/<link\b[^>]*\bhref=["']([^"']+)["'][^>]*\brel=["']stylesheet["'][^>]*>/i);

if (!scriptMatch || !styleMatch) {
  throw new Error("未找到 Vite 构建产物中的 JS 或 CSS 入口。");
}

const assetPath = (publicPath) => resolve(buildDirectory, `.${publicPath}`);
const [javascriptSource, cssSource] = await Promise.all([
  readFile(assetPath(scriptMatch[1]), "utf8"),
  readFile(assetPath(styleMatch[1]), "utf8"),
]);

// HTML raw-text elements terminate on a literal closing tag. Escaping the slash
// keeps strings inside bundled JS/CSS from accidentally ending the element.
const safeJavascript = javascriptSource.replace(/<\/script/gi, "<\\/script");
const safeCss = cssSource.replace(/<\/style/gi, "<\\/style");

const standaloneHtml = entryHtml
  // Function replacers are mandatory here: replacement strings interpret $&,
  // $`, $' and $$ tokens, which corrupts minified React bundles.
  .replace(scriptMatch[0], () => `<script type="module">${safeJavascript}</script>`)
  .replace(styleMatch[0], () => `<style>${safeCss}</style>`);

const openingScripts = standaloneHtml.match(/<script\b/gi)?.length ?? 0;
const closingScripts = standaloneHtml.match(/<\/script>/gi)?.length ?? 0;
const openingStyles = standaloneHtml.match(/<style\b/gi)?.length ?? 0;
const closingStyles = standaloneHtml.match(/<\/style>/gi)?.length ?? 0;

// A React DOM compatibility branch intentionally contains the harmless text
// "<script><\/script>". Only an extra literal closing tag can truncate the
// surrounding raw-text element, so closing-tag counts are the safety boundary.
if (!standaloneHtml.includes('<script type="module">') || closingScripts !== 1 || openingStyles !== 1 || closingStyles !== 1) {
  throw new Error(`内联后标签数量异常：script ${openingScripts}/${closingScripts}, style ${openingStyles}/${closingStyles}`);
}
if (/\b(?:src|href)=["']\/assets\//i.test(standaloneHtml)) {
  throw new Error("单文件中仍存在外部 assets 引用。");
}
if (!standaloneHtml.includes("$$typeof")) {
  throw new Error("React $$typeof 标记缺失，文件可能在生成过程中被替换。");
}

await writeFile(outputFile, standaloneHtml, "utf8");
console.log(outputFile);
console.log(`bytes=${Buffer.byteLength(standaloneHtml)} script=${openingScripts}/${closingScripts} style=${openingStyles}/${closingStyles}`);

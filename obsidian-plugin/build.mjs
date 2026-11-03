import esbuild from "esbuild";
import { copyFile, mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import postcss from "postcss";

const here = dirname(fileURLToPath(import.meta.url));
const output = join(here, "dist");
await mkdir(output, { recursive: true });
await esbuild.build({
  entryPoints: [join(here, "main.tsx")],
  outfile: join(output, "main.js"),
  bundle: true,
  platform: "browser",
  format: "cjs",
  target: "es2022",
  external: ["obsidian"],
  loader: { ".ttf": "dataurl" },
  minify: true,
  define: { __OBSIDIAN_PLUGIN__: "true" },
  sourcemap: false,
  logLevel: "info",
});
const bundledCss = await readFile(join(output, "main.css"), "utf8");
const css = postcss.parse(bundledCss);
const scope = ":where(.decision-map-obsidian-root, .decision-map-embed-editor)";
css.walkRules((rule) => {
  // Keyframe selectors are animation steps, not document selectors.
  if (rule.parent?.type === "atrule" && /keyframes$/i.test(rule.parent.name)) return;
  rule.selectors = rule.selectors.map((selector) => {
    const trimmed = selector.trim();
    // Context menus are rendered through a React portal directly under
    // document.body. Keep their collision-safe selectors global or the
    // scoped rules can never match inside Obsidian.
    if (trimmed.startsWith(".decision-map-context-") || trimmed.startsWith(".decision-map-color-picker")) return trimmed;
    if (/^(?::root|html|body|#root)$/.test(trimmed)) return scope;
    return `${scope} ${trimmed}`;
  });
});
const pluginCss = await readFile(join(here, "plugin.css"), "utf8");
await writeFile(join(output, "styles.css"), `${css.toString()}\n${pluginCss}`);
// Keep the generated package limited to Obsidian's required files.
await unlink(join(output, "main.css"));
await copyFile(join(here, "manifest.json"), join(output, "manifest.json"));

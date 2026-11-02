import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import postcss from "postcss";

test("Obsidian bundle cannot style the rest of the vault", async () => {
  const bundled = await readFile(new URL("./dist/styles.css", import.meta.url), "utf8");
  const css = postcss.parse(bundled);
  const scope = ":where(.decision-map-obsidian-root, .decision-map-embed-editor)";
  let checked = 0;
  css.walkRules((rule) => {
    if (rule.parent?.type === "atrule" && /keyframes$/i.test(rule.parent.name)) return;
    for (const selector of rule.selectors) {
      assert.ok(
        selector.startsWith(scope) || selector.startsWith(".decision-map-"),
        `Unscoped selector: ${selector}`,
      );
      checked++;
    }
  });
  assert.ok(checked > 100, "Expected to check the application stylesheet");
  assert.match(bundled, /\.workspace-tabs/);
});

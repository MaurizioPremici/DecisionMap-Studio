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
  assert.match(
    bundled,
    /\.decision-map-context-menu\s*\{[^}]*position:\s*fixed\s*!important/,
    "The body-level context menu must retain its global fixed positioning",
  );
  assert.doesNotMatch(
    bundled,
    /:where\([^}]+\)\s+\.decision-map-context-menu/,
    "The body-level context menu must not be scoped below the editor root",
  );
});

test("canvas context menu uses a native capture listener", async () => {
  const [canvas, studioNode] = await Promise.all([
    readFile(new URL("../src/components/EditorCanvas.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/StudioNode.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(
    canvas,
    /addEventListener\("contextmenu",\s*openContextMenu,\s*true\)/,
    "The canvas must intercept right clicks before React Flow and Obsidian",
  );
  assert.match(canvas, /stopImmediatePropagation\(\)/);
  assert.match(canvas, /\[data-decision-map-node-id\]/);
  assert.match(studioNode, /data-decision-map-node-id=\{id\}/);
  assert.match(
    canvas,
    /addEventListener\("contextmenu",\s*openContextMenu,\s*true\)[\s\S]*?\}, \[\]\);/,
    "The listener must remain installed while a right click changes selection",
  );
});

test("every visible context-menu command has an App handler", async () => {
  const [menu, app] = await Promise.all([
    readFile(new URL("../src/components/ContextMenu.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/App.tsx", import.meta.url), "utf8"),
  ]);
  const commands = [...menu.matchAll(/\["([A-Za-z]+)",\s*"[^"]+"\]/g)].map(
    (match) => match[1],
  );
  assert.ok(commands.length >= 15, "Expected the full node and canvas menus");
  for (const command of new Set(commands)) {
    assert.match(
      app,
      new RegExp(`case ["']${command}["']:`),
      `Missing handler for context-menu command: ${command}`,
    );
  }
});

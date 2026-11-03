import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { test } from "node:test";
import postcss from "postcss";
import ts from "typescript";

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
    /document\.addEventListener\("contextmenu",\s*openContextMenu,\s*true\)/,
    "The canvas must intercept right clicks before React Flow and Obsidian",
  );
  assert.match(canvas, /!host\.contains\(target\)/);
  assert.match(canvas, /stopImmediatePropagation\(\)/);
  assert.match(canvas, /\[data-decision-map-node-id\]/);
  assert.match(canvas, /document\.elementsFromPoint\(event\.clientX, event\.clientY\)/);
  assert.match(studioNode, /data-decision-map-node-id=\{id\}/);
  assert.match(
    canvas,
    /document\.addEventListener\("contextmenu",\s*openContextMenu,\s*true\)[\s\S]*?\}, \[\]\);/,
    "The listener must remain installed while a right click changes selection",
  );
});

test("the full node face accepts pointer events", async () => {
  const css = await readFile(new URL("../src/styles.css", import.meta.url), "utf8");
  assert.match(css, /\.node-face\s*\{[\s\S]*?pointer-events:\s*auto;/);
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

test("every visible editor control is wired to an interaction", async () => {
  const componentDirectory = new URL("../src/components/", import.meta.url);
  const componentNames = (await readdir(componentDirectory)).filter((name) =>
    name.endsWith(".tsx"),
  );
  const missing = [];
  for (const name of componentNames) {
    const source = await readFile(new URL(name, componentDirectory), "utf8");
    const file = ts.createSourceFile(
      name,
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    const visit = (node) => {
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        const tag = node.tagName.getText(file);
        const attributes = new Set(
          node.attributes.properties
            .filter(ts.isJsxAttribute)
            .map((attribute) => attribute.name.getText(file)),
        );
        const line =
          file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1;
        if (
          tag === "button" &&
          !attributes.has("onClick") &&
          !attributes.has("onPointerDown")
        )
          missing.push(`${name}:${line} button`);
        if (
          ["input", "select", "textarea"].includes(tag) &&
          !attributes.has("onChange") &&
          !attributes.has("readOnly") &&
          !attributes.has("disabled")
        )
          missing.push(`${name}:${line} ${tag}`);
      }
      ts.forEachChild(node, visit);
    };
    visit(file);
  }
  assert.deepEqual(missing, []);
});

test("the Obsidian toolbar exposes every core command through App", async () => {
  const app = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");
  for (const handler of [
    "onAdd",
    "onText",
    "onArrow",
    "onLine",
    "onNote",
    "onImage",
    "onDelete",
    "onDuplicate",
    "onUndo",
    "onRedo",
    "onFit",
    "onZoomIn",
    "onZoomOut",
    "onToggleLock",
    "onLayout",
    "onDirection",
    "onExport",
    "onToggleGrid",
    "onToggleSnap",
    "onWorkspace",
    "onHide",
  ])
    assert.match(app, new RegExp(`${handler}=`), `${handler} is not connected`);
});

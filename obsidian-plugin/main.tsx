import { createRoot, type Root } from "react-dom/client";
import {
  MarkdownRenderChild,
  Notice,
  Plugin,
  TextFileView,
  TFile,
  type Editor,
  type WorkspaceLeaf,
} from "obsidian";
import App from "../src/App";
import { emptyProject, type MapDocument } from "../src/types";
import { validateDocument } from "../src/lib/tree";
import "../src/styles.css";
import "../src/dialogs.css";
import "../src/interactions.css";
import "../src/themeControls.css";

const VIEW_TYPE = "decision-map-studio-view";
const EXTENSION = "dmap";

class DecisionMapView extends TextFileView {
  private root: Root | null = null;
  private current: MapDocument | null = null;

  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
    this.contentEl.addClass("decision-map-obsidian-view");
  }
  getViewType() { return VIEW_TYPE; }
  getDisplayText() { return this.file?.basename ?? "Decision Map"; }
  getIcon() { return "waypoints"; }
  getViewData() { return this.data ?? ""; }

  setViewData(data: string, clear: boolean) {
    if (!clear && data === this.data && this.current) return;
    this.data = data;
    let document: MapDocument;
    try {
      document = validateDocument(JSON.parse(data));
    } catch {
      this.clear();
      this.contentEl.createEl("p", { text: "This Decision Map file is invalid. Its original contents have not been changed." });
      return;
    }
    this.current = document;
    if (clear) this.root?.unmount();
    if (clear) this.root = null;
    if (!this.root) {
      this.contentEl.empty();
      const mount = this.contentEl.createDiv({ cls: "decision-map-obsidian-root" });
      this.root = createRoot(mount);
    }
    this.root.render(<App
      key={`${document.id}:${document.updatedAt}`}
      initialDocument={document}
      onDocumentChange={(next: MapDocument) => {
        const serialized = JSON.stringify(next, null, 2);
        if (serialized === this.data) return;
        this.current = next;
        this.data = serialized;
        this.requestSave();
      }}
    />);
  }

  clear() {
    this.root?.unmount();
    this.root = null;
    this.current = null;
    this.contentEl.empty();
  }

  async onClose() {
    this.clear();
    await super.onClose();
  }
}

export default class DecisionMapPlugin extends Plugin {
  async onload() {
    this.registerView(VIEW_TYPE, leaf => new DecisionMapView(leaf));
    this.registerExtensions([EXTENSION], VIEW_TYPE);
    this.addRibbonIcon("waypoints", "New Decision Map", () => { void this.createAndOpen(); });
    this.addCommand({
      id: "new-decision-map",
      name: "Create Decision Map",
      callback: () => { void this.createAndOpen(); },
    });
    this.addCommand({
      id: "new-embedded-decision-map",
      name: "Create and embed Decision Map in note",
      editorCallback: (editor: Editor) => { void this.createAndEmbed(editor); },
    });
    this.registerMarkdownCodeBlockProcessor("decisionmap", (source, el, ctx) => {
      const raw = source.trim().replace(/^\[\[|\]\]$/g, "");
      const file = this.app.metadataCache.getFirstLinkpathDest(raw, ctx.sourcePath);
      if (!file || file.extension !== EXTENSION) {
        el.createEl("p", { text: `Decision Map not found: ${raw}` });
        return;
      }
      const container = el.createDiv({ cls: "decision-map-embed" });
      const editor = container.createDiv({ cls: "decision-map-embed-editor" });
      let inlineRoot: Root | null = null;
      let saveQueue = Promise.resolve();
      let currentSerialized = "";
      let disposed = false;
      const render = async () => {
        try {
          const serialized = await this.app.vault.read(file);
          if (disposed) return;
          if (serialized === currentSerialized && inlineRoot) return;
          const document = validateDocument(JSON.parse(serialized));
          currentSerialized = serialized;
          inlineRoot?.unmount();
          editor.empty();
          inlineRoot = createRoot(editor);
          inlineRoot.render(<App
            embedded
            initialDocument={document}
            onDocumentChange={(next: MapDocument) => {
              const serialized = JSON.stringify(next, null, 2);
              if (serialized === currentSerialized) return;
              currentSerialized = serialized;
              saveQueue = saveQueue.then(async () => {
                if ((await this.app.vault.read(file)) !== serialized)
                  await this.app.vault.modify(file, serialized);
              }).catch(error => { new Notice(`Could not save Decision Map: ${String(error)}`); });
            }}
          />);
        } catch {
          if (disposed) return;
          inlineRoot?.unmount();
          inlineRoot = null;
          editor.empty();
          editor.createEl("p", { text: "Unable to open this Decision Map." });
        }
      };
      void render();
      const child = new MarkdownRenderChild(container);
      child.onunload = () => { disposed = true; inlineRoot?.unmount(); inlineRoot = null; };
      child.registerEvent(this.app.vault.on("modify", changed => {
        if (changed.path === file.path) void render();
      }));
      ctx.addChild(child);
    });
  }

  private async createMap(): Promise<TFile> {
    const folder = "Decision Maps";
    if (!this.app.vault.getAbstractFileByPath(folder))
      await this.app.vault.createFolder(folder);
    let index = 1;
    while (this.app.vault.getAbstractFileByPath(`${folder}/Map ${index}.${EXTENSION}`)) index++;
    const name = `Map ${index}`;
    return this.app.vault.create(`${folder}/${name}.${EXTENSION}`, JSON.stringify(emptyProject(name), null, 2));
  }

  private async openMap(file: TFile) {
    const leaf = this.app.workspace.getLeaf("tab");
    await leaf.openFile(file);
    await this.app.workspace.revealLeaf(leaf);
  }

  private async createAndOpen() {
    try { await this.openMap(await this.createMap()); }
    catch (error) { new Notice(`Could not create Decision Map: ${String(error)}`); }
  }

  private async createAndEmbed(editor: Editor) {
    try {
      const file = await this.createMap();
      editor.replaceSelection(`\n\`\`\`decisionmap\n${file.path}\n\`\`\`\n`);
      await this.openMap(file);
    } catch (error) { new Notice(`Could not embed Decision Map: ${String(error)}`); }
  }
}

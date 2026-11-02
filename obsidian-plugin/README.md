# Decision Map Studio for Obsidian

Create `.dmap` files in your vault and edit them in a full Obsidian tab. To embed the same map in a Markdown note, use the command **Create and embed Decision Map in note**, or write:

````markdown
```decisionmap
Decision Maps/Map 1.dmap
```
````

The note displays only the interactive map. Click a parent node's `+` or `−` to expand or collapse its children, and drag to pan the canvas. Changes to branch visibility are saved to the same `.dmap` file. Open the `.dmap` file separately to edit nodes and connections.

## Build and install locally

From the repository root:

```sh
npm install
npm run build:obsidian
```

Copy the three files from `obsidian-plugin/dist/` to `<vault>/.obsidian/plugins/decision-map-studio/`, then enable the community plugin in Obsidian. The desktop application and Obsidian plugin use the same map document format.

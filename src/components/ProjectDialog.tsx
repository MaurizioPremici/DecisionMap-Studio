import { useRef, useState } from "react";
import {
  Copy,
  FolderOpen,
  Pencil,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import type { MapDocument } from "../types";
import { STUDY_TEMPLATES } from "../lib/studyTemplates";

interface Props {
  projects: MapDocument[];
  activeId: string;
  onClose: () => void;
  onNew: (demo: boolean) => void;
  onTemplate: (id: string) => void;
  onOpen: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onDeletePrevious: () => void;
  onImport: (file: File) => void;
}

export function ProjectDialog(p: Props) {
  const file = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [renameId, setRenameId] = useState<string | null>(null);
  const saveName = () => {
    if (renameId && name.trim()) p.onRename(renameId, name.trim());
    setRenameId(null);
  };
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) =>
        event.target === event.currentTarget && p.onClose()
      }
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="Projects"
      >
        <header>
          <div>
            <span className="eyebrow">DECISION MAP STUDIO</span>
            <h2>Projects</h2>
          </div>
          <button onClick={p.onClose} aria-label="Close">
            <X size={20} />
          </button>
        </header>
        <div className="modal-section">
          <h3>Create</h3>
          <div className="project-actions">
            <button onClick={() => p.onNew(false)}>
              <Plus size={18} /> Blank project
            </button>
            <button onClick={() => p.onNew(true)}>
              <FolderOpen size={18} /> Demo project
            </button>
          </div>
        </div>
        <div className="modal-section">
          <h3>Study templates</h3>
          <p className="hint">
            Guided structures to fill in with your own notes and recall answers.
          </p>
          <div className="study-template-grid">
            {STUDY_TEMPLATES.map((template) => (
              <button
                key={template.id}
                onClick={() => p.onTemplate(template.id)}
              >
                <strong>{template.name}</strong>
                <span>{template.purpose}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="modal-section">
          <div className="project-list-header">
            <h3>Open a project</h3>
            <button
              disabled={p.projects.length < 2}
              onClick={() => {
                if (
                  window.confirm(
                    "Delete all previous projects? The current project will be kept.",
                  )
                )
                  p.onDeletePrevious();
              }}
              title="Delete every project except the current one"
            >
              <Trash2 size={19} /> Delete previous
            </button>
          </div>
          <div className="project-list">
            {p.projects.map((project) => (
              <div
                key={project.id}
                className={project.id === p.activeId ? "current" : ""}
              >
                <button
                  className="project-main"
                  onClick={() => p.onOpen(project.id)}
                >
                  <strong>{project.name}</strong>
                  <small>
                    {project.nodes.length} nodes ·{" "}
                    {new Date(project.updatedAt).toLocaleString("en-US")}
                  </small>
                </button>
                <button
                  className="project-icon"
                  onClick={() => {
                    setRenameId(project.id);
                    setName(project.name);
                  }}
                  title="Rename"
                  aria-label={`Rename ${project.name}`}
                >
                  <Pencil size={20} />
                </button>
                <button
                  className="project-icon"
                  onClick={() => p.onDuplicate(project.id)}
                  title="Duplicate"
                  aria-label={`Duplicate ${project.name}`}
                >
                  <Copy size={20} />
                </button>
                <button
                  className="project-icon project-delete"
                  onClick={() => {
                    if (window.confirm(`Delete project “${project.name}”?`)) {
                      if (renameId === project.id) setRenameId(null);
                      p.onDelete(project.id);
                    }
                  }}
                  title="Delete project"
                  aria-label={`Delete ${project.name}`}
                >
                  <X size={21} />
                </button>
              </div>
            ))}
            {!p.projects.length && (
              <p className="hint">
                No saved projects. Create one to get started.
              </p>
            )}
          </div>
          {renameId && (
            <div className="rename-row">
              <input
                aria-label="New project name"
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") saveName();
                }}
              />
              <button onClick={saveName}>Save name</button>
              <button onClick={() => setRenameId(null)}>Cancel</button>
            </div>
          )}
        </div>
        <div className="modal-section">
          <h3>Import</h3>
          <div className="project-actions">
            <button onClick={() => file.current?.click()}>
              <Upload size={17} /> Import JSON
            </button>
          </div>
          <input
            ref={file}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={(event) => {
              const selected = event.target.files?.[0];
              if (selected) p.onImport(selected);
              event.currentTarget.value = "";
            }}
          />
        </div>
      </div>
    </div>
  );
}

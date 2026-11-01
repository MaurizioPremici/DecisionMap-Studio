import { BringToFront, ChevronDown, ChevronUp, Copy, Focus, Grid2X2, Hand, ImagePlus, Link2, Maximize, MousePointer2, PenTool, Plus, Redo2, Save, Search, Trash2, Undo2, WandSparkles } from 'lucide-react'
import type { MapDocument } from '../types'

interface Props{
  doc:MapDocument;mode:'select'|'connect'|'pan'|'draw';setMode:(mode:'select'|'connect'|'pan'|'draw')=>void;locked:boolean;drawColor:string;drawWidth:number;setDrawColor:(color:string)=>void;setDrawWidth:(width:number)=>void;selectedCount:number;hasSelectedEdge:boolean
  onAdd:()=>void;onText:()=>void;onImage:(file:File)=>void;onDelete:()=>void;onDuplicate:()=>void
  onUndo:()=>void;onRedo:()=>void;canUndo:boolean;canRedo:boolean
  onFit:()=>void;onLayout:()=>void;onExport:()=>void;onProjects:()=>void
  onToggleGrid:()=>void;onToggleSnap:()=>void;onHide:()=>void
  search:string;setSearch:(value:string)=>void;onFind:()=>void
}

export function Toolbar(p:Props){return <header className="topbar unified-toolbar">
  <div className="brand" onClick={p.onProjects} title="Progetti"><span className="brand-logo">◇</span><span><b>Decision Map</b><small>STUDIO</small></span><ChevronDown size={14}/></div>
  <div className="project-name">{p.doc.name}<span>Salvataggio locale automatico</span></div>
  <nav className="toolbar-actions" aria-label="Strumenti">
    <div className="tool-group">
      <button className={p.mode==='select'?'active':''} onClick={()=>p.setMode('select')} title="Seleziona (V)"><MousePointer2 size={18}/><span>Seleziona</span></button>
      <button className={p.mode==='pan'?'active':''} onClick={()=>p.setMode('pan')} title="Sposta canvas (H)"><Hand size={18}/><span>Mano</span></button>
      <button className={p.mode==='connect'?'active':''} disabled={p.locked} onClick={()=>p.setMode('connect')} title="Collega due nodi (C)"><Link2 size={18}/><span>Collega</span></button>
      <button className={p.mode==='draw'?'active':''} disabled={p.locked} onClick={()=>p.setMode('draw')} title="Disegno libero (D)"><PenTool size={18}/><span>Disegna</span></button>
      <button onClick={p.onAdd} disabled={p.locked} title="Nuovo nodo (N)"><Plus size={18}/><span>Nodo</span></button>
      <button onClick={p.onText} disabled={p.locked} title="Aggiungi testo"><span className="text-icon">T</span><span>Testo</span></button>
      <label className={`toolbar-image-upload ${p.locked?'disabled':''}`} title="Carica immagine"><ImagePlus size={18}/><span>Immagine</span><input type="file" accept="image/png,image/jpeg,image/webp,image/gif" disabled={p.locked} onChange={e=>{const file=e.currentTarget.files?.[0];if(file)p.onImage(file);e.currentTarget.value=''}}/></label>
    </div>
    <div className="tool-divider"/>
    <div className="tool-group compact">
      <button onClick={p.onDuplicate} disabled={p.locked} title="Duplica (⌘D)"><Copy size={17}/></button>
      <button className={p.selectedCount>1?'selection-delete-ready':''} onClick={p.onDelete} disabled={p.locked||(!p.selectedCount&&!p.hasSelectedEdge)} title={p.selectedCount>1?`Elimina ${p.selectedCount} nodi selezionati (Delete)`:'Elimina selezione (Delete)'}><Trash2 size={17}/>{p.selectedCount>1&&<em className="selection-count">{p.selectedCount}</em>}</button>
      <button onClick={p.onUndo} disabled={p.locked||!p.canUndo} title="Annulla (⌘Z)"><Undo2 size={17}/></button>
      <button onClick={p.onRedo} disabled={p.locked||!p.canRedo} title="Ripristina (⌘⇧Z)"><Redo2 size={17}/></button>
    </div>
    <div className="tool-divider"/>
    <div className="tool-group compact">
      <button onClick={p.onFit} title="Zoom to Fit"><Focus size={17}/></button>
      <button onClick={p.onLayout} disabled={p.locked} title="Auto Layout"><WandSparkles size={17}/></button>
      <button className={p.doc.settings.grid?'subtle-active':''} disabled={p.locked} aria-pressed={p.doc.settings.grid} onClick={p.onToggleGrid} title="Mostra o nascondi griglia"><Grid2X2 size={17}/></button>
      <button className={p.doc.settings.snap?'subtle-active':''} disabled={p.locked} aria-pressed={p.doc.settings.snap} onClick={p.onToggleSnap} title="Aggancia alla griglia quando sposti i nodi"><Maximize size={17}/></button>
    </div>
  </nav>
  <div className="search-box"><Search size={15}/><input value={p.search} onChange={e=>p.setSearch(e.target.value)} onKeyDown={e=>e.key==='Enter'&&p.onFind()} placeholder="Cerca nella mappa"/><button onClick={p.onFind} title="Trova"><ChevronDown size={14}/></button></div>
  <div className="top-actions"><button onClick={p.onProjects} title="Gestisci progetti"><BringToFront size={17}/><span>Progetti</span></button><button onClick={p.onExport} title="Salva ed esporta"><Save size={17}/><span>Esporta</span></button><button className="chrome-hide-button" onClick={p.onHide} title="Nascondi barra"><ChevronUp size={17}/><span>Nascondi</span></button></div>
</header>}

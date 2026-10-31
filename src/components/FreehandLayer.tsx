import { useRef, useState, type PointerEvent } from 'react'
import { useReactFlow, ViewportPortal } from '@xyflow/react'
import type { MapStroke } from '../types'
import { freehandPath } from '../lib/freehand'

interface Props { strokes:MapStroke[];active:boolean;locked:boolean;selectedId:string|null;color:string;width:number;onAdd:(stroke:MapStroke)=>void;onSelect:(id:string)=>void }

export function FreehandLayer({strokes,active,locked,selectedId,color,width,onAdd,onSelect}:Props){
  const {screenToFlowPosition}=useReactFlow()
  const [draft,setDraft]=useState<MapStroke|null>(null)
  const draftRef=useRef<MapStroke|null>(null)
  const setCurrent=(stroke:MapStroke|null)=>{draftRef.current=stroke;setDraft(stroke)}
  const point=(e:PointerEvent<HTMLDivElement>)=>screenToFlowPosition({x:e.clientX,y:e.clientY})
  const start=(e:PointerEvent<HTMLDivElement>)=>{if(e.button!==0)return;e.preventDefault();e.stopPropagation();e.currentTarget.setPointerCapture(e.pointerId);setCurrent({id:crypto.randomUUID(),points:[point(e)],color,width})}
  const move=(e:PointerEvent<HTMLDivElement>)=>{const current=draftRef.current;if(!current)return;const next=point(e),last=current.points.at(-1)!;if(Math.hypot(next.x-last.x,next.y-last.y)>1.2)setCurrent({...current,points:[...current.points,next]})}
  const finish=(e:PointerEvent<HTMLDivElement>)=>{const current=draftRef.current;if(!current)return;e.stopPropagation();if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);setCurrent(null);onAdd(current)}
  return <>
    <ViewportPortal><svg className="freehand-strokes">{[...strokes,...(draft?[draft]:[])].map(stroke=><g key={stroke.id}>
      <path d={freehandPath(stroke.points)} fill="none" stroke={stroke.color} strokeWidth={stroke.width} strokeLinecap="round" strokeLinejoin="round" style={selectedId===stroke.id?{filter:'drop-shadow(0 0 5px var(--accent))'}:undefined}/>
      {!active&&!locked&&stroke!==draft&&<path d={freehandPath(stroke.points)} fill="none" stroke="transparent" strokeWidth={Math.max(14,stroke.width+8)} strokeLinecap="round" strokeLinejoin="round" style={{pointerEvents:'stroke',cursor:'pointer'}} onPointerDown={e=>{e.stopPropagation();onSelect(stroke.id)}}/>}
    </g>)}</svg></ViewportPortal>
    {active&&<div className="freehand-input" onPointerDown={start} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish}/>}
  </>
}

import { useEffect, useState } from 'react'
import { Handle, NodeResizeControl, Position, type Node, type NodeProps } from '@xyflow/react'
import { artBackgroundImage } from '../artStyles'
import { roughBorderPaths } from '../lib/roughBorder'
import { strokeDasharray } from '../lib/stroke'
import type { MapNode } from '../types'
export interface StudioData extends Record<string,unknown>{item:MapNode;children:number;hidden:number;onToggle:(id:string)=>void;onEdit:(id:string)=>void;onResize:(id:string,x:number,y:number,width:number,height:number)=>void;highlight:boolean;readOnly:boolean}
export type StudioFlowNode=Node<StudioData,'studio'>
export function StudioNode({id,data,selected}:NodeProps<StudioFlowNode>){const n=data.item;const s=n.style;const geometric=s.shape==='diamond'||s.shape==='triangle';const textOnly=Boolean(n.textOnly||s.background==='#ffffff00'&&s.borderWidth===0&&!n.imageSrc);const [preview,setPreview]=useState<{width:number;height:number}|null>(null);useEffect(()=>setPreview(null),[s.width,s.height]);const w=preview?.width??s.width,h=preview?.height??s.height;const corners=['top-left','top-right','bottom-left','bottom-right'] as const;const sides=['top','right','bottom','left'] as const;const rough=s.strokeStyle==='sketch'&&s.borderWidth>0?roughBorderPaths(w,h,s.radius,s.shape):null;return <div className={`studio-node shape-${n.imageSrc?'shape-image':textOnly?'shape-text':s.shape} ${data.highlight?'highlight':''} ${preview?'is-resizing':''}`} style={{width:'100%',height:'100%',opacity:s.opacity,filter:s.shadow?'drop-shadow(0 8px 12px #16233d28)':undefined,'--node-radius':`${s.radius}px`} as React.CSSProperties} onDoubleClick={e=>{e.stopPropagation();if(!n.imageSrc)data.onEdit(id)}}>
  {selected&&!data.readOnly&&<>
    {(textOnly?[...corners,...sides]:[...corners]).map(corner=><NodeResizeControl key={corner} position={corner} className="studio-resize-corner" minWidth={textOnly?60:100} minHeight={textOnly?32:55} keepAspectRatio={false} onResizeStart={(_,params)=>setPreview({width:params.width,height:params.height})} onResize={(_,params)=>setPreview({width:params.width,height:params.height})} onResizeEnd={(_,params)=>{setPreview({width:params.width,height:params.height});data.onResize(id,params.x,params.y,params.width,params.height)}} />)}
  </>}
  {preview&&<div className="resize-metric">{Math.round(preview.width)} × {Math.round(preview.height)}</div>}
  {n.imageSrc?<img className="node-image" src={n.imageSrc} alt={n.title} draggable={false}/>:<div className={`node-face ${geometric?'geometric '+s.shape:''}`} style={{background:s.background,backgroundImage:artBackgroundImage(s.artStyle,s.patternColor),borderWidth:rough||geometric?0:s.borderWidth,borderStyle:s.strokeStyle==='sketch'?'solid':s.strokeStyle??'solid',borderColor:s.borderColor,borderRadius:s.shape==='ellipse'?'50%':geometric?0:s.shape==='rectangle'?0:s.radius}}>
    <div className="node-content" style={{fontFamily:s.fontFamily,fontSize:textOnly&&preview?Math.max(8,Math.min(160,s.fontSize*Math.sqrt(preview.width/s.width*preview.height/s.height))):s.fontSize,fontWeight:s.bold?700:400,fontStyle:s.italic?'italic':'normal',textDecoration:s.underline?'underline':'none',color:s.textColor,textAlign:s.textAlign,padding:textOnly&&preview?s.padding*Math.sqrt(preview.width/s.width*preview.height/s.height):s.padding,justifyContent:s.verticalAlign==='top'?'flex-start':s.verticalAlign==='bottom'?'flex-end':'center'}}>
      {n.title&&<strong>{n.title}</strong>}{n.text&&<span>{n.text}</span>}
    </div>
  </div>}
  {!n.imageSrc&&geometric&&!rough&&s.borderWidth>0&&<svg className="geometric-border" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true"><polygon points={s.shape==='triangle'?`${w/2},2 ${w-2},${h-2} 2,${h-2}`:`${w/2},2 ${w-2},${h/2} ${w/2},${h-2} 2,${h/2}`} fill="none" stroke={s.borderColor} strokeWidth={s.borderWidth} strokeDasharray={strokeDasharray(s.strokeStyle??'solid')} strokeLinejoin="round" vectorEffect="non-scaling-stroke"/></svg>}
  {!n.imageSrc&&rough&&<svg className="rough-border" viewBox={`0 0 ${preview?.width??s.width} ${preview?.height??s.height}`} preserveAspectRatio="none" aria-hidden="true"><path d={rough[0]} stroke={s.borderColor} strokeWidth={Math.max(1,s.borderWidth*.65)} vectorEffect="non-scaling-stroke"/><path d={rough[1]} stroke={s.borderColor} strokeWidth={Math.max(.8,s.borderWidth*.38)} opacity=".7" vectorEffect="non-scaling-stroke"/></svg>}
  <Handle type="target" position={Position.Left} id="left-target" className="node-handle" />
  <Handle type="source" position={Position.Right} id="right-source" className="node-handle" />
  <Handle type="source" position={Position.Bottom} id="bottom-source" className="node-handle" />
  <Handle type="target" position={Position.Top} id="top-target" className="node-handle" />
  <Handle type="source" position={Position.Left} id="left-source" className="node-handle" />
  <Handle type="source" position={Position.Top} id="top-source" className="node-handle" />
  <Handle type="target" position={Position.Right} id="right-target" className="node-handle" />
  <Handle type="target" position={Position.Bottom} id="bottom-target" className="node-handle" />
  {data.children>0&&!data.readOnly&&<button className="collapse-badge nodrag" title={n.collapsed?`Mostra ${data.hidden} nodi nascosti`:'Chiudi ramo'} onClick={e=>{e.stopPropagation();data.onToggle(id)}}>{n.collapsed?`+ ${data.hidden}`:'−'}</button>}
  </div>}

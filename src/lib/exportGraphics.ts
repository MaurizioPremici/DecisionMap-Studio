import bodoniRegularUrl from '../assets/fonts/BodoniModa-Regular.ttf?inline'
import bodoniItalicUrl from '../assets/fonts/BodoniModa-Italic.ttf?inline'
import deliciousHandrawnUrl from '../assets/fonts/DeliciousHandrawn-Regular.ttf?inline'
import { visibleIds } from './tree'
import { freehandPath } from './freehand'
import { lineStrokeStyle, strokeDasharray } from './stroke'
import { darkPalette } from '../themePresets'
import { artPatternId, artSvgPatterns } from '../artStyles'
import { roughBorderPaths } from './roughBorder'
import type { MapDocument, MapNode, StrokeStyle } from '../types'
const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!))
const fmt=(v:number)=>Math.round(v*10)/10
const lines=(s:string,max:number)=>s.split('\n').flatMap(line=>{const words=line.split(/\s+/);const out:string[]=[];let current='';for(const word of words){if((current+' '+word).trim().length>max&&current){out.push(current);current=word}else current=(current+' '+word).trim()}out.push(current);return out})
function drawNode(n:MapNode,minX:number,minY:number){
  const s=n.style,x=n.position.x-minX+70,y=n.position.y-minY+70,w=s.width,h=s.height
  if(n.imageSrc)return `<image x="${fmt(x)}" y="${fmt(y)}" width="${fmt(w)}" height="${fmt(h)}" href="${escape(n.imageSrc)}" preserveAspectRatio="none" opacity="${s.opacity}"/>`
  const geometry=s.shape==='ellipse'
    ?{tag:'ellipse',attrs:`cx="${fmt(x+w/2)}" cy="${fmt(y+h/2)}" rx="${fmt(w/2)}" ry="${fmt(h/2)}"`}
    :s.shape==='triangle'
      ?{tag:'polygon',attrs:`points="${fmt(x+w/2)},${fmt(y)} ${fmt(x+w)},${fmt(y+h)} ${fmt(x)},${fmt(y+h)}"`}
    :s.shape==='diamond'
      ?{tag:'polygon',attrs:`points="${fmt(x+w/2)},${fmt(y)} ${fmt(x+w)},${fmt(y+h/2)} ${fmt(x+w/2)},${fmt(y+h)} ${fmt(x)},${fmt(y+h/2)}"`}
      :{tag:'rect',attrs:`x="${fmt(x)}" y="${fmt(y)}" width="${fmt(w)}" height="${fmt(h)}" rx="${s.shape==='rectangle'?0:s.radius}"`}
  const shape=(attrs:string)=>`<${geometry.tag} ${geometry.attrs} ${attrs}/>`
  const base=shape(`fill="${escape(s.background)}"`)
  const pattern=artPatternId(s.artStyle,s.patternColor)
  const texture=pattern?shape(`fill="url(#${pattern})"`):''
  const dash=strokeDasharray(s.strokeStyle??'solid')
  const outline=s.borderWidth<=0?'' :s.strokeStyle==='sketch'
    ?roughBorderPaths(w,h,s.radius,s.shape).map((d,i)=>`<path d="${d}" transform="translate(${fmt(x)} ${fmt(y)})" fill="none" stroke="${escape(s.borderColor)}" stroke-width="${i?Math.max(.8,s.borderWidth*.38):Math.max(1,s.borderWidth*.65)}" opacity="${i?.7:1}" stroke-linecap="round" stroke-linejoin="round"/>`).join('')
    :shape(`fill="none" stroke="${escape(s.borderColor)}" stroke-width="${s.borderWidth}" stroke-linecap="round"${dash?` stroke-dasharray="${dash}"`:''}`)
  const maxChars=Math.max(8,Math.floor((w-2*s.padding)/(s.fontSize*.55)))
  const content=lines([n.title,n.text].filter(Boolean).join('\n'),maxChars).slice(0,15)
  const lineHeight=s.fontSize*1.3,blockHeight=content.length*lineHeight
  const startY=s.verticalAlign==='top'?y+s.padding+s.fontSize:s.verticalAlign==='bottom'?y+h-s.padding-blockHeight+s.fontSize:y+(h-blockHeight)/2+s.fontSize
  const anchor=s.textAlign==='left'?'start':s.textAlign==='right'?'end':'middle'
  const textX=s.textAlign==='left'?x+s.padding:s.textAlign==='right'?x+w-s.padding:x+w/2
  const family=s.fontFamily.split(',')[0].replace(/["']/g,'')
  const text=`<text x="${fmt(textX)}" y="${fmt(startY)}" fill="${escape(s.textColor)}" text-anchor="${anchor}" font-family="${escape(family)},Arial,sans-serif" font-size="${s.fontSize}" font-weight="${s.bold?700:400}" font-style="${s.italic?'italic':'normal'}" text-decoration="${s.underline?'underline':'none'}">${content.map((line,i)=>`<tspan x="${fmt(textX)}" dy="${i?fmt(lineHeight):0}">${escape(line)}</tspan>`).join('')}</text>`
  return `<g opacity="${s.opacity}"${s.shadow?' filter="url(#shadow)"':''}>${base}${texture}${outline}${text}</g>`
}
export function svgForDocument(doc:MapDocument){const visible=visibleIds(doc.nodes);const nodes=doc.nodes.filter(n=>visible.has(n.id));const strokes=doc.strokes??[];const points=strokes.flatMap(stroke=>stroke.points);if(!nodes.length&&!strokes.length)return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500"><rect width="100%" height="100%" fill="${doc.settings.theme==='dark'?darkPalette(doc.settings.darkTheme).bg:'#f8f7f4'}"/></svg>`;const minX=Math.min(...nodes.map(n=>n.position.x),...points.map(p=>p.x)),minY=Math.min(...nodes.map(n=>n.position.y),...points.map(p=>p.y));const width=Math.ceil(Math.max(...nodes.map(n=>n.position.x+n.style.width),...points.map(p=>p.x))-minX+140),height=Math.ceil(Math.max(...nodes.map(n=>n.position.y+n.style.height),...points.map(p=>p.y))-minY+140);const map=new Map(nodes.map(n=>[n.id,n]));const edges:string[]=[];for(const n of nodes){if(!n.parentId||!map.has(n.parentId))continue;const from=map.get(n.parentId)!;edges.push(path(from,n,n.parentLineColor??(doc.settings.theme==='dark'?darkPalette(doc.settings.darkTheme).edge:'#8c95b6'),n.parentLineWidth??4,n.parentLineStyle??'solid',true,n.parentLineType??'default','',12,minX,minY))}for(const e of doc.links){const from=map.get(e.source),to=map.get(e.target);if(from&&to)edges.push(path(from,to,e.color,e.width,lineStrokeStyle(e.strokeStyle,e.dashed),e.arrow,e.type,e.label,e.labelFontSize??12,minX,minY,e.sourceHandle,e.targetHandle,e.arrowColor,e.labelColor))}const arrowColors=new Set([...doc.links.filter(e=>e.arrow).map(e=>e.arrowColor??e.color),...nodes.filter(n=>n.parentId&&map.has(n.parentId)).map(n=>n.parentLineColor??(doc.settings.theme==='dark'?darkPalette(doc.settings.darkTheme).edge:'#8c95b6'))]);const markers=[...arrowColors].map(color=>`<marker id="arrow-${color.replace(/[^a-z0-9]/gi,'')}" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 Z" fill="${escape(color)}"/></marker>`).join('');return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs>${nodes.some(n=>n.style.fontFamily.startsWith('Delicious Handrawn'))?`<style>@font-face{font-family:'Delicious Handrawn';src:url('${deliciousHandrawnUrl}') format('truetype')}</style>`:''}${nodes.some(n=>n.style.fontFamily.startsWith('Bodoni Moda'))?`<style>@font-face{font-family:'Bodoni Moda';src:url('${bodoniRegularUrl}') format('truetype');font-style:normal}@font-face{font-family:'Bodoni Moda';src:url('${bodoniItalicUrl}') format('truetype');font-style:italic}</style>`:''}<filter id="shadow" x="-20%" y="-30%" width="140%" height="160%"><feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#16233d" flood-opacity=".22"/></filter>${markers}${artSvgPatterns(nodes)}</defs><rect width="100%" height="100%" fill="${doc.settings.theme==='dark'?darkPalette(doc.settings.darkTheme).bg:'#f8f7f4'}"/>${edges.join('')}${strokes.map(stroke=>`<path d="${freehandPath(stroke.points.map(point=>({x:point.x-minX+70,y:point.y-minY+70})))}" fill="none" stroke="${escape(stroke.color)}" stroke-width="${stroke.width}" stroke-linecap="round" stroke-linejoin="round"/>`).join('')}${nodes.map(n=>drawNode(n,minX,minY)).join('')}</svg>`}
function path(a:MapNode,b:MapNode,color:string,width:number,strokeStyle:StrokeStyle,arrow:boolean,type:string,label:string,labelFontSize:number,minX:number,minY:number,sourceHandle?:string,targetHandle?:string,arrowColor?:string,labelColor?:string){
  const side=(handle:string|undefined,fallback:string)=>handle?.split('-')[0]??fallback
  const fromSide=side(sourceHandle,'right'),toSide=side(targetHandle,'left')
  const point=(node:MapNode,position:string)=>{
    const x=node.position.x-minX+70,y=node.position.y-minY+70,w=node.style.width,h=node.style.height
    return position==='top'?[x+w/2,y]:position==='bottom'?[x+w/2,y+h]:position==='left'?[x,y+h/2]:[x+w,y+h/2]
  }
  const [x1,y1]=point(a,fromSide),[x2,y2]=point(b,toSide)
  const midX=(x1+x2)/2,midY=(y1+y2)/2,vertical=['top','bottom'].includes(fromSide)&&['top','bottom'].includes(toSide)
  const vector=(position:string)=>position==='top'?[0,-1]:position==='bottom'?[0,1]:position==='left'?[-1,0]:[1,0]
  const [sx,sy]=vector(fromSide),[tx,ty]=vector(toSide),bend=Math.max(35,Math.hypot(x2-x1,y2-y1)*.3)
  const d=type==='straight'?`M${fmt(x1)} ${fmt(y1)} L${fmt(x2)} ${fmt(y2)}`
    :type==='smoothstep'?vertical?`M${fmt(x1)} ${fmt(y1)} L${fmt(x1)} ${fmt(midY)} L${fmt(x2)} ${fmt(midY)} L${fmt(x2)} ${fmt(y2)}`:`M${fmt(x1)} ${fmt(y1)} L${fmt(midX)} ${fmt(y1)} L${fmt(midX)} ${fmt(y2)} L${fmt(x2)} ${fmt(y2)}`
    :`M${fmt(x1)} ${fmt(y1)} C${fmt(x1+sx*bend)} ${fmt(y1+sy*bend)} ${fmt(x2+tx*bend)} ${fmt(y2+ty*bend)} ${fmt(x2)} ${fmt(y2)}`
  const dash=strokeDasharray(strokeStyle)
  const markerColor=arrowColor??color
  return `<path d="${d}" fill="none" stroke="${escape(color)}" stroke-width="${width}" stroke-linecap="round"${dash?` stroke-dasharray="${dash}"`:''}${arrow?` marker-end="url(#arrow-${markerColor.replace(/[^a-z0-9]/gi,'')})"`:''}/>${label?`<text x="${fmt(midX)}" y="${fmt(midY-6)}" text-anchor="middle" font-size="${labelFontSize}" fill="${escape(labelColor??color)}">${escape(label)}</text>`:''}`
}
function saveBlob(filename:string,blob:Blob){const url=URL.createObjectURL(blob);const anchor=document.createElement('a');anchor.href=url;anchor.download=filename;anchor.click();window.setTimeout(()=>URL.revokeObjectURL(url),2000)}
export async function exportGraphic(doc:MapDocument,type:'svg'|'png',filename:string){const svg=svgForDocument(doc);if(type==='svg'){saveBlob(filename,new Blob([svg],{type:'image/svg+xml;charset=utf-8'}));return}const source=new Blob([svg],{type:'image/svg+xml;charset=utf-8'});const url=URL.createObjectURL(source);try{const image=new Image();image.src=url;await image.decode();const width=Number((svg.match(/width="(\d+)"/)??[])[1]),height=Number((svg.match(/height="(\d+)"/)??[])[1]);const scale=Math.min(2,4096/Math.max(width,height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(width*scale));canvas.height=Math.max(1,Math.round(height*scale));const context=canvas.getContext('2d');if(!context)throw Error('Canvas non disponibile');context.drawImage(image,0,0,canvas.width,canvas.height);const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('PNG non disponibile')),'image/png'));saveBlob(filename,blob)}finally{URL.revokeObjectURL(url)}}

import type { Shape } from '../types'

export function roughBorderPaths(width:number,height:number,radius:number,shape:Shape):[string,string]{
  const w=Math.max(100,width),h=Math.max(55,height),cx=w/2,cy=h/2
  if(shape==='ellipse')return [
    `M ${cx} 3 C ${w*.78} 0 ${w-2} ${h*.18} ${w-3} ${cy} C ${w+1} ${h*.78} ${w*.72} ${h-1} ${cx} ${h-3} C ${w*.2} ${h+1} 2 ${h*.8} 3 ${cy} C 0 ${h*.2} ${w*.23} 2 ${cx} 3 Z`,
    `M ${cx+2} 5 C ${w*.81} 2 ${w-4} ${h*.22} ${w-4} ${cy+2} C ${w-1} ${h*.75} ${w*.7} ${h-4} ${cx-2} ${h-4} C ${w*.18} ${h-2} 4 ${h*.77} 5 ${cy-2} C 3 ${h*.21} ${w*.25} 4 ${cx+2} 5 Z`,
  ]
  if(shape==='diamond')return [
    `M ${cx} 3 Q ${w*.76} ${h*.24} ${w-3} ${cy} Q ${w*.75} ${h*.78} ${cx} ${h-3} Q ${w*.24} ${h*.75} 3 ${cy} Q ${w*.23} ${h*.2} ${cx} 3 Z`,
    `M ${cx+2} 5 L ${w-5} ${cy-2} L ${cx-2} ${h-5} L 5 ${cy+2} Z`,
  ]
  const r=shape==='rectangle'?3:Math.max(7,Math.min(radius,w/3,h/3))
  return [
    `M ${r+5} 3 C ${w*.34} 1 ${w*.68} 5 ${w-r-5} 3 Q ${w-2} 4 ${w-3} ${r+3} C ${w-5} ${h*.34} ${w-1} ${h*.67} ${w-3} ${h-r-4} Q ${w-4} ${h-2} ${w-r-3} ${h-3} C ${w*.67} ${h-1} ${w*.31} ${h-5} ${r+4} ${h-3} Q 3 ${h-4} 3 ${h-r-3} C 5 ${h*.65} 1 ${h*.34} 3 ${r+4} Q 4 4 ${r+5} 3 Z`,
    `M ${r+2} 5 C ${w*.31} 4 ${w*.72} 2 ${w-r-3} 5 Q ${w-5} 6 ${w-5} ${r+2} C ${w-3} ${h*.37} ${w-4} ${h*.64} ${w-5} ${h-r-2} Q ${w-6} ${h-5} ${w-r-4} ${h-5} C ${w*.63} ${h-3} ${w*.34} ${h-2} ${r+3} ${h-5} Q 5 ${h-6} 5 ${h-r-2} C 3 ${h*.62} 6 ${h*.37} 5 ${r+2} Q 6 6 ${r+2} 5 Z`,
  ]
}

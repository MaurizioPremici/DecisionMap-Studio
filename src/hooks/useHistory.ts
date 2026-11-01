import { useCallback, useReducer } from 'react'
import type { MapDocument } from '../types'

type NextDocument=MapDocument|((current:MapDocument)=>MapDocument)
interface HistoryState {past:MapDocument[];present:MapDocument;future:MapDocument[]}
type Action=
  |{type:'commit';next:NextDocument;updatedAt:string}
  |{type:'undo'}
  |{type:'redo'}
  |{type:'reset';doc:MapDocument}

function historyReducer(state:HistoryState,action:Action):HistoryState{
  switch(action.type){
    case 'commit':{
      const next=typeof action.next==='function'?action.next(state.present):action.next
      if(JSON.stringify(next)===JSON.stringify(state.present))return state
      return {past:[...state.past.slice(-79),state.present],present:{...next,updatedAt:action.updatedAt},future:[]}
    }
    case 'undo':{
      if(!state.past.length)return state
      return {past:state.past.slice(0,-1),present:state.past.at(-1)!,future:[state.present,...state.future]}
    }
    case 'redo':{
      if(!state.future.length)return state
      return {past:[...state.past.slice(-79),state.present],present:state.future[0],future:state.future.slice(1)}
    }
    case 'reset':return {past:[],present:action.doc,future:[]}
  }
}

export function useHistory(initial:MapDocument){
  const [state,dispatch]=useReducer(historyReducer,{past:[],present:initial,future:[]})
  const commit=useCallback((next:NextDocument)=>dispatch({type:'commit',next,updatedAt:new Date().toISOString()}),[])
  const undo=useCallback(()=>dispatch({type:'undo'}),[])
  const redo=useCallback(()=>dispatch({type:'redo'}),[])
  const reset=useCallback((doc:MapDocument)=>dispatch({type:'reset',doc}),[])
  return {doc:state.present,commit,undo,redo,reset,canUndo:state.past.length>0,canRedo:state.future.length>0}
}

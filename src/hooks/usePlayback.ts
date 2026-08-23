
import {useEffect,useState} from "react";

export function usePlayback(total:number){
 const [playing,setPlaying]=useState(false);
 const [index,setIndex]=useState(0);
 const [speed,setSpeed]=useState(5);

 useEffect(()=>{
  if(!playing)return;
  const timer=setInterval(()=>{
   setIndex(v=>v<total-1?v+1:v);
  },Math.max(30,500/speed));

  return ()=>clearInterval(timer);
 },[playing,total,speed]);

 return {playing,setPlaying,index,setIndex,speed,setSpeed};
}

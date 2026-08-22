
import { useState } from "react";
import { Play, Pause, MapPin, Activity } from "lucide-react";
import TrackingMap from "../components/TrackingMap";

export default function Dashboard(){

 const [running,setRunning]=useState(false);

 return (
 <div className="h-screen bg-slate-950 overflow-hidden">

  <header className="
   h-16 flex items-center justify-between
   px-6 bg-slate-900/90 backdrop-blur
   border-b border-white/10 text-white
  ">

   <div className="flex items-center gap-3">
    <div className="p-2 rounded-xl bg-blue-500/20">
     <MapPin className="text-blue-400"/>
    </div>

    <div>
     <h1 className="font-bold text-lg">
      Object Tracking
     </h1>
     <p className="text-xs text-slate-400">
      Live route monitoring panel
     </p>
    </div>
   </div>


   <button
    className={`
     cursor-pointer flex items-center gap-2
     px-5 py-2.5 rounded-xl font-semibold
     transition-all shadow-lg
     ${running
       ?"bg-red-500 hover:bg-red-400"
       :"bg-blue-600 hover:bg-blue-500"}
     text-white
    `}
    onClick={()=>setRunning(!running)}
   >

   {
    running
    ?
    <>
     <Pause size={18}/>
     Stop Tracking
    </>
    :
    <>
     <Play size={18}/>
     Start Tracking
    </>
   }

   </button>

  </header>


  <div className="relative h-[calc(100vh-64px)]">

   <TrackingMap
    running={running}
    setRunning={setRunning}
   />


   <div className="
    absolute right-5 top-5 z-[1000]
    flex gap-3
   ">

    <div className="
     bg-slate-900/90 backdrop-blur
     border border-white/10
     rounded-2xl px-4 py-3
     text-white
    ">
     <div className="flex items-center gap-2 text-sm">
      <Activity size={16} className="text-green-400"/>
      Status
     </div>
     <div className="font-bold mt-1">
      {running?"Moving":"Stopped"}
     </div>
    </div>

   </div>

  </div>

 </div>
 )

}

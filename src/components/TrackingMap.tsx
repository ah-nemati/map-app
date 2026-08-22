
import { MapContainer, TileLayer, Polyline, Marker, Popup } from "react-leaflet";
import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import route from "../data/route.json";

const icon = L.divIcon({
  className: "",
  html: `<div style="font-size:32px">🚶</div>`,
  iconSize: [40,40]
});

export default function TrackingMap({
  running,
  setRunning
}:{
  running:boolean;
  setRunning:(v:boolean)=>void;
}){

const [points] = useState(
 route.geometry.coordinates.map(
  (p:any)=>[p[1],p[0]] as [number,number]
 )
);

const [index,setIndex]=useState(0);

const activeRef=useRef<HTMLDivElement|null>(null);

useEffect(()=>{

 if(activeRef.current){
   activeRef.current.scrollIntoView({
    behavior:"smooth",
    block:"center"
   });
 }

},[index]);


useEffect(()=>{

 if(!running) return;

 const timer=setInterval(()=>{

  setIndex(v=>{

   if(v>=points.length-1){
    setRunning(false);
    return v;
   }

   return v+1;

  });

 },80);

 return ()=>clearInterval(timer);

},[running,points.length,setRunning]);


const current=points[index];
const next=points[index+1] || current;


return <div className="relative h-[calc(100vh-56px)]">

<MapContainer
center={points[0]}
zoom={15}
className="h-full w-full"
>

<TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"/>

<Polyline positions={points}/>

<Marker position={current} icon={icon}>
<Popup>
Current point {index+1}
</Popup>
</Marker>

</MapContainer>


<div className="absolute left-4 top-4 z-[1000] w-80 bg-white rounded-2xl shadow-xl p-4">

<h2 className="font-bold mb-3">
Tracking Points
</h2>

<div className="text-sm mb-4">
From:
{current[0].toFixed(6)}, {current[1].toFixed(6)}

<br/>

➡️ To:
{next[0].toFixed(6)}, {next[1].toFixed(6)}
</div>


<div className="max-h-72 overflow-auto">

{
points.map((p,i)=>

<div
ref={i===index ? activeRef : null}
key={i}
className={
`
flex justify-between border-b py-2 text-xs transition
${i===index
? "bg-blue-100 rounded-lg border-blue-500"
: ""}
`
}
>

<span>
{i===index && "🚶 Current "}
Point {i+1}
<br/>
{p[0].toFixed(5)}, {p[1].toFixed(5)}
</span>

</div>

)

}

</div>

</div>

</div>

}

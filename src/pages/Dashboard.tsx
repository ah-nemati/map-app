
import {useState} from "react";
import TrackingMap from "../components/TrackingMap";

export default function Dashboard(){

const [running,setRunning]=useState(false);

return <div>

<header className="h-14 bg-gray-900 text-white p-4 flex justify-between">

<span>
Tracking Dashboard
</span>

<button
className={
`
cursor-pointer px-5 rounded
${running
? "bg-red-600"
: "bg-green-600"}
`
}
onClick={()=>setRunning(!running)}
>

{
running
? "Stop Movement"
: "Start Movement"
}

</button>

</header>

<TrackingMap
running={running}
setRunning={setRunning}
/>

</div>

}

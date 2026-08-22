import {MapContainer,TileLayer,Polyline,Marker,Popup} from "react-leaflet";
import data from "../data/tracking.json";

export default function TrackingMap(){
 const positions=data.points.map(
  p=>[p.lat,p.lng] as [number,number]
 );

 return <MapContainer center={positions[0]} zoom={14} className="h-[calc(100vh-56px)] w-full">
  <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"/>
  <Polyline positions={positions}/>
  <Marker position={positions.at(-1)!}>
   <Popup>{data.id}</Popup>
  </Marker>
 </MapContainer>
}

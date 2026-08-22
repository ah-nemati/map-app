import TrackingMap from "../components/TrackingMap";
import {useAuth} from "../auth/AuthContext";

export default function Dashboard(){
 const {logout}=useAuth();
 return <div>
  <header className="h-14 bg-gray-900 text-white p-4 flex justify-between">
   <span>Tracking Dashboard</span>
   <button onClick={logout}>Logout</button>
  </header>
  <TrackingMap/>
 </div>
}

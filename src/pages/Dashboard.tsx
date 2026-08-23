import {useState} from 'react';
import {Gauge,Route,Navigation,LogOut,Truck,MapPin,Clock,Play,Pause} from 'lucide-react';
import {motion} from 'framer-motion';
import TrackingMap from '../components/TrackingMap';
import {useAuth} from '../auth/AuthContext';
import {Button} from '../components/ui/Button';
import {Card} from '../components/ui/Card';
import {Badge} from '../components/ui/Badge';
import {Progress} from '../components/ui/Progress';

interface Stats{speed:number;distance:number;percent:number;eta:string}

export default function Dashboard(){
 const [running,setRunning]=useState(false);
 const [stats,setStats]=useState<Stats>({speed:0,distance:0,percent:0,eta:'در انتظار'});
 const {user,logout}=useAuth();
 return <main className="dashboard" dir="rtl">
  <header className="topbar">
   <div className="brand"><Truck/><div><h1>سامانه هوشمند رهگیری ناوگان</h1><span>مسیر واقعی جاده‌ای ایران</span></div></div>
   <Button onClick={logout}><LogOut size={18}/> {user?.username||'کاربر'}</Button>
  </header>
  <section className="tracking-layout">
   <div className="map-container"><TrackingMap running={running} setRunning={setRunning} onStats={setStats}/></div>
   <aside className="sidebar">
    <Card><h3>وضعیت خودرو</h3><Badge>{running?'🟢 در حال حرکت':'⏸ آماده'}</Badge><p><Navigation size={15}/> GPS متصل</p></Card>
    <div className="metrics">
     <Metric icon={<Gauge/>} title="سرعت" value={`${stats.speed} km/h`}/>
     <Metric icon={<Route/>} title="مسافت" value={`${stats.distance} km`}/>
    </div>
    <Card><h3>مسیر</h3><p><MapPin/> تهران → بندرعباس</p><Progress value={stats.percent}/><strong>{stats.percent}%</strong></Card>
    <Card><h3>رسیدن</h3><p><Clock/> {stats.eta}</p></Card>
    <Button onClick={()=>setRunning(!running)}>{running?<><Pause/> توقف</>:<><Play/> شروع حرکت</>}</Button>
   </aside>
  </section>
 </main>
}
function Metric({icon,title,value}:{icon:React.ReactNode;title:string;value:string}){return <motion.div className="metric-card" animate={{scale:[1,1.02,1]}} transition={{duration:.4}}><span>{icon}</span><div><small>{title}</small><strong>{value}</strong></div></motion.div>}

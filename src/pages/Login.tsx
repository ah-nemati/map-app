import {useState} from "react";
import {useNavigate} from "react-router-dom";
import {useAuth} from "../auth/AuthContext";
import {motion} from "framer-motion";
import {MapPin} from "lucide-react";

export default function Login(){

const [username,setUsername]=useState("");
const [password,setPassword]=useState("");
const {login}=useAuth();
const navigate=useNavigate();

function submit(){
 if(login(username,password)){
  navigate("/dashboard");
 }
}

return (
<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950">

<motion.div
initial={{opacity:0,y:30}}
animate={{opacity:1,y:0}}
transition={{duration:.5}}
className="w-full max-w-md rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 p-8 shadow-2xl"
>

<div className="flex justify-center mb-6">
<div className="rounded-full bg-blue-500/20 p-4">
<MapPin className="text-blue-400" size={40}/>
</div>
</div>

<h1 className="text-3xl text-white text-center font-bold">
Tracking Panel
</h1>

<p className="text-slate-300 text-center mt-2 mb-8">
Real Time Object Tracking
</p>

<input
className="w-full rounded-xl bg-white/10 border border-white/20 p-3 text-white outline-none mb-4"
placeholder="Username"
onChange={e=>setUsername(e.target.value)}
/>

<input
className="w-full rounded-xl bg-white/10 border border-white/20 p-3 text-white outline-none mb-6"
placeholder="Password"
type="password"
onChange={e=>setPassword(e.target.value)}
/>

<button
onClick={submit}
className="w-full rounded-xl bg-blue-600 hover:bg-blue-500 text-white py-3 font-semibold transition"
>
Login
</button>

</motion.div>

</div>
)
}

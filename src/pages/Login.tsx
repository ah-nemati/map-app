import {useState} from "react";
import {useNavigate} from "react-router-dom";
import {useAuth} from "../auth/AuthContext";

export default function Login(){
 const [username,setUsername]=useState("");
 const [password,setPassword]=useState("");
 const {login}=useAuth();
 const nav=useNavigate();

 function submit(){
  if(login(username,password)) nav("/dashboard");
  else alert("Invalid login");
 }

 return <div className="h-screen flex items-center justify-center bg-gray-100">
  <div className="bg-white p-8 rounded shadow w-80">
   <h1 className="text-xl mb-4">Tracking Panel</h1>
   <input className="border p-2 w-full mb-3" placeholder="username"
    onChange={e=>setUsername(e.target.value)}/>
   <input className="border p-2 w-full mb-3" placeholder="password" type="password"
    onChange={e=>setPassword(e.target.value)}/>
   <button className="bg-black text-white px-4 py-2 w-full" onClick={submit}>
    Login
   </button>
  </div>
 </div>
}

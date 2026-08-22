import { createContext,useContext,useState } from "react";
import users from "./users.json";

const AuthContext=createContext<any>(null);

export function AuthProvider({children}:{children:React.ReactNode}){
 const [user,setUser]=useState(
  JSON.parse(localStorage.getItem("user") || "null")
 );

 function login(username:string,password:string){
  const found=users.find(
   (u)=>u.username===username && u.password===password
  );
  if(found){
   setUser(found);
   localStorage.setItem("user",JSON.stringify(found));
   return true;
  }
  return false;
 }

 function logout(){
  setUser(null);
  localStorage.removeItem("user");
 }

 return <AuthContext.Provider value={{user,login,logout}}>
  {children}
 </AuthContext.Provider>
}

export const useAuth=()=>useContext(AuthContext);

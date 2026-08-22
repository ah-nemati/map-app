import { Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ProtectedRoute from "./auth/ProtectedRoute";

export default function App(){
 return <Routes>
  <Route path="/login" element={<Login/>}/>
  <Route path="/dashboard" element={
    <ProtectedRoute><Dashboard/></ProtectedRoute>
  }/>
  <Route path="*" element={<Login/>}/>
 </Routes>
}

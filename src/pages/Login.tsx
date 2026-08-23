
import { useState } from "react";
import { Truck, Lock, User } from "lucide-react";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { useAuth } from "../auth/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username,setUsername] = useState("");
  const [password,setPassword] = useState("");

  function submit(e:React.FormEvent){
    e.preventDefault();
    const success = login(username, password);

    if (success) {
      navigate("/dashboard");
    } else {
      alert("نام کاربری یا رمز عبور اشتباه است");
    }
  }

  return (
    <main className="login-page">
      <Card className="login-card">
        <div className="login-logo">
          <div className="logo-circle"><Truck size={42}/></div>
          <h1>سامانه هوشمند رهگیری ناوگان</h1>
          <p>مدیریت مسیرهای جاده‌ای ایران</p>
        </div>

        <form className="login-form" onSubmit={submit}>
          <label>نام کاربری</label>
          <div className="input-wrapper">
            <User size={18}/>
            <Input placeholder="نام کاربری" value={username} onChange={e=>setUsername(e.target.value)} />
          </div>

          <label>رمز عبور</label>
          <div className="input-wrapper">
            <Lock size={18}/>
            <Input placeholder="رمز عبور" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
          </div>

          <Button>ورود به سامانه</Button>
        </form>
      </Card>
    </main>
  );
}

import { useState } from "react";
import { Truck, Lock, User, ShieldCheck, ArrowLeft } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { useAuth } from "../auth/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("123456");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage("");
    setLoading(true);

    setTimeout(() => {
      const success = login(username, password);
      setLoading(false);

      if (success) {
        navigate("/dashboard");
      } else {
        setErrorMessage("نام کاربری یا رمز عبور اشتباه است.");
      }
    }, 200);
  }

  return (
    <main className="login-page">
      <div className="login-backdrop-glow" />

      <div className="login-card">
        <div className="login-logo">
          <div className="logo-circle">
            <Truck size={36} />
          </div>
          <h1>سامانه هوشمند مانیتورینگ ناوگان</h1>
          <p>مدیریت و پایش ماهواره‌ای مسیرهای ترانزیتی کشور</p>
        </div>

        {errorMessage && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-500">
            <span>⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        <form className="login-form" onSubmit={submit}>
          <div className="input-field-group">
            <label>نام کاربری</label>
            <div className="input-wrapper">
              <User size={18} className="text-slate-400" />
              <Input
                placeholder="نام کاربری خود را وارد کنید"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="input-field-group">
            <label>رمز عبور</label>
            <div className="input-wrapper">
              <Lock size={18} className="text-slate-400" />
              <Input
                placeholder="رمز عبور"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full mt-2"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                در حال احراز هویت...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <span>ورود به سامانه</span>
                <ArrowLeft size={18} />
              </span>
            )}
          </Button>
        </form>

        <div className="credentials-hint">
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={16} className="text-emerald-500" />
            <span>اطلاعات ورود دمو:</span>
          </div>
          <div>
            <code>admin</code> / <code>۱۲۳۴۵۶</code>
          </div>
        </div>
      </div>
    </main>
  );
}

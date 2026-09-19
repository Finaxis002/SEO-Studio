"use client";

import { useState } from "react";
import { LockKeyhole, Mail, Loader2, Sparkles, TrendingUp, Search, Award, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginForm({ onSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Login failed");
      onSuccess(data.user);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_hsl(262_83%_58%_/_0.14),_transparent_34%),linear-gradient(135deg,_hsl(220_20%_98%),_hsl(262_30%_96%))] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      
      {/* Main Split-Screen Container */}
      <div className="w-full max-w-5xl bg-background/95 rounded-3xl border border-border shadow-2xl shadow-violet-900/10 overflow-hidden grid grid-cols-1 lg:grid-cols-2">
        
        {/* Left Side: Login Form */}
        <div className="p-8 sm:p-12 flex flex-col justify-between">
          <div>
            {/* Top Logo / Brand */}
            <div className="mb-8 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/25">
                <Sparkles className="h-5 w-5" />
              </span>
              <div>
                <p className="text-lg font-bold tracking-tight">SEO Studio</p>
                <p className="text-xs text-muted-foreground">
                  Content operations workspace
                </p>
              </div>
            </div>

            {/* Header Text */}
            <div className="mb-6">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">Welcome back!</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Simplify your workflow and boost your SEO. Get started for free.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email / Username</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="pl-9 h-11 bg-gray-50/50 border-gray-200 focus:ring-violet-600"
                    placeholder="you@company.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="login-password">Password</Label>
               
                </div>
                <div className="relative">
                  <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="pl-9 pr-10 h-11 bg-gray-50/50 border-gray-200 focus:ring-violet-600"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-semibold shadow-lg shadow-indigo-500/25 transition-all duration-200"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Login
              </Button>
            </form>
          </div>

          {/* Footer Register Link */}
        
        </div>

        {/* Right Side: SEO Graphic / Illustration Panel */}
        <div className="hidden lg:flex flex-col items-center justify-center bg-violet-50/40 p-8 relative overflow-hidden border-l border-border/50">
          
          {/* Decorative Card Box */}
          <div className="relative w-full max-w-sm bg-background border border-violet-100 rounded-3xl p-6 shadow-sm flex flex-col items-center">
            
            {/* Floating Badge Top-Left */}
            <div className="absolute -top-4 left-6 w-12 h-12 rounded-full bg-violet-100 border-2 border-background flex items-center justify-center text-violet-600 shadow-md">
              <TrendingUp className="h-5 w-5" />
            </div>

            {/* Floating Badge Top-Right */}
            <div className="absolute top-12 -right-4 w-12 h-12 rounded-full bg-indigo-100 border-2 border-background flex items-center justify-center text-indigo-600 shadow-md">
              <Search className="h-5 w-5" />
            </div>

            {/* Central Graphic Area */}
            <div className="w-44 h-44 my-4 bg-gradient-to-br from-violet-100/70 to-indigo-100/70 rounded-full flex items-center justify-center text-violet-600 relative">
              <Award className="h-20 w-20 text-violet-600 animate-pulse" />
              
              {/* Inner Mini Analytics Tag */}
              <div className="absolute -bottom-2 -left-2 bg-background px-3 py-2 rounded-2xl shadow-md border border-border flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 flex items-center justify-center text-white text-[10px] font-bold">SEO</div>
                <div>
                  <p className="text-[10px] font-bold text-foreground">Rank #1</p>
                  <p className="text-[9px] text-emerald-600 font-semibold">+84% Organic</p>
                </div>
              </div>
            </div>

            {/* Slider Dots */}
            <div className="flex gap-1.5 my-4">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-300"></span>
              <span className="w-4 h-1.5 rounded-full bg-violet-600"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-violet-300"></span>
            </div>

            {/* Dynamic SEO Label */}
            <div className="text-center mt-2">
              <h2 className="text-sm font-bold text-foreground">Make your work easier and organized</h2>
              <p className="text-xs text-muted-foreground mt-1">Dominate search engines with SEO Studio</p>
            </div>
          </div>

        </div>

      </div>
    </main>
  );
}
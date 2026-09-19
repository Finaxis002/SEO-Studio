
"use client";

import { useState } from "react";
import {
  LockKeyhole,
  Mail,
  Loader2,
  Sparkles,
  Eye,
  EyeOff,
} from "lucide-react";

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

    // -----------------------------
    // Frontend validation
    // -----------------------------

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Login failed");
      }

      onSuccess(data.user);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Login failed"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#c7edfb]">
      {/* =========================================================
          BACKGROUND ILLUSTRATION
          ========================================================= */}
      <div
        className="
          absolute inset-0
          bg-cover
          bg-center
          bg-no-repeat

          max-sm:bg-[position:88%_center]
          sm:bg-[position:84%_center]
          md:bg-[position:80%_center]
          lg:bg-[position:76%_center]
          xl:bg-[position:72%_center]
        "
        style={{
          backgroundImage: "url('/logbg.png')",
        }}
      />

      {/* =========================================================
          BACKGROUND OVERLAY
          ========================================================= */}
      <div className="absolute inset-0" />

      {/* =========================================================
          LOGIN CONTENT
          ========================================================= */}
      <div className="relative z-10 min-h-screen">
        <div
          className="
            flex
            min-h-screen
            items-center
            justify-end
            px-5
            py-8

            sm:px-8
            md:px-12
            lg:px-16
            xl:px-24
          "
        >
          <div
            className="
              w-full
              max-w-md

              lg:mr-[4vw]
              xl:mr-[7vw]
            "
          >
            {/* =====================================================
                LOGIN CARD
                ===================================================== */}
            <div
              className="
                rounded-3xl
                border
                border-white/70
                bg-white/85
                p-6
                shadow-2xl
                shadow-[#30276f]/10

                sm:p-8
              "
            >
              {/* =================================================
                  BRAND
                  ================================================= */}
              <div className="mb-7 flex items-center gap-3">
                <span
                  className="
                    flex
                    h-11
                    w-11
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    bg-[#30276f]
                    text-white
                    shadow-lg
                    shadow-[#30276f]/25
                  "
                >
                  <Sparkles className="h-5 w-5" />
                </span>

                <div>
                  <p
                    className="
                      text-lg
                      font-bold
                      tracking-tight
                      text-[#211c4d]
                    "
                  >
                    SEO Studio
                  </p>

                  <p className="text-xs text-slate-600">
                    Content operations workspace
                  </p>
                </div>
              </div>

              {/* =================================================
                  HEADING
                  ================================================= */}
              <div className="mb-7">
                <h1
                  className="
                    text-2xl
                    font-extrabold
                    tracking-tight
                    text-[#211c4d]

                    sm:text-3xl
                  "
                >
                  Welcome back!
                </h1>

                <p
                  className="
                    mt-2
                    text-sm
                    leading-relaxed
                    text-slate-600
                  "
                >
                  Simplify your workflow and boost your SEO. Get
                  started for free.
                </p>
              </div>

              {/* =================================================
                  LOGIN FORM
                  ================================================= */}
              <form onSubmit={submit} className="space-y-5">
                {/* =================================================
                    EMAIL
                    ================================================= */}
                <div className="space-y-2">
                  <Label
                    htmlFor="login-email"
                    className="text-sm font-medium text-slate-700"
                  >
                    Email / Username
                  </Label>

                  <div className="relative">
                    <Mail
                      className="
                        absolute
                        left-3.5
                        top-1/2
                        h-4
                        w-4
                        -translate-y-1/2
                        text-slate-400
                      "
                    />

                    <Input
                      id="login-email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(event) => {
                        setEmail(event.target.value);

                        if (error) {
                          setError("");
                        }
                      }}
                      placeholder="you@company.com"
                      className="
                        h-11

                        border-slate-200
                        bg-white/80

                        pl-10

                        text-slate-800
                        placeholder:text-slate-400

                        focus:border-[#30276f]
                        focus:ring-[#30276f]/20
                      "
                    />
                  </div>
                </div>

                {/* =================================================
                    PASSWORD
                    ================================================= */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="login-password"
                      className="text-sm font-medium text-slate-700"
                    >
                      Password
                    </Label>

                    <span className="text-xs text-slate-500">
                      Min. 8 characters
                    </span>
                  </div>

                  <div className="relative">
                    <LockKeyhole
                      className="
                        absolute
                        left-3.5
                        top-1/2
                        h-4
                        w-4
                        -translate-y-1/2
                        text-slate-400
                      "
                    />

                    <Input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      minLength={8}
                      value={password}
                      onChange={(event) => {
                        setPassword(event.target.value);

                        if (error) {
                          setError("");
                        }
                      }}
                      placeholder="Enter your password"
                      className="
                        h-11

                        border-slate-200
                        bg-white/80

                        pl-10
                        pr-11

                        text-slate-800
                        placeholder:text-slate-400

                        focus:border-[#30276f]
                        focus:ring-[#30276f]/20
                      "
                    />

                    {/* Show / Hide Password */}
                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(!showPassword)
                      }
                      className="
                        absolute
                        right-3.5
                        top-1/2
                        -translate-y-1/2

                        text-slate-400

                        transition-colors
                        hover:text-[#30276f]

                        focus:outline-none
                      "
                      aria-label={
                        showPassword
                          ? "Hide password"
                          : "Show password"
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* =================================================
                    ERROR
                    ================================================= */}
                {error && (
                  <p
                    className="
                      rounded-lg

                      border
                      border-rose-200

                      bg-rose-50

                      px-3
                      py-2

                      text-sm
                      text-rose-700
                    "
                  >
                    {error}
                  </p>
                )}

                {/* =================================================
                    LOGIN BUTTON
                    ================================================= */}
                <Button
                  type="submit"
                  disabled={loading}
                  className="
                    h-11
                    w-full

                    bg-[#30276f]
                    text-white

                    font-semibold

                    shadow-lg
                    shadow-[#30276f]/25

                    transition-all
                    duration-200

                    hover:bg-[#27205d]
                    hover:shadow-xl
                    hover:shadow-[#30276f]/30

                    disabled:cursor-not-allowed
                    disabled:opacity-70
                  "
                >
                  {loading && (
                    <Loader2
                      className="
                        mr-2
                        h-4
                        w-4
                        animate-spin
                      "
                    />
                  )}

                  Login
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}


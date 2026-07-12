"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye, EyeOff, Lock, Mail, User, ShieldAlert } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  loginSchema,
  signupSchema,
  type LoginInput,
  type SignupInput,
} from "@/lib/validators/auth.schema";

function LoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab");

  const [activeTab, setActiveTab] = useState<"login" | "signup">(
    tabParam === "signup" ? "signup" : "login"
  );
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (tabParam === "signup") {
      setActiveTab("signup");
    } else {
      setActiveTab("login");
    }
  }, [tabParam]);

  // Login form handler
  const {
    register: registerLogin,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors },
    reset: resetLoginForm,
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  // Signup form handler
  const {
    register: registerSignup,
    handleSubmit: handleSignupSubmit,
    formState: { errors: signupErrors },
    reset: resetSignupForm,
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: { fullName: "", email: "", password: "" },
  });

  const onLogin = async (data: LoginInput) => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsLoading(false);
    toast.success("Successfully logged in!");
    router.push("/dashboard");
  };

  const onSignup = async (data: SignupInput) => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsLoading(false);
    toast.success("Account created successfully as Employee!", {
      description: "Ask your administrator to assign role promotion if needed.",
    });
    resetSignupForm();
    setActiveTab("login");
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4 py-12 sm:px-6 lg:px-8">
      {/* Background decorations */}
      <div className="absolute top-1/4 left-1/4 -z-10 h-72 w-72 rounded-full bg-primary/10 blur-3xl dark:bg-primary/5" />
      <div className="absolute bottom-1/4 right-1/4 -z-10 h-72 w-72 rounded-full bg-positive/10 blur-3xl dark:bg-positive/5" />

      {/* Main card */}
      <div className="w-full max-w-[420px] space-y-6">
        <div className="flex flex-col items-center text-center space-y-2">
          {/* Logo container */}
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary to-[#b4d6ff] shadow-md shadow-primary/20">
            <span className="text-2xl font-bold text-primary-foreground tracking-wider">AF</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Asset<span className="text-primary-foreground/80 dark:text-primary">Flow</span>
          </h1>
          <p className="text-sm text-muted-foreground font-medium">
            Enterprise Asset & Resource Management
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-8 shadow-xl backdrop-blur-xl transition-all duration-300">
          {/* Tab headers */}
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1 mb-6">
            <button
              onClick={() => {
                setActiveTab("login");
                resetLoginForm();
              }}
              className={`rounded-md py-2 text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
                activeTab === "login"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setActiveTab("signup");
                resetSignupForm();
              }}
              className={`rounded-md py-2 text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
                activeTab === "signup"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Register
            </button>
          </div>

          {activeTab === "login" ? (
            <form onSubmit={handleLoginSubmit(onLogin)} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground/80" htmlFor="login-email">
                  Email Address
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <input
                    id="login-email"
                    type="email"
                    placeholder="name@company.com"
                    disabled={isLoading}
                    className="block w-full rounded-lg border border-input bg-background py-2.5 pl-10 pr-3 text-sm text-foreground placeholder-muted-foreground outline-none transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                    {...registerLogin("email")}
                  />
                </div>
                {loginErrors.email && (
                  <p className="text-xs font-medium text-destructive mt-1">{loginErrors.email.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground/80" htmlFor="login-password">
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-xs font-semibold text-primary hover:underline transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    disabled={isLoading}
                    className="block w-full rounded-lg border border-input bg-background py-2.5 pl-10 pr-10 text-sm text-foreground placeholder-muted-foreground outline-none transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                    {...registerLogin("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {loginErrors.password && (
                  <p className="text-xs font-medium text-destructive mt-1">{loginErrors.password.message}</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full justify-center bg-primary text-primary-foreground py-5 text-sm font-semibold shadow-md hover:bg-primary/90 focus-visible:ring-primary/50"
              >
                {isLoading ? "Signing In..." : "Sign In to AssetFlow"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSignupSubmit(onSignup)} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground/80" htmlFor="signup-name">
                  Full Name
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <input
                    id="signup-name"
                    type="text"
                    placeholder="John Doe"
                    disabled={isLoading}
                    className="block w-full rounded-lg border border-input bg-background py-2.5 pl-10 pr-3 text-sm text-foreground placeholder-muted-foreground outline-none transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                    {...registerSignup("fullName")}
                  />
                </div>
                {signupErrors.fullName && (
                  <p className="text-xs font-medium text-destructive mt-1">{signupErrors.fullName.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground/80" htmlFor="signup-email">
                  Email Address
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <input
                    id="signup-email"
                    type="email"
                    placeholder="name@company.com"
                    disabled={isLoading}
                    className="block w-full rounded-lg border border-input bg-background py-2.5 pl-10 pr-3 text-sm text-foreground placeholder-muted-foreground outline-none transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                    {...registerSignup("email")}
                  />
                </div>
                {signupErrors.email && (
                  <p className="text-xs font-medium text-destructive mt-1">{signupErrors.email.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground/80" htmlFor="signup-password">
                  Password
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <input
                    id="signup-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    disabled={isLoading}
                    className="block w-full rounded-lg border border-input bg-background py-2.5 pl-10 pr-10 text-sm text-foreground placeholder-muted-foreground outline-none transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                    {...registerSignup("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {signupErrors.password && (
                  <p className="text-xs font-medium text-destructive mt-1">{signupErrors.password.message}</p>
                )}
              </div>

              {/* Requirement: Info Banner/Disclaimer for Employee account creation */}
              <div className="rounded-lg border border-positive-foreground/10 bg-positive/40 dark:bg-positive/10 p-3.5 text-xs text-positive-foreground dark:text-positive flex items-start space-x-2">
                <ShieldAlert className="h-4 w-4 shrink-0 text-positive-foreground/80 dark:text-positive mt-0.5" />
                <span>
                  Creating an account registers you as an **Employee**. Administrative and management roles can only be assigned later by an Administrator.
                </span>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full justify-center bg-primary text-primary-foreground py-5 text-sm font-semibold shadow-md hover:bg-primary/90 focus-visible:ring-primary/50"
              >
                {isLoading ? "Creating Account..." : "Create Employee Account"}
              </Button>
            </form>
          )}

          {/* Divider and Toggle */}
          <div className="mt-6 flex flex-col space-y-4">
            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-border"></div>
              <span className="flex-shrink mx-4 text-muted-foreground text-xs font-semibold uppercase">Or</span>
              <div className="flex-grow border-t border-border"></div>
            </div>

            {activeTab === "login" ? (
              <div className="text-center">
                <span className="text-xs text-muted-foreground">New here? </span>
                <button
                  onClick={() => setActiveTab("signup")}
                  className="text-xs font-semibold text-primary hover:underline transition-all"
                >
                  Create an account
                </button>
              </div>
            ) : (
              <div className="text-center">
                <span className="text-xs text-muted-foreground">Already have an account? </span>
                <button
                  onClick={() => setActiveTab("login")}
                  className="text-xs font-semibold text-primary hover:underline transition-all"
                >
                  Sign in
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-sm font-medium">Loading AssetFlow Auth...</p>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}

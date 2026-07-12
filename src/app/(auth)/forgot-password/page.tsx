"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

const forgotPasswordSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email address"),
});

type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data: ForgotPasswordInput) => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsLoading(false);
    setIsSubmitted(true);
    toast.success("Reset link sent!", {
      description: `A password recovery link has been sent to ${data.email}`,
    });
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
            Asset<span className="text-primary">Flow</span>
          </h1>
          <p className="text-sm text-muted-foreground font-medium">
            Enterprise Asset & Resource Management
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-8 shadow-xl backdrop-blur-xl transition-all duration-300">
          {!isSubmitted ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-foreground">Forgot Password</h2>
                <p className="text-xs text-muted-foreground">
                  Enter your email address and we'll send you a recovery link to reset your password.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground/80" htmlFor="reset-email">
                  Email Address
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <input
                    id="reset-email"
                    type="email"
                    placeholder="name@company.com"
                    disabled={isLoading}
                    className="block w-full rounded-lg border border-input bg-background py-2.5 pl-10 pr-3 text-sm text-foreground placeholder-muted-foreground outline-none transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                    {...register("email")}
                  />
                </div>
                {errors.email && (
                  <p className="text-xs font-medium text-destructive mt-1">{errors.email.message}</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full justify-center bg-primary text-primary-foreground py-5 text-sm font-semibold shadow-md hover:bg-primary/90 focus-visible:ring-primary/50"
              >
                {isLoading ? "Sending..." : "Send Reset Link"}
              </Button>
            </form>
          ) : (
            <div className="space-y-6 text-center py-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-positive/10 text-positive-foreground dark:text-positive">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-medium text-foreground">Check your email</h3>
                <p className="text-xs text-muted-foreground">
                  We've sent a password recovery link to your email address. Follow the instructions in the email to set a new password.
                </p>
              </div>
              <button
                onClick={() => setIsSubmitted(false)}
                className="text-xs text-primary hover:underline font-semibold"
              >
                Resend email
              </button>
            </div>
          )}

          {/* Back to Login link */}
          <div className="mt-6 pt-4 border-t border-border flex justify-center">
            <Link
              href="/login"
              className="inline-flex items-center space-x-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Sign In</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

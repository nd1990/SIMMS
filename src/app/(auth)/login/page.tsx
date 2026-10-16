"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import Link from "next/link";
import { loginSchema, type LoginInput } from "@/lib/validations";
import { getHomePath } from "@/lib/permissions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { BrandLogo } from "@/components/brand-logo";

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", remember: false },
  });

  async function onSubmit(values: LoginInput) {
    setLoading(true);
    setError(null);

    const result = await signIn("credentials", {
      email: values.email,
      password: values.password,
      remember: String(values.remember),
      redirect: false,
    });

    if (!result?.ok) {
      setLoading(false);
      setError(result?.error ?? "Invalid email or password");
      return;
    }

    // Fetch the session to learn the role and redirect accordingly.
    const res = await fetch("/api/auth/session");
    const session = await res.json();
    const role = session?.user?.role;
    toast("success", "Signed in successfully");

    const path = getHomePath(role);
    router.push(path);
    router.refresh();
  }

  return (
    <div className="w-full max-w-md">
      {/* Mobile brand header (desktop shows brand panel in layout) */}
      <div className="mb-6 flex flex-col items-center text-center lg:hidden">
        <span className="mb-3 dark:hidden">
          <BrandLogo className="h-14" />
        </span>
        <span className="mb-3 hidden dark:block">
          <BrandLogo onDark className="h-14" />
        </span>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          CT Testing Management
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          66 KV Current Transformer testing and reporting system
        </p>
      </div>

      {/* Desktop title */}
      <div className="mb-6 hidden lg:block">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Sign in</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Welcome back — enter your credentials to continue
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-6 lg:hidden">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Sign in</h2>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Enter your credentials to continue</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              autoComplete="email"
              className="h-11"
              {...register("email")}
            />
            {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                autoComplete="current-password"
                className="h-11 pr-10"
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 accent-slate-900 dark:border-slate-600"
                {...register("remember")}
              />
              Remember me
            </label>
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-slate-900 hover:underline dark:text-white"
            >
              Forgot password?
            </Link>
          </div>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Sign in
          </Button>
        </form>
      </div>

      <p className="mt-4 text-center text-xs text-slate-400 dark:text-slate-500">
        For field work, install this app on your phone or tablet for offline drafts.
      </p>
    </div>
  );
}
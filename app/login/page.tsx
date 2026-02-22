"use client";

import Link from "next/link";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, CheckCircle2, Loader2, ShieldCheck, Sparkles, UserRound } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (loginError) {
      setError(loginError.message);
    } else {
      router.push("/dashboard");
    }

    setLoading(false);
  };

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      setError(signUpError.message);
    } else {
      setSuccess("Account created successfully. You can sign in now.");
    }

    setLoading(false);
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr] min-h-[calc(100vh-220px)]">
      <Card className="border-0 shadow-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-primary/20 text-slate-100 relative overflow-hidden fade-up">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.2),transparent_50%)]" />
        <CardHeader className="relative">
          <CardTitle className="text-4xl font-bold">Welcome Back</CardTitle>
          <CardDescription className="text-slate-300 text-lg mt-2">
            Track, report, and resolve civic issues with a faster workflow.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm relative">
          <div className="rounded-xl bg-white/10 backdrop-blur-sm p-5 flex items-start gap-3 border border-white/20 hover:bg-white/15 transition-colors">
            <Sparkles className="h-5 w-5 mt-0.5 text-blue-300" />
            <p className="text-slate-200 leading-relaxed">Submit issues in under a minute with location and photo support.</p>
          </div>
          <div className="rounded-xl bg-white/10 backdrop-blur-sm p-5 flex items-start gap-3 border border-white/20 hover:bg-white/15 transition-colors">
            <ShieldCheck className="h-5 w-5 mt-0.5 text-emerald-300" />
            <p className="text-slate-200 leading-relaxed">Get reliable updates from city teams as status changes.</p>
          </div>
          <div className="rounded-xl bg-white/10 backdrop-blur-sm p-5 flex items-start gap-3 border border-white/20 hover:bg-white/15 transition-colors">
            <UserRound className="h-5 w-5 mt-0.5 text-amber-300" />
            <p className="text-slate-200 leading-relaxed">
              Admin account? Use{" "}
              <Link href="/admin/auth" className="underline underline-offset-2 font-semibold hover:text-white transition-colors">
                dedicated admin login
              </Link>
              .
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="w-full border-2 shadow-2xl fade-up delay-1">
        <CardHeader>
          <CardTitle className="text-3xl font-bold">Citizen Access</CardTitle>
          <CardDescription className="text-base mt-2">Sign in or create an account to report and monitor issues.</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-4 border-status-resolved bg-status-resolved-bg">
              <CheckCircle2 className="h-4 w-4 text-status-resolved" />
              <AlertDescription className="text-status-resolved">{success}</AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-12 bg-slate-100">
              <TabsTrigger value="login" className="data-[state=active]:bg-white data-[state=active]:shadow-md">Sign In</TabsTrigger>
              <TabsTrigger value="signup" className="data-[state=active]:bg-white data-[state=active]:shadow-md">Create Account</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-5">
              <form onSubmit={login} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" disabled={loading} className="w-full" size="lg">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="mt-5">
              <form onSubmit={signUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="Create a secure password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={8}
                    required
                  />
                  <p className="text-xs text-muted-foreground">Use at least 8 characters.</p>
                </div>
                <Button type="submit" disabled={loading} className="w-full" size="lg">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    "Create Account"
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

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
import { AlertCircle, CheckCircle2, Loader2, Shield } from "lucide-react";
import type { User } from "@supabase/supabase-js";

function getUserRole(user: User | null): string | undefined {
  if (!user) return undefined;
  const metadataRole = user.user_metadata?.role;
  const appMetadataRole = user.app_metadata?.role;
  if (typeof metadataRole === "string") return metadataRole;
  if (typeof appMetadataRole === "string") return appMetadataRole;
  return undefined;
}

export default function AdminAuthPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adminCode, setAdminCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    const { error: signInError, data } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    const role = getUserRole(data.user);
    if (role !== "admin") {
      await supabase.auth.signOut();
      setError("This account is not an admin account.");
      setLoading(false);
      return;
    }

    router.push("/admin");
    setLoading(false);
  };

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    const expectedAdminCode = process.env.NEXT_PUBLIC_ADMIN_SIGNUP_CODE;
    if (expectedAdminCode && adminCode !== expectedAdminCode) {
      setError("Invalid admin signup code.");
      setLoading(false);
      return;
    }

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: "admin",
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
    } else {
      setSuccess("Admin account created successfully. You can sign in now.");
    }

    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-220px)]">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Admin Access
          </CardTitle>
          <CardDescription>Use a dedicated admin account to manage civic issues.</CardDescription>
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
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Admin Login</TabsTrigger>
              <TabsTrigger value="signup">Admin Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={login} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="admin-email">Email</Label>
                  <Input
                    id="admin-email"
                    type="email"
                    placeholder="admin@city.gov"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-password">Password</Label>
                  <Input
                    id="admin-password"
                    type="password"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Admin Sign In"
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={signUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="admin-signup-email">Email</Label>
                  <Input
                    id="admin-signup-email"
                    type="email"
                    placeholder="admin@city.gov"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-signup-password">Password</Label>
                  <Input
                    id="admin-signup-password"
                    type="password"
                    placeholder="Create password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-code">Admin Signup Code (optional)</Label>
                  <Input
                    id="admin-code"
                    type="password"
                    placeholder="Enter admin code"
                    value={adminCode}
                    onChange={(e) => setAdminCode(e.target.value)}
                  />
                </div>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating admin account...
                    </>
                  ) : (
                    "Create Admin Account"
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <p className="mt-4 text-sm text-muted-foreground text-center">
            Citizen account?{" "}
            <Link href="/login" className="font-medium underline underline-offset-2">
              Go to user login
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

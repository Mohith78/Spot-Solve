"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";

function getMetadataRole(user: User | null): "admin" | "citizen" | null {
  if (!user) return null;
  const metadataRole = user.user_metadata?.role;
  const appMetadataRole = user.app_metadata?.role;
  const roleRaw = typeof metadataRole === "string" ? metadataRole : typeof appMetadataRole === "string" ? appMetadataRole : "";
  const role = roleRaw.toLowerCase().trim();
  if (role === "admin") return "admin";
  if (role === "citizen") return "citizen";
  return "citizen";
}

export function ProfileButton() {
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [role, setRole] = useState<"admin" | "citizen" | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;

      const user = data.user;
      setEmail(user?.email ?? null);

      if (!user) {
        setRole(null);
        setLoading(false);
        return;
      }

      const { data: profileRow } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      const profileRoleRaw = typeof profileRow?.role === "string" ? profileRow.role.toLowerCase().trim() : "";
      const profileRole = profileRoleRaw === "admin" ? "admin" : profileRoleRaw === "citizen" ? "citizen" : null;
      setRole(profileRole || getMetadataRole(user));
      setLoading(false);
    };

    void loadUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      setLoading(true);
      setOpen(false);
      void loadUser();
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const label = loading ? "Profile" : role === "admin" ? "Profile (Admin)" : role === "citizen" ? "Profile (Citizen)" : "Profile";

  return (
    <div className="relative">
      <Button
        onClick={() => setOpen((v) => !v)}
        className="font-semibold shadow-md hover:shadow-lg bg-primary text-white hover:bg-primary/90 border border-primary/20"
      >
        {label}
      </Button>

      {open && (
        <div className="absolute right-0 mt-3 w-72 rounded-2xl border-2 border-primary/20 bg-white p-5 shadow-2xl z-50 text-slate-800 fade-in">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-accent-purple flex items-center justify-center text-white font-bold text-lg">
              {email?.charAt(0).toUpperCase() || "U"}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Signed in profile</p>
              <p className="text-xs text-slate-500 mt-0.5">Account details</p>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <p className="text-xs text-slate-500 mb-1">Email</p>
            <p className="text-sm font-medium break-all">{email || "Not logged in"}</p>
          </div>
          <div className="mt-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-xs text-slate-500 mb-1">Role</p>
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-white border border-primary/30 text-sm font-semibold text-primary capitalize">
              {role || "guest"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, BarChart3, MapPin, Users, Clock3, Activity, Shield, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { parseSupabaseTimestamp } from "@/lib/date";

type HomeIssue = {
  status: string;
  created_at: string;
  updated_at: string | null;
  user_id: string;
  latitude: number;
  longitude: number;
};

export default function Home() {
  const router = useRouter();
  const [statsLoading, setStatsLoading] = useState(true);
  const [resolvedCount, setResolvedCount] = useState(0);
  const [communitiesCount, setCommunitiesCount] = useState(0);
  const [avgResponseHours, setAvgResponseHours] = useState(0);
  const [activeUsersCount, setActiveUsersCount] = useState(0);

  useEffect(() => {
    let mounted = true;

    const fetchHomeStats = async () => {
      const { data, error } = await supabase
        .from("issues")
        .select("status,created_at,updated_at,user_id,latitude,longitude");

      if (!mounted) return;

      if (error || !data) {
        setStatsLoading(false);
        return;
      }

      const issues = data as HomeIssue[];
      const resolved = issues.filter((i) => i.status === "resolved");
      const activeUsers = new Set(issues.map((i) => i.user_id).filter(Boolean));

      // Approximate communities by location grid clusters (0.1 deg ~= neighborhood scale).
      const communities = new Set(
        issues
          .filter((i) => Number.isFinite(Number(i.latitude)) && Number.isFinite(Number(i.longitude)))
          .map((i) => `${Number(i.latitude).toFixed(1)},${Number(i.longitude).toFixed(1)}`)
      );

      let avgHours = 0;
      if (resolved.length > 0) {
        const totalHours = resolved.reduce((acc, issue) => {
          const created = parseSupabaseTimestamp(issue.created_at);
          const updated = parseSupabaseTimestamp(issue.updated_at ?? issue.created_at);
          if (Number.isNaN(created.getTime()) || Number.isNaN(updated.getTime())) return acc;
          return acc + (updated.getTime() - created.getTime()) / (1000 * 60 * 60);
        }, 0);
        avgHours = totalHours / resolved.length;
      }

      setResolvedCount(resolved.length);
      setCommunitiesCount(communities.size);
      setAvgResponseHours(avgHours);
      setActiveUsersCount(activeUsers.size);
      setStatsLoading(false);
    };

    void fetchHomeStats();

    return () => {
      mounted = false;
    };
  }, []);

  const avgResponseLabel = useMemo(() => {
    if (!Number.isFinite(avgResponseHours) || avgResponseHours <= 0) return "0";
    if (avgResponseHours < 1) return `${Math.max(1, Math.round(avgResponseHours * 60))}m`;
    if (avgResponseHours < 24) return `${avgResponseHours.toFixed(1)}h`;
    return `${Math.round(avgResponseHours / 24)}d`;
  }, [avgResponseHours]);

  const communityBadgeLabel = statsLoading
    ? "0 active communities"
    : `${communitiesCount}${communitiesCount > 0 ? "+" : ""} active communities`;

  return (
    <div className="space-y-16 relative">
      {/* Decorative blobs */}
      <div className="absolute top-0 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl -z-10 float" />
      <div className="absolute top-40 right-10 w-96 h-96 bg-accent-cyan/5 rounded-full blur-3xl -z-10 float" style={{ animationDelay: '1s' }} />
      
      <section className="text-center pt-10 pb-4 relative fade-up">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-gradient-to-r from-primary/10 to-accent-cyan/10 px-5 py-2 text-sm font-medium text-primary shadow-sm backdrop-blur-sm scale-in">
          <Activity className="h-4 w-4 animate-pulse" />
          Live in {communityBadgeLabel}
        </div>
        <h1 className="mt-8 text-5xl md:text-7xl font-bold tracking-tight text-slate-900 fade-up delay-1">
          Crowdsourced <span className="bg-gradient-to-r from-primary via-accent-purple to-accent-cyan bg-clip-text text-transparent">Civic Issue</span>
          <br />
          Reporting
        </h1>
        <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed fade-up delay-2">
          Improve city life by connecting citizens and municipal teams through fast issue reporting, tracking, and
          transparent resolution.
        </p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto fade-up delay-3">
        <Card
          className="group relative overflow-hidden border-2 border-primary/20 shadow-lg hover:shadow-2xl hover:border-primary/40 transition-all duration-300 cursor-pointer hover:-translate-y-1"
          onClick={() => router.push("/login")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") router.push("/login");
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent-cyan/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="relative">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-accent-cyan text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <MapPin className="h-7 w-7" />
            </div>
            <CardTitle className="text-2xl mt-4">I am a Citizen</CardTitle>
            <CardDescription className="text-base">
              Report local issues and track updates from submission to resolution.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3 relative">
            <Link href="/login" className="flex-1 min-w-[160px]" onClick={(e) => e.stopPropagation()}>
              <Button className="w-full shadow-md hover:shadow-lg">Citizen Login</Button>
            </Link>
            <Link href="/report" className="flex-1 min-w-[160px]" onClick={(e) => e.stopPropagation()}>
              <Button variant="outline" className="w-full border-2 hover:bg-primary/5">
                Report an Issue
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card
          className="group relative overflow-hidden border-2 border-slate-300 shadow-lg hover:shadow-2xl hover:border-slate-400 transition-all duration-300 cursor-pointer hover:-translate-y-1"
          onClick={() => router.push("/admin/auth")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") router.push("/admin/auth");
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/5 via-transparent to-slate-700/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="relative">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <Building2 className="h-7 w-7" />
            </div>
            <CardTitle className="text-2xl mt-4">I am Municipal Authority</CardTitle>
            <CardDescription className="text-base">
              Manage reports, assign departments, and monitor city-wide resolution workflow.
            </CardDescription>
          </CardHeader>
          <CardContent className="relative">
            <Link href="/admin/auth" onClick={(e) => e.stopPropagation()}>
              <Button className="w-full bg-gradient-to-r from-slate-900 to-slate-700 hover:from-slate-800 hover:to-slate-600 text-white shadow-md hover:shadow-lg">
                Authority Admin Login
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-6 py-10 px-6 rounded-3xl bg-gradient-to-r from-primary/5 via-accent-cyan/5 to-accent-purple/5 border border-primary/10 fade-up delay-4">
        <div className="text-center scale-in">
          <p className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-accent-cyan bg-clip-text text-transparent">
            {statsLoading ? "--" : resolvedCount}
          </p>
          <p className="text-sm text-muted-foreground mt-2 font-medium">Issues Resolved</p>
        </div>
        <div className="text-center scale-in delay-1">
          <p className="text-4xl md:text-5xl font-bold text-slate-900">
            {statsLoading ? 0 : communitiesCount}
          </p>
          <p className="text-sm text-muted-foreground mt-2 font-medium">Communities</p>
        </div>
        <div className="text-center scale-in delay-2">
          <p className="text-4xl md:text-5xl font-bold text-slate-900">
            {statsLoading ? "0" : avgResponseLabel}
          </p>
          <p className="text-sm text-muted-foreground mt-2 font-medium">Avg Response</p>
        </div>
        <div className="text-center scale-in delay-3">
          <p className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-accent-cyan to-primary bg-clip-text text-transparent">
            {statsLoading ? "--" : activeUsersCount}
          </p>
          <p className="text-sm text-muted-foreground mt-2 font-medium">Active Users</p>
        </div>
      </section>

      <section className="space-y-8">
        <div className="text-center fade-up">
          <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-slate-900 via-primary to-slate-900 bg-clip-text text-transparent">Platform Features</h2>
          <p className="text-lg text-muted-foreground mt-3">Tools for citizen participation and municipal operations.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="group relative overflow-hidden border-2 hover:border-primary/40 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-2 fade-up delay-1">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="relative">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <MapPin className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-xl">Location-Based Reporting</CardTitle>
            </CardHeader>
            <CardContent className="relative">
              <CardDescription className="text-base leading-relaxed">
                Capture issue location instantly and route reports with accurate map context.
              </CardDescription>
            </CardContent>
          </Card>
          <Card className="group relative overflow-hidden border-2 hover:border-accent-emerald/40 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-2 fade-up delay-2">
            <div className="absolute inset-0 bg-gradient-to-br from-accent-emerald/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="relative">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-accent-emerald/20 to-accent-emerald/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Users className="h-8 w-8 text-accent-emerald" />
              </div>
              <CardTitle className="text-xl">Community Engagement</CardTitle>
            </CardHeader>
            <CardContent className="relative">
              <CardDescription className="text-base leading-relaxed">
                Citizens can submit, follow, and verify progress throughout the resolution cycle.
              </CardDescription>
            </CardContent>
          </Card>
          <Card className="group relative overflow-hidden border-2 hover:border-accent-purple/40 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-2 fade-up delay-3">
            <div className="absolute inset-0 bg-gradient-to-br from-accent-purple/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="relative">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-accent-purple/20 to-accent-purple/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <BarChart3 className="h-8 w-8 text-accent-purple" />
              </div>
              <CardTitle className="text-xl">Operational Analytics</CardTitle>
            </CardHeader>
            <CardContent className="relative">
              <CardDescription className="text-base leading-relaxed">
                Track workload trends, resolution time, and department performance in one view.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-accent-purple to-accent-cyan text-white p-10 md:p-16 text-center shadow-2xl fade-up">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent_50%)]" />
        <div className="relative">
          <h3 className="text-4xl md:text-5xl font-bold tracking-tight">Ready to improve your city?</h3>
          <p className="mt-4 text-lg md:text-xl opacity-95 max-w-2xl mx-auto">Join citizens and municipal teams driving faster, transparent issue resolution.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link href="/login">
              <Button size="lg" variant="secondary" className="inline-flex items-center gap-2 shadow-lg hover:shadow-xl hover:scale-105 transition-all">
                Citizen Login
                <Shield className="h-5 w-5" />
              </Button>
            </Link>
            <Link href="/admin/auth">
              <Button size="lg" variant="outline" className="bg-white/10 border-2 border-white/30 text-white hover:bg-white/20 backdrop-blur-sm shadow-lg hover:shadow-xl hover:scale-105 transition-all">
                Authority Login
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button size="lg" variant="outline" className="bg-white/10 border-2 border-white/30 text-white hover:bg-white/20 backdrop-blur-sm shadow-lg hover:shadow-xl hover:scale-105 transition-all">
                <Clock3 className="mr-2 h-5 w-5" />
                View Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

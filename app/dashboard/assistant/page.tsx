"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Issue } from "@/lib/types";
import { parseSupabaseTimestamp } from "@/lib/date";
import { useRouter } from "next/navigation";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Bot,
  Building2,
  Send,
  User as UserIcon,
  Search,
  Settings,
} from "lucide-react";

type Message = {
  role: "assistant" | "user";
  text: string;
};

function getUserRole(user: SupabaseUser | null): string | undefined {
  if (!user) return undefined;
  const metadataRole = user.user_metadata?.role;
  const appMetadataRole = user.app_metadata?.role;
  if (typeof metadataRole === "string") return metadataRole;
  if (typeof appMetadataRole === "string") return appMetadataRole;
  return undefined;
}

function averageResolutionHours(issues: Issue[]) {
  const resolved = issues.filter((i) => i.status === "resolved" && i.updated_at);
  if (resolved.length === 0) return 0;
  const total = resolved.reduce((acc, issue) => {
    const created = parseSupabaseTimestamp(issue.created_at);
    const updated = parseSupabaseTimestamp(issue.updated_at ?? null);
    if (Number.isNaN(created.getTime()) || Number.isNaN(updated.getTime())) return acc;
    return acc + (updated.getTime() - created.getTime()) / (1000 * 60 * 60);
  }, 0);
  return total / resolved.length;
}

function generateAssistantResponse(input: string, issues: Issue[]) {
  const text = input.toLowerCase();

  const reported = issues.filter((i) => i.status === "reported").length;
  const assigned = issues.filter((i) => i.status === "assigned").length;
  const assignedToContractor = issues.filter((i) => i.status === "assigned_to_contractor").length;
  const inProgress = issues.filter((i) => i.status === "in_progress").length;
  const resolved = issues.filter((i) => i.status === "resolved").length;
  const total = issues.length;
  const avgHours = averageResolutionHours(issues);

  if (text.includes("status") || text.includes("my report")) {
    return `Here is your current report status summary:\n- Reported: ${reported}\n- Assigned: ${assigned}\n- Assigned to Contractor: ${assignedToContractor}\n- In Progress: ${inProgress}\n- Resolved: ${resolved}\n- Total: ${total}`;
  }

  if (text.includes("pothole") || text.includes("road")) {
    return "For pothole or road damage, use Department = Public Works and Priority = High if there is immediate safety risk. Add a close-up photo and nearest landmark for faster routing.";
  }

  if (text.includes("streetlight") || text.includes("light") || text.includes("electric")) {
    return "For broken streetlights, choose Department = Utilities. Include whether the area is dark at night and any nearby cross street. That helps dispatch teams prioritize.";
  }

  if (text.includes("which department") || text.includes("department")) {
    return "Department guide:\n• Potholes / road cracks -> Public Works\n• Garbage / sanitation -> Sanitation\n• Power / streetlights / water interruptions -> Utilities\n• Traffic signals / road markings -> Transportation\n• Parks / trees / playgrounds -> Parks";
  }

  if (text.includes("trend") || text.includes("analytics") || text.includes("top issue")) {
    const byDepartment = issues.reduce<Record<string, number>>((acc, issue) => {
      const key = issue.department || "other";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const top = Object.entries(byDepartment)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k, v]) => `${k.replace("_", " ")} (${v})`)
      .join(", ");

    return top
      ? `Top issue categories in your reports: ${top}.`
      : "No report trends yet. Once reports are submitted, I can summarize issue patterns.";
  }

  if (text.includes("response") || text.includes("time")) {
    if (!avgHours) return "There are no resolved reports yet, so average response time is not available.";
    return `Average resolution time based on your resolved reports is about ${avgHours.toFixed(1)} hours.`;
  }

  if (text.includes("report") || text.includes("submit")) {
    return "To file a strong report: 1) clear title, 2) exact location, 3) one clear photo, 4) safety impact in description. I can help you phrase the description if you paste details.";
  }

  return "I can help with report status, department selection, issue trends, and response time insights. Ask things like: “status of my reports”, “which department for pothole”, or “city trends this month”.";
}

export default function CitizenAssistantPage() {
  const router = useRouter();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text:
        "Welcome to Spot&Solve AI Assistant. I can help you with reporting guidance, report status, department mapping, trends, and response-time insights.",
    },
  ]);

  const quickPrompts = useMemo(
    () => ["Report a pothole issue", "Status of my reports", "Which department handles streetlight", "Top issues this month", "Response times"],
    []
  );

  useEffect(() => {
    let mounted = true;

    const checkAndLoad = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!mounted) return;

      if (error || !data.user) {
        router.replace("/login");
        return;
      }

      if (getUserRole(data.user) === "admin") {
        router.replace("/admin");
        return;
      }

      const { data: issueData } = await supabase
        .from("issues")
        .select("*")
        .eq("user_id", data.user.id)
        .order("created_at", { ascending: false });

      if (mounted) {
        setIssues((issueData || []) as Issue[]);
        setAuthChecked(true);
        setLoading(false);
      }
    };

    void checkAndLoad();
    return () => {
      mounted = false;
    };
  }, [router]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
    setInput("");

    const reply = generateAssistantResponse(trimmed, issues);
    setTimeout(() => {
      setMessages((prev) => [...prev, { role: "assistant", text: reply }]);
    }, 250);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await sendMessage(input);
  };

  if (!authChecked) {
    return <div className="py-16 text-center text-muted-foreground">{loading ? "Loading assistant..." : "Checking access..."}</div>;
  }

  return (
    <div className="-mx-4 md:-mx-6 -my-10 h-[calc(100vh-64px)] overflow-hidden bg-gradient-to-br from-[#0f254a] via-[#173b67] to-[#0f4f5a] text-white fade-up">
      <div className="h-full">
        <main className="flex h-full flex-col">
          <div className="border-b border-white/10 px-6 py-5 flex items-center justify-between fade-up delay-1">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-cyan-500/20 border border-cyan-300/30 grid place-items-center">
                <Bot className="h-6 w-6 text-cyan-200" />
              </div>
              <div>
                <p className="text-3xl font-semibold">CivicAI Assistant</p>
                <p className="text-sm text-cyan-300 inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  Online - Citizen Dashboard Assistant
                </p>
              </div>
            </div>
            <div className="hidden md:flex gap-2">
              <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
              <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-7 space-y-5">
            <div className="flex flex-wrap gap-2">
              {quickPrompts.slice(0, 5).map((prompt, idx) => (
                <button
                  key={prompt}
                  onClick={() => void sendMessage(prompt)}
                  className={`rounded-full px-4 py-2 text-sm transition ${
                    idx === 0
                      ? "bg-blue-600/50 border border-blue-400/50"
                      : "bg-white/10 hover:bg-white/20 border border-white/20"
                  }`}
                >
                  {prompt}
                </button>
              ))}
            </div>

            {messages.map((msg, idx) => (
              <div key={`${msg.role}-${idx}`} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
                {msg.role === "assistant" && (
                  <div className="h-9 w-9 rounded-lg bg-cyan-500/20 border border-cyan-300/40 grid place-items-center mt-1">
                    <Bot className="h-4 w-4 text-cyan-200" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl px-5 py-4 whitespace-pre-line ${
                    msg.role === "assistant"
                      ? "bg-white/10 border border-white/15"
                      : "bg-blue-500/70 border border-blue-300/40"
                  }`}
                >
                  <p className="text-sm leading-relaxed">{msg.text}</p>
                </div>
                {msg.role === "user" && (
                  <div className="h-9 w-9 rounded-lg bg-blue-500/30 border border-blue-300/40 grid place-items-center mt-1">
                    <UserIcon className="h-4 w-4 text-blue-100" />
                  </div>
                )}
              </div>
            ))}

            <div className="pt-1 flex flex-wrap gap-2">
              {["Report road issue", "Check status", "City trends", "Response times"].map((q) => (
                <button
                  key={q}
                  onClick={() => void sendMessage(q)}
                  className="rounded-full border border-blue-300/30 bg-blue-500/20 px-4 py-1.5 text-sm hover:bg-blue-500/30"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-white/10 p-4">
            <form onSubmit={onSubmit} className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about report status, departments, trends, or response times..."
                className="bg-white/10 border-white/20 text-white placeholder:text-slate-300"
              />
              <Button type="submit" className="bg-cyan-500 hover:bg-cyan-600 soft-pulse">
                <Send className="h-4 w-4" />
              </Button>
            </form>
            <p className="text-xs text-slate-300 mt-2 inline-flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              Assistant uses your citizen report data for contextual responses.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}

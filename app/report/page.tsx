"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Upload,
  MapPin,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  LocateFixed,
  Camera,
  Lock,
  Check,
  ArrowRight,
} from "lucide-react";
import { DepartmentType, IssuePriority } from "@/lib/types";
import { LocationMiniMap } from "@/components/LocationMiniMap";
import type { User } from "@supabase/supabase-js";

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getUserRole(user: User | null): string | undefined {
  if (!user) return undefined;
  const metadataRole = user.user_metadata?.role;
  const appMetadataRole = user.app_metadata?.role;
  if (typeof metadataRole === "string") return metadataRole;
  if (typeof appMetadataRole === "string") return appMetadataRole;
  return undefined;
}

const FALLBACK_CLASS_LABELS = [
  "pothole",
  "streetlight",
  "garbage",
  "drainage",
  "road_damage",
  "other",
];

function normalizeAiCategory(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const match = /^class_(\d+)$/i.exec(raw.trim());
  if (!match) return raw;
  const index = Number(match[1]);
  if (!Number.isFinite(index)) return raw;
  return FALLBACK_CLASS_LABELS[index] ?? raw;
}

export default function ReportPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [department, setDepartment] = useState<DepartmentType>("other");
  const [priority, setPriority] = useState<IssuePriority>("medium");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [locationCoords, setLocationCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [aiResult, setAiResult] = useState<{ category: string; confidence: number | null } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  const isFormValid = useMemo(
    () => title.trim().length >= 5 && description.trim().length >= 20,
    [title, description]
  );
  const titleCount = title.trim().length;
  const descriptionCount = description.trim().length;
  const shortDescription =
    description.trim().length > 120 ? `${description.trim().slice(0, 120)}...` : description.trim();

  useEffect(() => {
    let isMounted = true;

    const checkRole = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!isMounted) return;

      if (error || !data.user) {
        router.replace("/login?next=/report");
        return;
      }

      const role = getUserRole(data.user);
      setIsAdminUser(role === "admin");
      setAuthChecked(true);
    };

    void checkRole();
    return () => {
      isMounted = false;
    };
  }, [router]);

  const getCurrentPosition = () =>
    new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 12000,
      });
    });

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
        {
          headers: { "Accept-Language": "en" },
        }
      );
      if (!response.ok) {
        return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      }

      const data = (await response.json()) as { display_name?: string };
      return data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    } catch {
      return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    }
  };

  const detectReadableLocation = async () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported on this browser.");
      return null;
    }

    setError("");
    setLocationLoading(true);

    try {
      const pos = await getCurrentPosition();
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const address = await reverseGeocode(lat, lng);

      setLocationCoords({ lat, lng });
      setLocationAddress(address);
      return { lat, lng };
    } catch {
      setError("Location access denied. Enable location services and retry.");
      return null;
    } finally {
      setLocationLoading(false);
    }
  };

  const classifyImage = async (imageFile: File) => {
    const mlFormData = new FormData();
    mlFormData.append("file", imageFile);

    const classifyResponse = await fetch("/api/classify-issue", {
      method: "POST",
      body: mlFormData,
    });

    const raw = await classifyResponse.text();
    if (!classifyResponse.ok) {
      let detail = `ML request failed (${classifyResponse.status})`;
      try {
        const parsed = JSON.parse(raw) as { error?: string; details?: string };
        if (parsed.error) detail = parsed.error;
        if (parsed.details) detail = `${detail}: ${parsed.details}`;
      } catch {
        if (raw) detail = `${detail}: ${raw}`;
      }
      throw new Error(detail);
    }

    let prediction: {
      prediction?: string;
      label?: string;
      confidence?: number | string;
    };
    try {
      prediction = JSON.parse(raw) as {
        prediction?: string;
        label?: string;
        confidence?: number | string;
      };
    } catch {
      throw new Error("ML API returned invalid JSON");
    }

    const category = normalizeAiCategory(prediction.prediction || prediction.label || null);
    let confidence: number | null = null;

    if (typeof prediction.confidence === "number") {
      confidence = prediction.confidence;
    } else if (typeof prediction.confidence === "string") {
      const parsed = Number(prediction.confidence);
      confidence = Number.isFinite(parsed) ? parsed : null;
    }

    if (!category) {
      return null;
    }

    return { category, confidence };
  };

  const submitIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setSuccess(false);
    setError("");
    try {
      const trimmedTitle = title.trim();
      const trimmedDescription = description.trim();

      if (!isFormValid) {
        setError("Please add a clearer title (5+) and description (20+) before submitting.");
        return;
      }

      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;

      if (!user) {
        setError("Please login first.");
        return;
      }

      if (getUserRole(user) === "admin") {
        setError("Admin accounts cannot report issues. Please use a citizen account.");
        return;
      }

      const resolvedLocation = locationCoords || (await detectReadableLocation());
      if (!resolvedLocation) {
        return;
      }

      const lat = resolvedLocation.lat;
      const lng = resolvedLocation.lng;

      let imageUrl = null;
      let aiCategory: string | null = null;
      let aiConfidence: number | null = null;

      if (file) {
        if (aiResult) {
          aiCategory = aiResult.category;
          aiConfidence = aiResult.confidence;
        } else {
          const result = await classifyImage(file);
          if (result) {
            aiCategory = result.category;
            aiConfidence = result.confidence;
            setAiResult(result);
          } else {
            setAiResult(null);
          }
        }

        const filePath = `public/${Date.now()}-${file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("issue-images")
          .upload(filePath, file);

        if (uploadError) {
          setError(uploadError.message || "Image upload failed. Try again.");
          return;
        }

        imageUrl = uploadData.path;
      }

      const { error: insertError } = await supabase.from("issues").insert([
        {
          title: trimmedTitle,
          description: trimmedDescription,
          image_url: imageUrl,
          latitude: lat,
          longitude: lng,
          status: "reported",
          department,
          priority,
          ai_category: aiCategory,
          ai_confidence: aiConfidence,
          user_id: user.id,
          created_at: new Date().toISOString(),
        },
      ]);

      if (insertError) {
        setError(insertError.message || "Issue submission failed. Please try once more.");
      } else {
        setSuccess(true);
        setTitle("");
        setDescription("");
        setFile(null);
        setLocationAddress("");
        setLocationCoords(null);
        setAiResult(null);
        setTimeout(() => {
          router.push("/dashboard");
        }, 1800);
      }
    } catch {
      setError("Unexpected error while submitting. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDetectLocation = async () => {
    await detectReadableLocation();
  };

  if (!authChecked) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        Checking access...
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-blue-100/70 bg-gradient-to-br from-[#d9e7ff]/70 via-[#eef4ff]/70 to-[#f8f2ff]/70 p-4 md:p-6 fade-up">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.20),transparent_35%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.18),transparent_30%)]" />
      <div className="relative grid gap-5 xl:grid-cols-[320px_1fr_320px]">
        <Card className="border border-blue-300/30 bg-gradient-to-b from-[#1c3164] to-[#0f214a] text-slate-100 shadow-2xl fade-up delay-1">
          <CardHeader>
            <CardTitle className="text-4xl font-bold tracking-tight">Report Faster</CardTitle>
            <CardDescription className="text-slate-300 text-base">
              Useful details help city teams prioritize and resolve issues quickly.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="rounded-xl border border-white/10 bg-white/10 p-4">
              <p className="font-semibold mb-1 inline-flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Include exact location clues
              </p>
              <p className="text-slate-300">Mention landmarks, side of road, or nearest intersection.</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/10 p-4">
              <p className="font-semibold mb-1 inline-flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Add one clear photo
              </p>
              <p className="text-slate-300">A sharp close-up plus context shot helps field crews.</p>
            </div>
            <div className="rounded-xl border border-cyan-300/20 bg-cyan-400/10 p-4 flex gap-3">
              <ShieldCheck className="h-5 w-5 mt-0.5 text-cyan-200" />
              <p className="text-slate-200">
                Submissions include your current coordinates only at the time you submit.
              </p>
            </div>

            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 mt-5">
              <p className="inline-flex items-center gap-2 font-semibold mb-3">
                <Lock className="h-4 w-4" />
                Your submissions are secure
              </p>
              <ul className="space-y-2 text-slate-200">
                <li className="inline-flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-300" />
                  Location data stored securely
                </li>
                <li className="inline-flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-300" />
                  Photos are encrypted
                </li>
                <li className="inline-flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-300" />
                  Reports are auto-routed to teams
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card className="w-full border border-white/70 bg-white/85 shadow-xl backdrop-blur fade-up delay-2">
          <CardHeader className="pb-4">
            <div>
              <CardTitle className="text-3xl font-bold">Issue Details</CardTitle>
              <CardDescription className="text-base">
                Help improve your neighborhood in a few quick steps.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
          {success && (
            <Alert className="mb-4 border-status-resolved bg-status-resolved-bg">
              <CheckCircle2 className="h-4 w-4 text-status-resolved" />
              <AlertDescription className="text-status-resolved">
                Issue reported successfully. Redirecting to dashboard...
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

            {authChecked && isAdminUser && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Reporting is disabled for admin accounts. Log in as a citizen to submit issues.
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={submitIssue} className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="title">Issue Title</Label>
                  <span className="text-xs text-muted-foreground">{titleCount}/80</span>
              </div>
              <Input
                id="title"
                placeholder="e.g., Large pothole near Main St"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">Minimum 5 characters.</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="description">Description</Label>
                  <span className="text-xs text-muted-foreground">{descriptionCount}/200</span>
              </div>
              <Textarea
                id="description"
                placeholder="Describe what happened, where exactly, and any safety impact."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows={5}
              />
              <p className="text-xs text-muted-foreground">Minimum 20 characters.</p>
            </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Select
                  value={department}
                  onValueChange={(value) => setDepartment(value as DepartmentType)}
                >
                  <SelectTrigger id="department">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sanitation">Sanitation</SelectItem>
                    <SelectItem value="public_works">Public Works</SelectItem>
                    <SelectItem value="utilities">Utilities</SelectItem>
                    <SelectItem value="transportation">Transportation</SelectItem>
                    <SelectItem value="parks">Parks & Recreation</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={priority}
                  onValueChange={(value) => setPriority(value as IssuePriority)}
                >
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

              <div className="space-y-2 rounded-lg border bg-white p-4">
              <Label htmlFor="image">Photo (Optional)</Label>
              <label
                htmlFor="image"
                className="flex items-center justify-between rounded-lg border border-dashed border-slate-300 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
              >
                <span className="text-sm text-muted-foreground">
                  {file ? "Change photo" : "Click to upload an image"}
                </span>
                <Upload className="h-4 w-4 text-muted-foreground" />
              </label>
              <Input
                id="image"
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const selectedFile = e.target.files?.[0] || null;
                  setFile(selectedFile);
                  setAiResult(null);
                  setAiError("");

                  if (!selectedFile) return;

                  setAiLoading(true);
                  try {
                    const result = await classifyImage(selectedFile);
                    if (result) {
                      setAiResult(result);
                    } else {
                      setAiError("Could not detect issue type from this image.");
                    }
                  } catch (err) {
                    const message = err instanceof Error ? err.message : "Could not detect issue type from this image.";
                    setAiError(message);
                  } finally {
                    setAiLoading(false);
                  }
                }}
                className="hidden"
              />
              {file && (
                <p className="text-sm text-muted-foreground">
                  {file.name} ({formatFileSize(file.size)})
                </p>
              )}
              {aiLoading && <p className="text-sm text-blue-700">Analyzing image...</p>}
              {!aiLoading && aiResult && (
                <p className="text-sm text-emerald-700">
                  Detected issue: {aiResult.category}
                  {typeof aiResult.confidence === "number"
                    ? ` (${Math.round(aiResult.confidence * 100)}%)`
                    : ""}
                </p>
              )}
              {!aiLoading && aiError && <p className="text-sm text-amber-700">{aiError}</p>}
            </div>

              <div className="space-y-2 rounded-lg border bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">Issue location</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDetectLocation}
                  disabled={locationLoading || loading || isAdminUser}
                >
                  {locationLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Detecting...
                    </>
                  ) : (
                    <>
                      <LocateFixed className="mr-2 h-4 w-4" />
                      Detect Location
                    </>
                  )}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                {locationAddress || "No location detected yet. Click Detect Location."}
              </p>
            </div>

              <Alert>
              <MapPin className="h-4 w-4" />
              <AlertDescription>
                Your location is shown as a readable address and captured at submit time.
              </AlertDescription>
            </Alert>

            {!isFormValid && (
                <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Fill in title and description to enable successful submission.
              </p>
            )}

              <div className="flex items-center justify-between gap-3 pt-1">
                <Button type="button" variant="outline" className="min-w-[110px]">
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={loading || isAdminUser}
                  className="min-w-[180px] shadow-sm hover:shadow-md transition-shadow soft-pulse"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      Next
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="border border-white/70 bg-white/90 shadow-xl backdrop-blur fade-up delay-3">
          <CardContent className="p-4 space-y-4">
            <div>
              <h3 className="text-2xl font-semibold leading-tight">
                {title.trim() || "Large pothole near Main St"}
              </h3>
              <p className="text-sm text-muted-foreground mt-2 inline-flex items-center gap-2">
                <span className="h-6 w-6 rounded-md bg-blue-100 text-blue-700 inline-flex items-center justify-center text-xs font-bold">
                  {department === "other" ? "O" : department.slice(0, 1).toUpperCase()}
                </span>
                {department.replace("_", " ")} Department
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded-md border px-2 py-1 text-sm text-muted-foreground">Priority</span>
              <span className="rounded-md bg-amber-100 text-amber-900 px-3 py-1 text-sm capitalize">
                {priority}
              </span>
            </div>

            {aiResult && (
              <div className="flex items-center gap-2">
                <span className="rounded-md border px-2 py-1 text-sm text-muted-foreground">AI Detect</span>
                <span className="rounded-md bg-emerald-100 text-emerald-900 px-3 py-1 text-sm capitalize">
                  {aiResult.category}
                  {typeof aiResult.confidence === "number" ? ` (${Math.round(aiResult.confidence * 100)}%)` : ""}
                </span>
              </div>
            )}

            <div className="rounded-2xl border overflow-hidden h-64">
              <LocationMiniMap
                center={locationCoords ? [locationCoords.lat, locationCoords.lng] : null}
                className="h-full w-full"
              />
            </div>

            <p className="text-sm text-muted-foreground">
              Detected @{" "}
              {locationAddress ? locationAddress.split(",").slice(0, 2).join(",") : "Detect location to preview"}
            </p>

            <p className="text-base text-slate-700 leading-relaxed">
              {shortDescription ||
                "Describe what happened and add safety impact. Your live preview will update as you type."}
            </p>

            <div className="rounded-md bg-slate-100 h-3 overflow-hidden">
              <div className={`h-full bg-blue-500 ${loading ? "animate-pulse w-4/5" : "w-1/4"}`} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

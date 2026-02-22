import "./globals.css";
import Link from "next/link";
import Image from "next/image";
import { Compass, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProfileButton } from "@/components/ProfileButton";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <header className="sticky top-0 z-50 border-b border-primary/10 bg-white/90 backdrop-blur-xl supports-[backdrop-filter]:bg-white/80 shadow-sm">
          <div className="max-w-7xl mx-auto flex justify-between items-center px-4 md:px-6 py-4">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 rounded-xl blur-md group-hover:blur-lg transition-all" />
                <Image
                  src="/spot-solve-logo.png"
                  alt="Spot&Solve logo"
                  width={44}
                  height={44}
                  className="relative rounded-xl object-cover shadow-lg transition-transform duration-200 group-hover:scale-110 group-hover:rotate-3"
                />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-slate-900 leading-none">
                  Spot&Solve
                </h1>
                <p className="text-xs text-muted-foreground mt-1.5 hidden sm:block font-medium">
                  Community issue tracking
                </p>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-2">
              <Link href="/dashboard">
                <Button variant="ghost" className="font-semibold hover:bg-primary/10 hover:text-primary transition-colors">
                  Dashboard
                </Button>
              </Link>
              <Link href="/report">
                <Button variant="ghost" className="font-semibold hover:bg-primary/10 hover:text-primary transition-colors">
                  Report Issue
                </Button>
              </Link>
              <Link href="/admin">
                <Button variant="ghost" className="font-semibold hover:bg-primary/10 hover:text-primary transition-colors">
                  Admin
                </Button>
              </Link>
              <ProfileButton />
            </nav>

            <nav className="flex md:hidden gap-2">
              <Link href="/dashboard">
                <Button size="sm" variant="ghost">
                  <Compass className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/report">
                <Button size="sm">Report</Button>
              </Link>
            </nav>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 md:px-6 py-10">{children}</main>

        <footer className="border-t border-primary/10 bg-gradient-to-b from-white/80 to-slate-50/80 backdrop-blur mt-20">
          <div className="max-w-7xl mx-auto px-6 py-10">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-sm text-slate-600 font-medium">© 2026 Spot&Solve. Empowering communities through technology.</p>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-primary">Built for transparent civic action</span>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}

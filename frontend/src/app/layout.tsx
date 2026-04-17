import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "TransitIQ | Smart Supply Chain Intelligence",
  description: "Preemptive disruption detection and dynamic supply chain optimization.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-900">
        <header className="fixed top-14 left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-3rem)] max-w-5xl">
          <div className="glass-vibrant px-8 py-4 rounded-[2rem] flex items-center justify-between shadow-[0_32px_120px_-20px_rgba(0,0,0,0.1)]">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
                <span className="text-white text-sm font-black tracking-widest">TIQ</span>
              </div>
              <div className="flex flex-col">
                <span className="font-display font-black text-xl tracking-tighter leading-none bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-slate-800 to-slate-500">
                  TRANSIT<span className="text-blue-600">IQ</span>
                </span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Intelligence Division</span>
              </div>
            </div>
            
            <nav className="hidden md:flex items-center gap-10 text-[11px] font-bold uppercase tracking-widest text-slate-500">
              <Link href="/" className="hover:text-blue-600 transition-colors relative group py-2">
                Control Tower
                <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-blue-600 transition-all group-hover:w-full"></span>
              </Link>
              <Link href="/network" className="hover:text-blue-600 transition-colors relative group py-2">
                Global Network
                <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-blue-600 transition-all group-hover:w-full"></span>
              </Link>
              <Link href="/operations" className="hover:text-blue-600 transition-colors relative group py-2">
                Operations
                <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-blue-600 transition-all group-hover:w-full"></span>
              </Link>
              <Link href="/add" className="hover:text-blue-600 transition-colors relative group py-2">
                Add Shipment
                <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-blue-600 transition-all group-hover:w-full"></span>
              </Link>
            </nav>
            
            <div className="flex items-center gap-6">
               <div className="hidden sm:flex items-center gap-3 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                  <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.6)] animate-pulse"></div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Node: NY-HQ-01</span>
               </div>
               <button className="hidden lg:block px-5 py-2.5 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-slate-200">
                  Security Console
               </button>
            </div>
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();

  const navLinks = [
    { name: "Command Center", href: "/" },
    { name: "Global Network", href: "/network" },
    { name: "Deployments", href: "/operations" },
    { name: "Add Shipment", href: "/add" },
  ];

  return (
    <header className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-6xl">
      <div className="glass-vibrant px-6 py-3.5 rounded-3xl flex items-center justify-between border border-white !bg-white/80 !backdrop-blur-2xl shadow-soft">
        {/* Logo Section */}
        <Link href="/" className="flex items-center gap-4 group cursor-pointer">
          <div className="w-11 h-11 bg-gradient-to-br from-brand-500 to-brand-700 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-500/25 group-hover:shadow-brand-500/40 group-hover:scale-105 transition-all duration-300 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/30 to-transparent"></div>
            <span className="text-white text-sm font-black tracking-widest font-display relative z-10">TIQ</span>
          </div>
          <div className="flex flex-col">
            <span className="font-display font-black text-xl tracking-tight leading-none text-slate-900 group-hover:text-brand-600 transition-colors">
              TRANSIT<span className="text-brand-600">IQ</span>
            </span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.25em] mt-1.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse-glow inline-block"></span>
              Intelligence Core
            </span>
          </div>
        </Link>
        
        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-[11px] font-extrabold uppercase tracking-widest text-slate-500">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link 
                key={link.name} 
                href={link.href} 
                className={`transition-colors relative group py-2 ${isActive ? 'text-brand-600' : 'hover:text-slate-900'}`}
              >
                {link.name}
                <span className={`absolute -bottom-1 left-1/2 -translate-x-1/2 h-[3px] rounded-full transition-all ${isActive ? 'w-4 bg-brand-600' : 'w-0 bg-slate-300 group-hover:w-4'}`}></span>
              </Link>
            );
          })}
        </nav>
        
        {/* Right Actions */}
        <div className="flex items-center gap-5">
           <div className="hidden sm:flex items-center gap-3 bg-slate-100/50 px-3.5 py-2 rounded-xl border border-slate-200/50 backdrop-blur-sm">
              <div className="relative flex items-center justify-center">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-20 animate-ping"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">Node: NY-01</span>
           </div>
           <button className="hidden lg:flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-[10px] font-semibold uppercase tracking-widest rounded-xl hover:bg-brand-600 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-slate-200">
              <span>Secure Uplink</span>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
           </button>
        </div>
      </div>
    </header>
  );
}

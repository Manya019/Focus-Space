import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, BookOpen, Music, PenTool, Library, Sparkles } from 'lucide-react';
import { SignInButton, useUser } from '@clerk/clerk-react';

const NavLink = ({ href, children }) => (
  <a href={href} className="text-slate-400 hover:text-white text-sm font-medium transition-colors">
    {children}
  </a>
);

const FeatureCard = ({ icon: Icon, title, description, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, delay }}
    viewport={{ once: true }}
    className="p-10 rounded-[32px] bg-slate-900/40 border border-slate-800/50 hover:border-indigo-500/30 transition-all group flex flex-col items-start gap-6"
  >
    <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 flex items-center justify-center group-hover:scale-110 transition-transform border border-indigo-500/20 text-indigo-400">
      <Icon size={24} />
    </div>
    <div>
      <h3 className="text-2xl font-serif font-bold mb-3 text-white leading-tight">{title}</h3>
      <p className="text-slate-400 text-sm leading-relaxed">{description}</p>
    </div>
  </motion.div>
);

export default function LandingPage({ onEnter, isAuthEnabled }) {
  const clerk = isAuthEnabled ? useUser() : { isSignedIn: false };
  const { isSignedIn } = clerk;

  return (
    <div className="min-h-screen bg-[#020617] text-white selection:bg-indigo-500/30 overflow-x-hidden">
      {/* Background Elements */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-indigo-600/10 blur-[150px] rounded-full" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-600/5 blur-[120px] rounded-full" />
      </div>

      {/* Navbar */}
      <nav className="w-full z-50 px-8 py-8 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-900/40">
            <BookOpen size={20} className="text-white" />
          </div>
          <span className="text-2xl font-serif font-black tracking-tight">FocusSpace</span>
        </div>
        
        <div className="hidden md:flex items-center gap-12">
          <NavLink href="#">Explore</NavLink>
          <NavLink href="#">Community</NavLink>
          <NavLink href="#">Pricing</NavLink>
        </div>

        <div className="flex items-center gap-4">
          {isAuthEnabled ? (
            isSignedIn ? (
              <button 
                onClick={onEnter}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition-all font-bold text-sm shadow-xl shadow-indigo-900/40"
              >
                Go to Room
              </button>
            ) : (
              <SignInButton mode="modal">
                <button className="text-slate-400 hover:text-white text-sm font-bold transition-colors">
                  Sign In
                </button>
              </SignInButton>
            )
          ) : (
            <button 
              onClick={onEnter}
              className="px-6 py-2.5 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 transition-all font-bold text-sm"
            >
              Enter Demo
            </button>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative px-8 pt-20 pb-32 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="space-y-10"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 border border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-widest">
            <Sparkles size={14} className="text-indigo-400" />
            Your Personal Literary Sanctuary
          </div>
          
          <h1 className="text-6xl md:text-8xl font-serif font-black tracking-tight leading-[1.1] text-white">
            Experience reading <br />
            <span className="italic font-normal text-indigo-400/90">like never before.</span>
          </h1>
          
          <p className="text-lg text-slate-400 max-w-lg leading-relaxed">
            A digital refuge designed for focus, immersion, and the pure joy of the written word. 
            Step into a quiet, high-end environment crafted for sophisticated readers.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
            {isAuthEnabled && !isSignedIn ? (
              <SignInButton mode="modal">
                <button className="w-full sm:w-auto px-10 py-5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-lg font-bold transition-all hover:translate-y-[-2px] active:scale-95 shadow-2xl shadow-indigo-900/60 flex items-center justify-center gap-2">
                  Start Reading <ArrowRight size={20} />
                </button>
              </SignInButton>
            ) : (
              <button 
                onClick={onEnter}
                className="w-full sm:w-auto px-10 py-5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-lg font-bold transition-all hover:translate-y-[-2px] active:scale-95 shadow-2xl shadow-indigo-900/60 flex items-center justify-center gap-2"
              >
                Enter Room <ArrowRight size={20} />
              </button>
            )}
            <button className="w-full sm:w-auto px-10 py-5 rounded-2xl bg-slate-900/50 border border-slate-800 hover:bg-slate-800/80 text-lg font-bold transition-all backdrop-blur-md">
              Browse Collection
            </button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="relative group"
        >
          <div className="absolute -inset-4 bg-indigo-600/20 blur-3xl rounded-[3rem] group-hover:bg-indigo-600/30 transition-all duration-700" />
          <div className="relative rounded-[2.5rem] overflow-hidden border border-slate-800/50 shadow-2xl shadow-black/50 transform group-hover:scale-[1.02] transition-transform duration-700">
            <img 
              src="/hero.png" 
              alt="FocusSpace Experience" 
              className="w-full h-auto object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-transparent opacity-40" />
          </div>
        </motion.div>
      </section>

      {/* Feature Section Header */}
      <section className="pt-32 pb-20 px-8 text-center max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="space-y-6"
        >
          <h2 className="text-4xl md:text-6xl font-serif font-black text-white">Curated for the Mind</h2>
          <p className="text-slate-400 text-lg leading-relaxed mx-auto max-w-2xl">
            Everything you need to immerse yourself in literature, wrapped in an interface that gets out of the way.
          </p>
        </motion.div>
      </section>

      {/* Features Grid */}
      <section className="px-8 pb-40 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <FeatureCard 
          icon={BookOpen} 
          title="Immersive Canvas" 
          description="Distraction-free typography and layouts that respect the author's intent and your attention span."
          delay={0.1}
        />
        <FeatureCard 
          icon={PenTool} 
          title="Annotations" 
          description="Highlight and note with elegant, non-intrusive tools designed for deep reflection."
          delay={0.2}
        />
        <FeatureCard 
          icon={Music} 
          title="Ambient Audio" 
          description="Pair your reading with curated, subtle soundscapes that enhance your focus and mood."
          delay={0.3}
        />
        <FeatureCard 
          icon={Library} 
          title="Vast Library" 
          description="Access thousands of classic texts and modern masterpieces, beautifully typeset for digital consumption."
          delay={0.4}
        />
      </section>

      {/* Footer */}
      <footer className="py-20 border-t border-slate-900 bg-slate-950/30">
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-12">
          <div className="flex flex-col items-center md:items-start gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-600/20 flex items-center justify-center border border-indigo-500/20">
                <BookOpen size={16} className="text-indigo-400" />
              </div>
              <span className="text-xl font-serif font-black">FocusSpace</span>
            </div>
            <p className="text-slate-600 text-xs font-medium">© 2024 FocusSpace. All rights reserved.</p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-8 text-xs font-bold uppercase tracking-widest text-slate-500">
            <a href="#" className="hover:text-indigo-400 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-indigo-400 transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-indigo-400 transition-colors">Contact Us</a>
            <a href="#" className="hover:text-indigo-400 transition-colors">Twitter</a>
            <a href="#" className="hover:text-indigo-400 transition-colors">Instagram</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

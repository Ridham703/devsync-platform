import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Terminal, 
  Zap, 
  Shield, 
  Cpu, 
  ArrowRight, 
  CheckCircle2, 
  Users, 
  MessageSquare, 
  Activity
} from 'lucide-react';
import Navbar from '../components/Navbar';
import GlassCard from '../components/GlassCard';

const Landing = () => {
  const navigate = useNavigate();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" }
    }
  };

  const features = [
    {
      icon: MessageSquare,
      title: "Real-time Channels",
      description: "Instantly chat with team members directly in code-focused channels with integrated syntax highlighting."
    },
    {
      icon: Zap,
      title: "Kanban Workflows",
      description: "Manage projects with optimized drag & drop boards that update live for every developer."
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "End-to-end encryption and RBAC controls. Your project data is secure by default."
    },
    {
      icon: Cpu,
      title: "AI Copilot Sync",
      description: "Let AI automatically draft task summaries, generate PR notes, and organize chat highlights."
    }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden selection:bg-primary selection:text-white transition-colors duration-300">
      {/* Background Decorative Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] bg-[radial-gradient(ellipse_at_top,rgba(124,58,237,0.15),transparent_50%)] pointer-events-none" />
      <div className="absolute -top-[20%] left-[10%] w-[400px] h-[400px] bg-violet-600/20 rounded-full blur-[120px] animate-pulse-slow pointer-events-none" />
      <div className="absolute top-[30%] right-[5%] w-[350px] h-[350px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />

      <Navbar />

      {/* HERO SECTION */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col items-center gap-6 md:gap-8"
          >
            <motion.div 
              variants={itemVariants}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass border border-white/10 shadow-inner scale-95 md:scale-100"
            >
              <span className="text-[10px] font-bold uppercase tracking-widest bg-gradient-to-r from-purple-400 to-pink-500 text-transparent bg-clip-text">NEW</span>
              <div className="w-px h-3 bg-border dark:bg-white/20" />
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                DevSync v2.0 is now available <ArrowRight size={12} className="text-purple-500 dark:text-purple-400" />
              </span>
            </motion.div>

            <motion.h1 
              variants={itemVariants}
              className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight max-w-4xl font-sans leading-[1.15]"
            >
              Where modern teams <br className="hidden sm:inline"/>
              <span className="text-gradient font-black">sync their code</span> and ship.
            </motion.h1>

            <motion.p 
              variants={itemVariants}
              className="text-lg sm:text-xl text-muted-foreground max-w-2xl font-light leading-relaxed"
            >
              DevSync unites chat, real-time task boards, and AI-powered workspace tools into a single lightning-fast application for engineering teams.
            </motion.p>

            <motion.div 
              variants={itemVariants}
              className="flex flex-col sm:flex-row gap-4 mt-4"
            >
              <button
                onClick={() => navigate('/auth')}
                className="h-12 px-8 inline-flex items-center justify-center rounded-xl bg-foreground text-background font-semibold hover:opacity-90 transition-all shadow-lg hover:scale-[1.02] active:scale-95 group"
              >
                Get Started Free
                <ArrowRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
              </button>
              <button 
                onClick={() => navigate('/dashboard')}
                className="h-12 px-8 inline-flex items-center justify-center rounded-xl glass border border-border hover:bg-accent/50 text-foreground font-semibold transition-all active:scale-95"
              >
                Live Interactive Demo
              </button>
            </motion.div>
            
            {/* Premium Visual Mockup Card */}
            <motion.div 
              variants={itemVariants}
              className="relative w-full max-w-5xl mt-16 md:mt-24 group p-2 rounded-2xl bg-gradient-to-br from-white/5 to-white/0 border border-white/10"
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-primary to-purple-600 rounded-2xl blur-xl opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200 pointer-events-none" />
              <div className="relative rounded-xl overflow-hidden glass-card border border-white/10 shadow-2xl flex flex-col aspect-[16/10]">
                {/* Mock macOS header */}
                <div className="h-10 bg-zinc-900/80 border-b border-white/5 flex items-center px-4 gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/60" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                  <div className="w-3 h-3 rounded-full bg-green-500/60" />
                  <div className="flex-1 flex justify-center">
                    <div className="bg-zinc-950/50 border border-white/5 rounded-md text-[10px] text-zinc-500 px-6 py-0.5 flex items-center gap-1">
                      <span className="text-zinc-600">🔒</span> app.devsync.com
                    </div>
                  </div>
                </div>
                {/* Mock interior representation using divs to show aesthetics */}
                <div className="flex-1 bg-zinc-950/95 flex p-4 gap-4 text-left">
                  {/* Sidebar representation */}
                  <div className="w-1/4 rounded-lg bg-white/5 border border-white/5 p-3 flex flex-col gap-3">
                    <div className="h-6 bg-white/10 rounded-md w-2/3" />
                    <div className="space-y-2 mt-4">
                      <div className="h-8 bg-primary/20 rounded-md border border-primary/30 w-full" />
                      <div className="h-8 bg-white/5 rounded-md w-full" />
                      <div className="h-8 bg-white/5 rounded-md w-full" />
                    </div>
                  </div>
                  {/* Dashboard representation */}
                  <div className="flex-1 flex flex-col gap-4">
                    <div className="flex gap-4">
                      <div className="flex-1 h-24 bg-white/5 rounded-xl border border-white/5 p-3">
                        <div className="w-1/3 h-4 bg-white/10 rounded-sm" />
                        <div className="w-1/2 h-8 bg-white/20 rounded-md mt-4" />
                      </div>
                      <div className="flex-1 h-24 bg-white/5 rounded-xl border border-white/5 p-3">
                        <div className="w-1/3 h-4 bg-white/10 rounded-sm" />
                        <div className="w-1/2 h-8 bg-white/20 rounded-md mt-4" />
                      </div>
                    </div>
                    <div className="flex-1 bg-white/5 rounded-xl border border-white/5 p-4 flex gap-3">
                      <div className="flex-1 bg-white/5 rounded-lg border border-white/5" />
                      <div className="flex-1 bg-white/5 rounded-lg border border-white/5" />
                      <div className="flex-1 bg-white/5 rounded-lg border border-white/5" />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section id="features" className="py-20 border-t border-border bg-background/50 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center flex flex-col items-center mb-16">
            <h2 className="text-base text-primary font-semibold tracking-wide uppercase">Built for Engineers</h2>
            <p className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight text-foreground">Everything you need to collaborate</p>
            <div className="mt-4 w-12 h-1.5 bg-primary rounded-full" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, idx) => (
              <GlassCard
                key={idx}
                animate={true}
                delay={idx * 0.1}
                hover={true}
                className="border-border flex flex-col gap-4"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-purple-600/20 border border-primary/30 flex items-center justify-center text-primary">
                  <feature.icon size={24} />
                </div>
                <h3 className="text-xl font-semibold mt-2 text-foreground">{feature.title}</h3>
                <p className="text-muted-foreground text-sm font-light leading-relaxed">{feature.description}</p>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* CTA BOTTOM */}
      <section id="pricing" className="py-20 relative border-t border-white/5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(124,58,237,0.05),transparent_70%)] pointer-events-none" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="glass-card border border-white/10 rounded-3xl p-8 md:p-16 flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left shadow-3xl">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 text-foreground">Ready to boost developer velocity?</h2>
              <p className="text-muted-foreground font-light text-lg max-w-lg">Get started today for free. Seamless setup, no credit card required.</p>
              <div className="flex flex-wrap gap-4 justify-center md:justify-start mt-6">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <CheckCircle2 size={14} className="text-green-500 dark:text-green-400" /> 14 day trial
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <CheckCircle2 size={14} className="text-green-500 dark:text-green-400" /> Instant Setup
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <CheckCircle2 size={14} className="text-green-500 dark:text-green-400" /> SSO Available
                </div>
              </div>
            </div>
            <button
              onClick={() => navigate('/auth')}
              className="w-full sm:w-auto px-8 py-4 bg-primary text-white font-bold rounded-xl shadow-[0_10px_30px_rgba(139,92,246,0.3)] hover:bg-primary/90 transition-all active:scale-95 whitespace-nowrap text-lg"
            >
              Sign Up For DevSync
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border py-12 bg-background relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Terminal size={20} className="text-primary" />
            <span className="font-bold text-foreground">DevSync</span>
          </div>
          <div className="text-zinc-500 text-sm font-light">
            © {new Date().getFullYear()} DevSync Technologies Inc. All rights reserved.
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
            <a href="#" className="hover:text-foreground transition-colors">Terms</a>
            <a href="#" className="hover:text-foreground transition-colors">Status</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;

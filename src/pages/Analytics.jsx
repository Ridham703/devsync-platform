import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  CheckCircle2, 
  Clock, 
  Target,
  ArrowUpRight,
  Zap,
  Activity,
  Filter,
  RefreshCcw,
  ChevronRight,
  Search
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  Cell
} from 'recharts';
import { cn } from '../lib/utils';
import analyticsService from '../services/analyticsService';
import projectService from '../services/projectService';
import socket from '../services/socketService';

const Analytics = () => {
  const [stats, setStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    activeProjects: 0,
    teamMembers: 0,
    productivity: 0
  });
  const [velocityData, setVelocityData] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [projects, setProjects] = useState([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [timeFilter, setTimeFilter] = useState('week');
  const [projectFilter, setProjectFilter] = useState('all');
  
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [aiInsight, setAiInsight] = useState(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  const fetchAnalytics = useCallback(async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const [summary, velocity, topPerformers, allProjects] = await Promise.all([
        analyticsService.getStatsSummary(projectFilter),
        analyticsService.getVelocity(timeFilter, projectFilter),
        analyticsService.getLeaderboard(),
        projectService.getProjects()
      ]);

      setStats(summary);
      setVelocityData(velocity);
      setLeaderboard(topPerformers);
      setProjects(allProjects);
    } catch (err) {
      console.error('Analytics Error:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [timeFilter, projectFilter]);

  useEffect(() => {
    fetchAnalytics();
    
    // Realtime Updates
    socket.on('task-completed', fetchAnalytics);
    socket.on('task-updated', fetchAnalytics);
    
    return () => {
      socket.off('task-completed');
      socket.off('task-updated');
    };
  }, [fetchAnalytics]);

  const handleGetAIInsight = () => {
    setIsGeneratingAI(true);
    setTimeout(() => {
      const insights = [
        `Team productivity is at ${stats.productivity}%. You've completed ${stats.completedTasks} tasks this period!`,
        "Your velocity is peak on mid-week. Consider front-loading complex tasks on Tuesdays.",
        "Leaderboard shows high engagement. Great time to reward the top contributors.",
        "Cycle time for 'Design' tasks is slightly higher. A quick sync might help unblock it."
      ];
      setAiInsight(insights[Math.floor(Math.random() * insights.length)]);
      setIsGeneratingAI(false);
    }, 1200);
  };

  const statCards = [
    { label: 'Completion Rate', value: `${stats.productivity}%`, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Active Projects', value: stats.activeProjects, icon: Target, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Team Size', value: stats.teamMembers, icon: Users, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { label: 'Total Output', value: stats.completedTasks, icon: Zap, color: 'text-orange-400', bg: 'bg-orange-500/10' },
  ];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-120px)] space-y-4">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full shadow-[0_0_15px_rgba(139,92,246,0.3)]" 
        />
        <p className="text-muted-foreground animate-pulse font-light tracking-widest text-xs uppercase">Crunching Data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-white flex items-center gap-4">
            <div className="p-3 bg-primary/10 border border-primary/20 rounded-2xl">
              <Activity className="text-primary" size={32} />
            </div>
            Analytics Hub
          </h1>
          <p className="text-muted-foreground mt-2 font-light tracking-wide flex items-center gap-2">
            Realtime productivity intelligence <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
          </p>
        </div>
        
        <div className="flex items-center gap-4 bg-white/5 p-2 rounded-2xl border border-white/10 backdrop-blur-md">
          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/5">
            {['today', 'week', 'month'].map((f) => (
              <button
                key={f}
                onClick={() => setTimeFilter(f)}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all uppercase tracking-wider",
                  timeFilter === f ? "bg-primary text-white shadow-lg" : "text-muted-foreground hover:text-white"
                )}
              >
                {f}
              </button>
            ))}
          </div>
          <button 
            onClick={() => fetchAnalytics(true)}
            className={cn("p-2 rounded-xl bg-white/5 border border-white/5 hover:border-primary/40 transition-all", isRefreshing && "animate-spin text-primary")}
          >
            <RefreshCcw size={16} />
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="glass-card p-6 rounded-3xl border border-white/5 hover:border-primary/20 transition-all group relative overflow-hidden bg-gradient-to-br from-white/5 to-transparent"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={cn("p-3 rounded-2xl shadow-inner", stat.bg, stat.color)}>
                <stat.icon size={22} />
              </div>
              <ArrowUpRight size={16} className="text-muted-foreground opacity-20 group-hover:opacity-100 transition-opacity" />
            </div>
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">{stat.label}</p>
              <h3 className="text-3xl font-black text-white">{stat.value}</h3>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2 glass-card rounded-[2.5rem] border border-white/5 p-8 bg-gradient-to-b from-white/[0.02] to-transparent">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <TrendingUp size={20} className="text-primary" />
                Workflow Velocity
              </h3>
              <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] mt-1 font-bold">Tasks completed per day</p>
            </div>
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-muted-foreground" />
              <select 
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                className="bg-zinc-900 border border-white/10 text-[10px] font-black rounded-xl px-3 py-2 outline-none text-white cursor-pointer hover:bg-zinc-800 transition-all uppercase tracking-widest"
              >
                <option value="all">Global (All Projects)</option>
                {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
            </div>
          </div>

          <div className="h-80 w-full flex items-center justify-center">
            {velocityData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={velocityData}>
                  <defs>
                    <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#ffffff20" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false} 
                    tick={{ fill: '#ffffff40' }}
                    dy={10}
                  />
                  <YAxis 
                    stroke="#ffffff20" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false} 
                    tick={{ fill: '#ffffff40' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#0d0d12', 
                      borderRadius: '16px', 
                      border: '1px solid rgba(255,255,255,0.1)',
                      boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                      fontSize: '11px',
                      color: '#fff'
                    }} 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="tasks" 
                    stroke="#8b5cf6" 
                    strokeWidth={4} 
                    fillOpacity={1} 
                    fill="url(#colorTasks)" 
                    animationDuration={2000}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-muted-foreground/20">
                  <BarChart3 size={32} />
                </div>
                <div>
                  <p className="text-sm font-bold text-white/40">No Activity Detected</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Complete tasks to see velocity</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Top Performers */}
        <div className="glass-card rounded-[2.5rem] border border-white/5 p-8">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Zap size={20} className="text-yellow-400" />
              Leaderboard
            </h3>
            <span className="text-[9px] bg-yellow-500/10 text-yellow-500 px-2 py-1 rounded-lg font-black uppercase">Top 10</span>
          </div>
          
          <div className="space-y-6">
            {leaderboard.slice(0, 5).map((user, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-4 group cursor-pointer"
              >
                <div className="relative">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center overflow-hidden group-hover:border-primary/50 transition-all shadow-lg">
                    {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover" /> : user.username.charAt(0)}
                  </div>
                  <div className="absolute -top-1 -left-1 w-5 h-5 bg-zinc-900 border border-white/10 rounded-full flex items-center justify-center text-[8px] font-black text-primary">
                    {i + 1}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-white truncate">{user.username}</span>
                    <span className="text-[10px] font-black text-emerald-400">{user.completedCount} DONE</span>
                  </div>
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(user.completedCount / (leaderboard[0]?.completedCount || 1)) * 100}%` }}
                      className="h-full bg-primary" 
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <button 
            onClick={() => setShowLeaderboard(true)}
            className="w-full mt-10 py-4 rounded-[1.5rem] bg-white/5 border border-white/5 text-[10px] font-black text-muted-foreground hover:bg-primary hover:text-white transition-all uppercase tracking-[0.2em] flex items-center justify-center gap-2"
          >
            Full Leaderboard <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* AI Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-card rounded-[2.5rem] border border-white/5 p-8 relative overflow-hidden flex flex-col md:flex-row items-center gap-8">
          <div className="w-24 h-24 bg-primary/10 border border-primary/20 rounded-3xl flex items-center justify-center text-primary shadow-[0_0_40px_rgba(139,92,246,0.2)]">
            <Zap size={48} />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-2xl font-black text-white mb-2 italic">Productivity Engine</h3>
            <p className="text-sm text-muted-foreground font-light leading-relaxed mb-6">
              {aiInsight || "Our intelligence engine is monitoring your team's workflow in real-time. Generate a custom report to see actionable insights."}
            </p>
            <button 
              onClick={handleGetAIInsight}
              disabled={isGeneratingAI}
              className="px-8 py-3 bg-primary hover:bg-primary/90 text-white text-[11px] font-black rounded-2xl shadow-xl shadow-primary/20 transition-all flex items-center gap-3 mx-auto md:mx-0 disabled:opacity-50"
            >
              {isGeneratingAI ? <RefreshCcw size={16} className="animate-spin" /> : <Zap size={16} />}
              {isGeneratingAI ? "Processing Data..." : "Generate AI Analysis"}
            </button>
          </div>
        </div>

        <div className="glass-card rounded-[2.5rem] border border-white/5 p-8 flex flex-col items-center justify-center text-center bg-gradient-to-br from-indigo-500/10 to-transparent">
          <div className="h-16 w-16 bg-white/5 rounded-2xl flex items-center justify-center text-indigo-400 mb-4 border border-white/5">
            <BarChart3 size={32} />
          </div>
          <h4 className="text-lg font-bold text-white mb-2">Live Reporting</h4>
          <p className="text-xs text-muted-foreground font-light px-4">
            Analytics are updating automatically via Socket.io. No refresh required.
          </p>
        </div>
      </div>

      {/* Leaderboard Modal */}
      <AnimatePresence>
        {showLeaderboard && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-[#0a0a0f] border border-white/10 rounded-[3rem] w-full max-w-2xl overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,0.8)]"
            >
              <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-yellow-500/10 rounded-2xl text-yellow-500">
                    <Zap size={24} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white tracking-tight">Performance Elite</h3>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">Full team ranking</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowLeaderboard(false)}
                  className="p-3 hover:bg-white/5 rounded-2xl transition-all text-muted-foreground hover:text-white border border-transparent hover:border-white/10"
                >
                  <Clock className="rotate-45" size={24} />
                </button>
              </div>
              
              <div className="p-8 max-h-[50vh] overflow-y-auto scrollbar-thin">
                <div className="space-y-4">
                  {leaderboard.map((user, i) => (
                    <div 
                      key={i} 
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-[1.5rem] transition-all border",
                        i === 0 ? "bg-primary/10 border-primary/20" : "bg-white/5 border-transparent hover:border-white/10"
                      )}
                    >
                      <span className={cn(
                        "w-10 h-10 flex items-center justify-center rounded-xl text-xs font-black",
                        i === 0 ? "bg-primary text-white" : "bg-zinc-900 text-muted-foreground"
                      )}>
                        #{i + 1}
                      </span>
                      <div className="w-12 h-12 rounded-xl bg-zinc-900 overflow-hidden border border-white/10">
                        {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover" /> : user.username.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <h5 className="text-sm font-bold text-white">{user.username}</h5>
                        <div className="flex items-center gap-3 mt-1">
                          <div className="flex-1 h-1 bg-black/40 rounded-full overflow-hidden">
                            <div className="h-full bg-primary" style={{ width: `${(user.completedCount / leaderboard[0].completedCount) * 100}%` }} />
                          </div>
                          <span className="text-[10px] font-black text-primary whitespace-nowrap">{user.completedCount} DONE</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-8 bg-white/[0.02] border-t border-white/5 flex justify-end">
                <button 
                  onClick={() => setShowLeaderboard(false)}
                  className="px-8 py-3 bg-white/5 hover:bg-white/10 text-white text-[11px] font-black rounded-2xl transition-all border border-white/10 uppercase tracking-widest"
                >
                  Close Leaderboard
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Analytics;

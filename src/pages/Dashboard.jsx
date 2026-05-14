import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart2, 
  Users, 
  CheckSquare, 
  Clock, 
  TrendingUp, 
  ArrowUpRight, 
  Play, 
  GitMerge, 
  AlertCircle, 
  Calendar,
  X,
  FolderPlus
} from 'lucide-react';
import GlassCard from '../components/GlassCard';
import taskService from '../services/taskService';
import { projectService } from '../services/projectService';
import { teamService } from '../services/teamService';
import socket from '../services/socketService';

const Dashboard = () => {
  const navigate = useNavigate();
  const stats = [
    { name: 'Active Developers', value: '24', change: '+12%', trend: 'up', icon: Users, color: 'text-blue-400' },
    { name: 'Completed Tasks', value: '142', change: '+18%', trend: 'up', icon: CheckSquare, color: 'text-green-400' },
    { name: 'Avg Cycle Time', value: '4.2d', change: '-8%', trend: 'down', icon: Clock, color: 'text-purple-400' },
    { name: 'Dev Velocity', value: '92%', change: '+4%', trend: 'up', icon: TrendingUp, color: 'text-pink-400' },
  ];

  const recentActivity = [
    { id: 1, user: 'Marcus Aurelius', action: 'merged pull request', target: 'feat/webhooks-integration', time: '12m ago', icon: GitMerge, iconColor: 'text-purple-400', bg: 'bg-purple-500/10' },
    { id: 2, user: 'Sarah Connor', action: 'moved task to Done', target: 'Fix auth middleware loop', time: '45m ago', icon: CheckSquare, iconColor: 'text-green-400', bg: 'bg-green-500/10' },
    { id: 3, user: 'Alan Turing', action: 'reported issue', target: 'Websocket disconnects on mobile standby', time: '2h ago', icon: AlertCircle, iconColor: 'text-red-400', bg: 'bg-red-500/10' },
    { id: 4, user: 'Grace Hopper', action: 'started deployment', target: 'v2.4.1-rc.2 to staging', time: '3h ago', icon: Play, iconColor: 'text-blue-400', bg: 'bg-blue-500/10' },
  ];

  // Pull real logged in user credentials
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('devsync_user');
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  });

  const displayName = user?.username || 'Developer';

  // Start empty for real "First Time Login / Empty State" experience!
  const [activeProjects, setActiveProjects] = useState([]);

  // New Project Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProjName, setNewProjName] = useState('');
  const [newProjProgress, setNewProjProgress] = useState(0);
  const [newProjStatus, setNewProjStatus] = useState('On Track');
  const [newProjColor, setNewProjColor] = useState('bg-purple-500');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [teams, setTeams] = useState([]);

  // Real Tasks State
  const [tasks, setTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [invitations, setInvitations] = useState([]);

  const fetchData = async () => {
    try {
      setLoadingTasks(true);
      const [tasksData, projectsData, teamsData, invitesData] = await Promise.all([
        taskService.getAllTasks(),
        projectService.getProjects(),
        teamService.getTeams(),
        teamService.getInvitations()
      ]);
      setTasks(tasksData || []);
      setActiveProjects(projectsData || []);
      setTeams(teamsData || []);
      setInvitations(invitesData || []);
      if (teamsData.length > 0) setSelectedTeamId(teamsData[0]._id);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoadingTasks(false);
    }
  };

  useEffect(() => {
    fetchData();

    socket.on('team-joined', () => fetchData());
    socket.on('team-deleted', () => fetchData());
    socket.on('removed-from-team', () => fetchData());
    socket.on('new-notification', () => fetchData());

    return () => {
      socket.off('team-joined');
      socket.off('team-deleted');
      socket.off('removed-from-team');
      socket.off('new-notification');
    };
  }, []);

  const handleAcceptInvite = async (teamId) => {
    try {
      await teamService.joinTeam(teamId);
      // Refresh all data
      fetchData();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleDeclineInvite = async (teamId) => {
    try {
      await teamService.declineInvitation(teamId);
      fetchData();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newProjName.trim() || !selectedTeamId) return;

    try {
      const newProject = await projectService.createProject({
        name: newProjName,
        description: 'New team project initiated from dashboard.',
        teamId: selectedTeamId,
        color: newProjColor
      });

      setActiveProjects([newProject, ...activeProjects]);
      
      // Reset form
      setNewProjName('');
      setNewProjProgress(0);
      setNewProjStatus('On Track');
      setNewProjColor('bg-purple-500');
      setIsModalOpen(false);
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div className="space-y-8 pb-8">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <motion.h1 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-extrabold text-foreground tracking-tight"
          >
            Good evening, {displayName}
          </motion.h1>
          <p className="text-muted-foreground text-sm mt-1 font-light">Here is what's happening in your workspace today.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="glass px-4 py-2 rounded-xl border border-border flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar size={14} />
            Today, 13 May
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-primary hover:bg-primary/90 transition-all px-4 py-2 rounded-xl text-white text-xs font-semibold shadow-[0_4px_15px_-2px_rgba(139,92,246,0.4)]"
          >
            + New Project
          </button>
        </div>
      </div>

      {/* Team Invitations Notification */}
      <AnimatePresence>
        {invitations.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4"
          >
            {invitations.map((invite) => (
              <div 
                key={invite._id} 
                className="glass border border-primary/20 bg-primary/5 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg shadow-primary/5"
              >
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                    <Users size={24} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">Team Invitation</h4>
                    <p className="text-xs text-muted-foreground">
                      <span className="text-primary font-semibold">{invite.owner?.username}</span> invited you to join <span className="text-foreground font-bold">#{invite.name}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button 
                    onClick={() => handleDeclineInvite(invite._id)}
                    className="flex-1 sm:flex-none px-4 py-2 rounded-xl border border-border hover:bg-white/5 text-xs font-semibold transition-all"
                  >
                    Decline
                  </button>
                  <button 
                    onClick={() => handleAcceptInvite(invite._id)}
                    className="flex-1 sm:flex-none px-6 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold shadow-lg shadow-primary/20 transition-all active:scale-95"
                  >
                    Accept & Join
                  </button>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* DYNAMIC RENDERING: EMPTY STATE VS LIVE DASHBOARD */}
      {activeProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 sm:py-20 px-4">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 25 }}
            className="w-full max-w-xl glass border border-white/10 rounded-3xl p-8 sm:p-12 text-center relative overflow-hidden shadow-2xl shadow-black/40"
          >
            {/* Glowing particle ambiance */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-primary/10 blur-[90px] pointer-events-none" />
            
            <motion.div 
              animate={{ y: [0, -8, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              className="inline-flex items-center justify-center h-20 w-20 rounded-3xl bg-gradient-to-br from-primary/20 to-violet-600/5 border border-primary/30 text-primary mb-8 shadow-[0_0_40px_-10px_rgba(139,92,246,0.4)] relative group"
            >
              <FolderPlus size={36} className="relative z-10 transition-transform duration-500 group-hover:scale-110" />
            </motion.div>
            
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight mb-4">Launch Your Workspace</h2>
            <p className="text-muted-foreground text-sm sm:text-base leading-relaxed max-w-md mx-auto mb-10 font-light">
              Welcome to DevSync! You haven't initialized any active projects yet. Create your first team project right now to activate your sprint board, task analytics, and chat stream.
            </p>
            
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-primary hover:bg-primary/90 text-white px-8 py-4 rounded-2xl text-sm font-bold shadow-[0_8px_30px_-4px_rgba(139,92,246,0.5)] hover:shadow-[0_8px_35px_-2px_rgba(139,92,246,0.6)] transition-all active:scale-[0.98] inline-flex items-center gap-2.5 group"
            >
              <span>🚀 Create Your First Project</span>
            </button>
          </motion.div>
        </div>
      ) : (
        <>
          {/* STATS GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, idx) => (
              <GlassCard 
                key={idx}
                animate={true}
                delay={idx * 0.05}
                hover={true}
                className="p-6 flex items-center justify-between border-white/5 shadow-md group"
              >
                <div className="space-y-2">
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{stat.name}</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-foreground">{stat.value}</span>
                    <span className={`text-xs font-bold flex items-center ${
                      stat.trend === 'up' ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {stat.change}
                    </span>
                  </div>
                </div>
                <div className={`p-3.5 rounded-2xl bg-accent border border-border group-hover:scale-110 transition-transform duration-300`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </GlassCard>
            ))}
          </div>

          {/* CHARTS & ACTIVITY */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Chart mockup / Visual area */}
            <GlassCard className="lg:col-span-2 p-6 flex flex-col border-white/5">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <BarChart2 size={18} className="text-primary" />
                    Commit Activity
                  </h3>
                  <p className="text-xs text-muted-foreground font-light">Frequency of merges over the last 7 days</p>
                </div>
                <select className="bg-white/5 border border-border text-xs text-foreground rounded-lg px-2.5 py-1.5 outline-none focus:border-primary/50">
                  <option className="bg-background text-foreground">Weekly</option>
                  <option className="bg-background text-foreground">Monthly</option>
                </select>
              </div>

              {/* Bar graph visualization using HTML/CSS divs */}
              <div className="flex-1 flex items-end justify-between gap-2 pt-6 pb-2 px-2 min-h-[220px]">
                {[40, 65, 50, 85, 45, 95, 70].map((val, i) => (
                  <div key={i} className="w-full flex flex-col items-center gap-3 group">
                    <div className="relative w-full max-w-[36px] bg-white/5 border border-white/5 rounded-lg overflow-hidden h-48 flex items-end">
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${val}%` }}
                        transition={{ duration: 0.8, delay: i * 0.05, ease: "easeOut" }}
                        className="w-full bg-gradient-to-t from-purple-600 to-indigo-400 group-hover:from-purple-500 group-hover:to-indigo-300 transition-all shadow-[0_0_15px_rgba(139,92,246,0.2)]"
                      />
                      {/* Tooltip */}
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-popover border border-border text-[10px] px-1.5 py-0.5 rounded text-foreground opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-sm">
                        {val}%
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}
                    </span>
                  </div>
                ))}
              </div>
            </GlassCard>

            {/* Right Projects widget */}
            <GlassCard className="p-6 border-white/5 flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-foreground">Project Health</h3>
                <ArrowUpRight size={18} className="text-muted-foreground cursor-pointer hover:text-foreground transition-colors" />
              </div>
              <div className="flex-1 space-y-6">
                {activeProjects.map((project, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-foreground font-medium">{project.name}</span>
                      <span className="text-muted-foreground">{project.progress}%</span>
                    </div>
                    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${project.progress}%` }}
                        transition={{ duration: 1, delay: idx * 0.1 }}
                        className={`h-full ${project.color}`}
                      />
                    </div>
                    <div className="flex justify-between items-center pt-1">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                        project.status === 'On Track' ? 'bg-emerald-500/10 text-emerald-400' :
                        project.status === 'At Risk' ? 'bg-amber-500/10 text-amber-400' :
                        'bg-blue-500/10 text-blue-400'
                      }`}>
                        {project.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>

          {/* ACTIVITY FEED & RECENT TASKS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <GlassCard className="p-6 border-border flex flex-col">
              <h3 className="text-lg font-bold text-foreground mb-6">Live Activity Stream</h3>
              <div className="space-y-4">
                {recentActivity.map((act) => (
                  <div key={act.id} className="flex items-start gap-4 p-3 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/5 transition-all group">
                    <div className={`p-2.5 rounded-xl ${act.bg} flex-shrink-0`}>
                      <act.icon size={16} className={act.iconColor} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-muted-foreground leading-tight">
                        <span className="text-foreground font-semibold">{act.user}</span> {act.action}{' '}
                        <span className="text-primary font-mono text-xs">{act.target}</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 font-light">{act.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>

            <GlassCard className="p-6 border-border flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-foreground">Quick Tasks</h3>
                <button 
                  onClick={() => navigate('/kanban')}
                  className="text-xs text-primary hover:underline"
                >
                  View Kanban
                </button>
              </div>
              <div className="space-y-3 flex-1">
                {loadingTasks ? (
                  <div className="flex items-center justify-center h-40">
                    <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : tasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-white/5 rounded-2xl opacity-60">
                    <CheckSquare size={32} className="text-muted-foreground mb-3" />
                    <p className="text-sm font-medium text-foreground">All caught up!</p>
                    <p className="text-[10px] text-muted-foreground mt-1">No pending tasks for today.</p>
                  </div>
                ) : (
                  tasks.slice(0, 4).map((task, i) => (
                    <div 
                      key={i} 
                      onClick={() => navigate('/kanban')}
                      className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 transition-all group cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-5 w-5 rounded-md border-2 border-border group-hover:border-primary/60 transition-colors flex items-center justify-center flex-shrink-0">
                          <div className="h-2 w-2 rounded-sm bg-primary scale-0 group-hover:scale-100 transition-transform" />
                        </div>
                        <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors truncate">{task.title}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground bg-accent px-2 py-1 rounded-md border border-border flex-shrink-0">
                        {task.priority || 'Medium'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </GlassCard>
          </div>
        </>
      )}

      {/* PREMIUM NEW PROJECT DIALOG MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop blurring elements */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            {/* Dialog card container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-[#12121a] border border-white/10 rounded-3xl shadow-2xl shadow-black/80 p-6 overflow-hidden"
            >
              {/* Top ambient glow inside dialog */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-24 bg-primary/10 blur-[40px] pointer-events-none" />
              
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-primary/10 rounded-xl">
                    <FolderPlus className="text-primary h-5 w-5" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground">Initialize Project</h3>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-lg transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateProject} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-400 ml-1 uppercase tracking-wider">Project Title</label>
                  <input
                    required
                    autoFocus
                    type="text"
                    placeholder="e.g. Platform Refactoring v2"
                    value={newProjName}
                    onChange={(e) => setNewProjName(e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl outline-none text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-primary/50 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-400 ml-1 uppercase tracking-wider">Assigned Team</label>
                  <select
                    required
                    value={selectedTeamId}
                    onChange={(e) => setSelectedTeamId(e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl outline-none text-sm text-foreground focus:border-primary/50 transition-all cursor-pointer"
                  >
                    <option value="" className="bg-[#12121a]">Select a Team</option>
                    {teams.map(t => (
                      <option key={t._id} value={t._id} className="bg-[#12121a]">{t.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold uppercase tracking-wider ml-1 text-zinc-400">
                    <label>Initial Progress</label>
                    <span className="text-primary font-bold">{newProjProgress}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={newProjProgress}
                    onChange={(e) => setNewProjProgress(e.target.value)}
                    className="w-full accent-primary bg-white/5 h-1.5 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-400 ml-1 uppercase tracking-wider">Status</label>
                    <select
                      value={newProjStatus}
                      onChange={(e) => setNewProjStatus(e.target.value)}
                      className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm outline-none text-foreground focus:border-primary/50 transition-all cursor-pointer"
                    >
                      <option value="On Track" className="bg-[#12121a]">On Track</option>
                      <option value="At Risk" className="bg-[#12121a]">At Risk</option>
                      <option value="Complete" className="bg-[#12121a]">Complete</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-400 ml-1 uppercase tracking-wider">Branding Color</label>
                    <div className="flex gap-2 items-center h-10 bg-white/5 border border-white/10 rounded-xl px-3">
                      {[
                        { c: 'bg-purple-500', name: 'purple' },
                        { c: 'bg-blue-500', name: 'blue' },
                        { c: 'bg-emerald-500', name: 'emerald' },
                        { c: 'bg-amber-500', name: 'amber' },
                        { c: 'bg-pink-500', name: 'pink' }
                      ].map((opt) => (
                        <button
                          type="button"
                          key={opt.c}
                          onClick={() => setNewProjColor(opt.c)}
                          className={`h-4 w-4 rounded-full ${opt.c} relative flex items-center justify-center hover:scale-110 transition-transform`}
                        >
                          {newProjColor === opt.c && (
                            <div className="absolute inset-[-3px] border border-white rounded-full" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-3 border border-white/5 hover:bg-white/5 text-muted-foreground rounded-xl text-xs font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold shadow-[0_4px_20px_-4px_rgba(139,92,246,0.5)] transition-all active:scale-[0.98]"
                  >
                    Launch Project
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;

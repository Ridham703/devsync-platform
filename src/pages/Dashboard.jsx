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
  FolderPlus,
  MessageSquare,
  Zap,
  Activity as ActivityIcon,
  LogOut,
  Volume2,
  VolumeX,
  Sparkles,
  ChevronDown
} from 'lucide-react';
import GlassCard from '../components/GlassCard';
import taskService from '../services/taskService';
import { activityService } from '../services/activityService';
import { analyticsService } from '../services/analyticsService';
import { projectService } from '../services/projectService';
import { teamService } from '../services/teamService';
import socket from '../services/socketService';
import { useActivity } from '../contexts/ActivityContext';

const Dashboard = () => {
  const navigate = useNavigate();

  // Pull real logged in user credentials
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('devsync_user');
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  });

  const {
    activities,
    loading: loadingActivities,
    hasMore,
    unreadCount,
    onlineUsers,
    soundOn,
    activeFilters,
    applyFilters,
    triggerActivity,
    toggleSound,
    resetUnreadCount
  } = useActivity();

  const [showSimulation, setShowSimulation] = useState(false);

  const getRelativeTime = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now - date;
    
    if (diffMs < 0) return 'just now';
    
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const getActivityConfig = (actionType) => {
    switch (actionType) {
      case 'TASK_CREATED':
        return { icon: CheckSquare, iconColor: 'text-green-400', bg: 'bg-green-500/10' };
      case 'TASK_MOVED':
        return { icon: Play, iconColor: 'text-blue-400', bg: 'bg-blue-500/10' };
      case 'TASK_ASSIGNED':
        return { icon: Users, iconColor: 'text-sky-400', bg: 'bg-sky-500/10' };
      case 'TEAM_JOINED':
        return { icon: Users, iconColor: 'text-purple-400', bg: 'bg-purple-500/10' };
      case 'MESSAGE_SENT':
        return { icon: MessageSquare, iconColor: 'text-teal-400', bg: 'bg-teal-500/10' };
      case 'PR_MERGED':
        return { icon: GitMerge, iconColor: 'text-violet-400', bg: 'bg-violet-500/10' };
      case 'DEPLOYMENT_STARTED':
        return { icon: Zap, iconColor: 'text-amber-400', bg: 'bg-amber-500/10' };
      case 'ISSUE_CREATED':
        return { icon: AlertCircle, iconColor: 'text-red-400', bg: 'bg-red-500/10' };
      case 'USER_LOGIN':
        return { icon: ActivityIcon, iconColor: 'text-emerald-400', bg: 'bg-emerald-500/10' };
      case 'USER_LOGOUT':
        return { icon: LogOut, iconColor: 'text-zinc-400', bg: 'bg-zinc-500/10' };
      default:
        return { icon: ActivityIcon, iconColor: 'text-indigo-400', bg: 'bg-indigo-500/10' };
    }
  };

  const triggerPR = async () => {
    const branches = ['feat/graphql-api', 'fix/db-leak-handler', 'refactor/ui-core-tokens', 'feat/security-auth-check'];
    const branch = branches[Math.floor(Math.random() * branches.length)];
    let tId = activeFilters.teamId;
    if (!tId && teams && teams.length > 0) {
      tId = teams[Math.floor(Math.random() * teams.length)]._id;
    }
    await triggerActivity({
      actionType: 'PR_MERGED',
      message: 'merged pull request',
      target: branch,
      teamId: tId || null
    });
  };

  const triggerDeployment = async () => {
    const envs = ['staging', 'production-eu', 'canary-us-east', 'demo-sandbox'];
    const env = envs[Math.floor(Math.random() * envs.length)];
    const versions = ['v2.4.5', 'v2.4.6-rc1', 'v2.5.0-beta', 'v2.4.9'];
    const ver = versions[Math.floor(Math.random() * versions.length)];
    let tId = activeFilters.teamId;
    if (!tId && teams && teams.length > 0) {
      tId = teams[Math.floor(Math.random() * teams.length)]._id;
    }
    await triggerActivity({
      actionType: 'DEPLOYMENT_STARTED',
      message: `started deployment of ${ver}`,
      target: env,
      teamId: tId || null
    });
  };

  const triggerIssue = async () => {
    const issues = [
      'Token validation failed after sleep',
      'Sidebar lag on mobile drawer swipe',
      'Socket connection timeout on poor network',
      'Broken image avatar in dark-mode layout'
    ];
    const issue = issues[Math.floor(Math.random() * issues.length)];
    let tId = activeFilters.teamId;
    if (!tId && teams && teams.length > 0) {
      tId = teams[Math.floor(Math.random() * teams.length)]._id;
    }
    await triggerActivity({
      actionType: 'ISSUE_CREATED',
      message: 'reported issue',
      target: issue,
      teamId: tId || null
    });
  };

  const displayName = user?.username || 'Developer';

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const formattedDate = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short'
  });

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

  // Real Commit Activity Analytics States
  const [analyticsData, setAnalyticsData] = useState([]);
  const [isPlaceholderMode, setIsPlaceholderMode] = useState(true);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);

  // Real SaaS Dashboard Stats States
  const [statsData, setStatsData] = useState(null);
  const [isStatsPlaceholder, setIsStatsPlaceholder] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);

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

  const fetchAnalytics = async () => {
    try {
      setLoadingAnalytics(true);
      const res = await activityService.getActivityAnalytics();
      setAnalyticsData(res.analytics || []);
      setIsPlaceholderMode(res.isPlaceholder);
    } catch (error) {
      console.error('Error fetching activity analytics:', error);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const fetchStats = async () => {
    try {
      setLoadingStats(true);
      const res = await analyticsService.getDashboardAnalytics();
      setStatsData(res);
      setIsStatsPlaceholder(res.isPlaceholder);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchAnalytics();
    fetchStats();

    socket.on('team-joined', () => { fetchData(); fetchStats(); });
    socket.on('team-deleted', () => { fetchData(); fetchStats(); });
    socket.on('removed-from-team', () => { fetchData(); fetchStats(); });
    socket.on('new-notification', () => { fetchData(); fetchStats(); });
    socket.on('activity-updated', fetchAnalytics);
    socket.on('dashboard-analytics-updated', fetchStats);

    return () => {
      socket.off('team-joined');
      socket.off('team-deleted');
      socket.off('removed-from-team');
      socket.off('new-notification');
      socket.off('activity-updated', fetchAnalytics);
      socket.off('dashboard-analytics-updated', fetchStats);
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

  const chartData = isPlaceholderMode ? [
    { day: 'Mon', count: 40, val: 40, label: '40%' },
    { day: 'Tue', count: 65, val: 65, label: '65%' },
    { day: 'Wed', count: 50, val: 50, label: '50%' },
    { day: 'Thu', count: 85, val: 85, label: '85%' },
    { day: 'Fri', count: 45, val: 45, label: '45%' },
    { day: 'Sat', count: 95, val: 95, label: '95%' },
    { day: 'Sun', count: 70, val: 70, label: '70%' }
  ] : (() => {
    const max = Math.max(...analyticsData.map(d => d.count), 1);
    return analyticsData.map(d => ({
      day: d.day,
      count: d.count,
      val: (d.count / max) * 100,
      label: `${d.count} ${d.count === 1 ? 'event' : 'events'}`
    }));
  })();

  const stats = isStatsPlaceholder || !statsData ? [
    { name: 'Active Developers', value: '24', change: '+12%', trend: 'up', icon: Users, color: 'text-blue-400', isMock: true },
    { name: 'Completed Tasks', value: '142', change: '+18%', trend: 'up', icon: CheckSquare, color: 'text-green-400', isMock: true },
    { name: 'Avg Cycle Time', value: '4.2d', change: '-8%', trend: 'down', icon: Clock, color: 'text-purple-400', isMock: true },
    { name: 'Dev Velocity', value: '92%', change: '+4%', trend: 'up', icon: TrendingUp, color: 'text-pink-400', isMock: true }
  ] : [
    { name: 'Active Developers', value: statsData.activeDevelopers.value, change: statsData.activeDevelopers.change, trend: statsData.activeDevelopers.trend, icon: Users, color: 'text-blue-400', isMock: false },
    { name: 'Completed Tasks', value: statsData.completedTasks.value, change: statsData.completedTasks.change, trend: statsData.completedTasks.trend, icon: CheckSquare, color: 'text-green-400', isMock: false },
    { name: 'Avg Cycle Time', value: statsData.avgCycleTime.value, change: statsData.avgCycleTime.change, trend: statsData.avgCycleTime.trend, icon: Clock, color: 'text-purple-400', isMock: false },
    { name: 'Dev Velocity', value: statsData.devVelocity.value, change: statsData.devVelocity.change, trend: statsData.devVelocity.trend, icon: TrendingUp, color: 'text-pink-400', isMock: false }
  ];

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
            {getGreeting()}, {displayName}
          </motion.h1>
          <p className="text-muted-foreground text-sm mt-1 font-light">Here is what's happening in your workspace today.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="glass px-4 py-2 rounded-xl border border-border flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar size={14} />
            Today, {formattedDate}
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
            {loadingStats ? (
              // Beautiful Glassmorphic Skeleton Loading State
              Array.from({ length: 4 }).map((_, idx) => (
                <GlassCard 
                  key={idx}
                  className="p-6 flex items-center justify-between border-white/5 shadow-md min-h-[108px] animate-pulse"
                >
                  <div className="space-y-3 w-2/3">
                    <div className="h-3.5 bg-white/5 rounded-full w-24" />
                    <div className="flex items-baseline gap-2">
                      <div className="h-8 bg-white/10 rounded-lg w-14" />
                      <div className="h-4 bg-white/5 rounded-full w-10" />
                    </div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 h-12 w-12" />
                </GlassCard>
              ))
            ) : (
              stats.map((stat, idx) => (
                <GlassCard 
                  key={idx}
                  animate={true}
                  delay={idx * 0.05}
                  hover={true}
                  className="p-6 flex items-center justify-between border-white/5 shadow-md group relative overflow-hidden"
                >
                  {/* Subtle pulsing animation if in Mock/Demo mode */}
                  {stat.isMock && (
                    <div className="absolute top-1 right-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded-full scale-90 opacity-70 animate-pulse">
                      Demo
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{stat.name}</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <motion.span 
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 200 }}
                        className="text-3xl font-bold text-foreground"
                      >
                        {stat.value}
                      </motion.span>
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
              ))
            )}
          </div>

          {/* CHARTS & ACTIVITY */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Chart mockup / Visual area */}
            {/* Commit Activity Analytics Chart */}
            <GlassCard className="lg:col-span-2 p-6 flex flex-col border-white/5 relative overflow-hidden">
              {/* Subtle grid background for analytics look */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent pointer-events-none" />
              
              <div className="flex justify-between items-center mb-6 relative z-10">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                      <BarChart2 size={18} className="text-primary" />
                      Commit Activity
                    </h3>
                    {isPlaceholderMode ? (
                      <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-full select-none animate-pulse">
                        Demo Mode
                      </span>
                    ) : (
                      <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-full select-none">
                        Live Analytics
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground font-light mt-1">
                    {isPlaceholderMode 
                      ? "Visualizing demo/mock trends until actual workspace activity starts"
                      : "Frequency of sprint events over the last 7 days"
                    }
                  </p>
                </div>
                <div className="text-[10px] text-zinc-400 bg-white/5 border border-white/5 px-2.5 py-1.5 rounded-lg select-none">
                  Last 7 Days
                </div>
              </div>

              {/* Bar graph visualization */}
              <div className="flex-1 flex items-end justify-between gap-2 pt-6 pb-2 px-2 min-h-[220px] relative z-10">
                {chartData.map((item, i) => (
                  <div key={i} className="w-full flex flex-col items-center gap-3 group">
                    <div className="relative w-full max-w-[36px] bg-white/5 border border-white/5 rounded-lg overflow-hidden h-48 flex items-end">
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${item.val}%` }}
                        transition={{ duration: 0.8, delay: i * 0.05, ease: "easeOut" }}
                        className={`w-full bg-gradient-to-t ${
                          isPlaceholderMode 
                            ? "from-purple-600 to-indigo-400 group-hover:from-purple-500 group-hover:to-indigo-300 shadow-[0_0_15px_rgba(139,92,246,0.2)]"
                            : "from-emerald-600 to-teal-400 group-hover:from-emerald-500 group-hover:to-teal-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                        } transition-all`}
                      />
                      {/* Tooltip */}
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-popover border border-border text-[10px] px-1.5 py-0.5 rounded text-foreground opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-sm whitespace-nowrap z-50">
                        {item.label}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors font-medium">
                      {item.day}
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
            {/* LIVE ACTIVITY STREAM CARD */}
            <GlassCard className="p-6 border-border flex flex-col min-h-[480px]">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-bold text-foreground">Live Activity Stream</h3>
                  {unreadCount > 0 && (
                    <span 
                      onClick={resetUnreadCount}
                      className="bg-primary hover:bg-primary/95 text-white text-[9px] font-extrabold h-4 px-1.5 rounded-full flex items-center justify-center cursor-pointer shadow-lg animate-bounce select-none"
                      title="Clear unread indicators"
                    >
                      {unreadCount} new
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* Live Online Indicator */}
                  <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] px-2.5 py-1 rounded-xl font-bold uppercase tracking-wider">
                    <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-ping" />
                    {onlineUsers.length} Online
                  </div>

                  {/* Audio toggle */}
                  <button
                    onClick={toggleSound}
                    className="p-2 hover:bg-white/5 rounded-xl border border-white/5 text-muted-foreground hover:text-foreground transition-all"
                    title={soundOn ? "Mute activity chimes" : "Unmute activity chimes"}
                  >
                    {soundOn ? <Volume2 size={13} /> : <VolumeX size={13} />}
                  </button>
                </div>
              </div>

              {/* Filtering Controls */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                <select
                  value={activeFilters.actionType || ''}
                  onChange={(e) => applyFilters({ actionType: e.target.value })}
                  className="bg-white/5 border border-white/5 text-xs text-foreground rounded-xl px-2 py-2 outline-none focus:border-primary/50 cursor-pointer"
                >
                  <option value="" className="bg-[#12121a] text-foreground">All Actions</option>
                  <option value="TASK_CREATED" className="bg-[#12121a] text-foreground">Task Created</option>
                  <option value="TASK_MOVED" className="bg-[#12121a] text-foreground">Task Moved</option>
                  <option value="TASK_ASSIGNED" className="bg-[#12121a] text-foreground">Task Assigned</option>
                  <option value="TEAM_JOINED" className="bg-[#12121a] text-foreground">Team Joined</option>
                  <option value="MESSAGE_SENT" className="bg-[#12121a] text-foreground">Chat Messages</option>
                  <option value="PR_MERGED" className="bg-[#12121a] text-foreground">PR Merges</option>
                  <option value="DEPLOYMENT_STARTED" className="bg-[#12121a] text-foreground">Deployments</option>
                  <option value="ISSUE_CREATED" className="bg-[#12121a] text-foreground">Issues Reported</option>
                </select>

                <select
                  value={activeFilters.teamId || ''}
                  onChange={(e) => applyFilters({ teamId: e.target.value })}
                  className="bg-white/5 border border-white/5 text-xs text-foreground rounded-xl px-2 py-2 outline-none focus:border-primary/50 cursor-pointer"
                >
                  <option value="" className="bg-[#12121a] text-foreground">All Teams</option>
                  {teams.map(t => (
                    <option key={t._id} value={t._id} className="bg-[#12121a] text-foreground">{t.name}</option>
                  ))}
                </select>
              </div>

              {/* Scrollable list */}
              <div 
                className="space-y-3 overflow-y-auto max-h-[360px] pr-1 flex-1 scrollbar-thin"
                onScroll={() => resetUnreadCount()}
              >
                {activities.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 opacity-60">
                    <ActivityIcon size={32} className="text-muted-foreground mb-3 animate-pulse" />
                    <p className="text-xs font-bold text-foreground">No activities found</p>
                    <p className="text-[10px] text-muted-foreground mt-1">Activities appear in real time here.</p>
                  </div>
                ) : (
                  activities.map((act) => {
                    const cfg = getActivityConfig(act.actionType);
                    const Icon = cfg.icon;
                    return (
                      <div 
                        key={act._id} 
                        className="flex items-start gap-3 p-3 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 hover:border-white/10 transition-all group relative overflow-hidden animate-fadeIn"
                      >
                        {/* Dynamic status glow */}
                        <div className={`absolute top-0 left-0 bottom-0 w-0.5 bg-gradient-to-b ${cfg.iconColor.includes('green') ? 'from-green-500' : cfg.iconColor.includes('blue') ? 'from-blue-500' : cfg.iconColor.includes('purple') ? 'from-purple-500' : cfg.iconColor.includes('teal') ? 'from-teal-500' : cfg.iconColor.includes('violet') ? 'from-violet-500' : cfg.iconColor.includes('amber') ? 'from-amber-500' : cfg.iconColor.includes('red') ? 'from-red-500' : 'from-indigo-500'} to-transparent opacity-0 group-hover:opacity-100 transition-opacity`} />
                        
                        <div className="relative">
                          <img 
                            src={act.user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(act.user?.username || 'U')}&background=random&color=fff`} 
                            alt={act.user?.username || 'User'} 
                            className="h-9 w-9 rounded-xl border border-white/10 shadow-sm"
                          />
                          {onlineUsers.includes(act.user?._id) && (
                            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 bg-emerald-500 rounded-full border-2 border-[#12121a] shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground leading-snug">
                            <span className="text-foreground font-bold">{act.user?.username || 'Someone'}</span>{' '}
                            {act.message}{' '}
                            {act.target && (
                              <span className="text-primary font-mono text-[10px] bg-primary/10 border border-primary/20 px-1 py-0.5 rounded ml-0.5 select-all">
                                {act.target}
                              </span>
                            )}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[9px] text-muted-foreground font-light">{getRelativeTime(act.createdAt)}</span>
                            {act.teamId && (
                              <span className="text-[9px] text-purple-400 bg-purple-500/10 border border-purple-500/10 px-1.5 py-0.2 rounded-full font-medium">
                                #{act.teamId.name}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className={`p-2 rounded-xl ${cfg.bg} flex-shrink-0 relative group-hover:scale-105 transition-transform duration-300`}>
                          <Icon size={13} className={cfg.iconColor} />
                        </div>
                      </div>
                    );
                  })
                )}

                {hasMore && (
                  <button
                    onClick={() => fetchActivities(activeFilters, true)}
                    disabled={loadingActivities}
                    className="w-full mt-2 py-2.5 border border-white/5 hover:bg-white/10 rounded-xl text-[10px] font-bold text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-2"
                  >
                    {loadingActivities ? 'Loading...' : 'Load More Activities'}
                  </button>
                )}
              </div>

              {/* Simulation Hub Collapsible Trigger */}
              <div className="mt-4 border-t border-white/5 pt-4">
                <button
                  onClick={() => setShowSimulation(prev => !prev)}
                  className="w-full flex justify-between items-center text-xs font-bold text-zinc-400 hover:text-foreground transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Sparkles size={13} className="text-primary animate-pulse" />
                    Real-time Simulation Hub
                  </span>
                  <ChevronDown 
                    size={14} 
                    className={`transform transition-transform duration-300 ${showSimulation ? 'rotate-180' : ''}`} 
                  />
                </button>

                <AnimatePresence>
                  {showSimulation && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden space-y-2 mt-3"
                    >
                      <p className="text-[10px] text-muted-foreground font-light mb-2">
                        Simulate background developer actions. These write instantly to the MongoDB database and broadcast globally via Socket.IO:
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          onClick={triggerPR}
                          className="bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-purple-300 py-2 rounded-xl text-[10px] font-bold transition-colors shadow-sm"
                        >
                          🚀 Merge PR
                        </button>
                        <button
                          onClick={triggerDeployment}
                          className="bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-300 py-2 rounded-xl text-[10px] font-bold transition-colors shadow-sm"
                        >
                          ⚡ Deploy App
                        </button>
                        <button
                          onClick={triggerIssue}
                          className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-300 py-2 rounded-xl text-[10px] font-bold transition-colors shadow-sm"
                        >
                          ⚠️ File Issue
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
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

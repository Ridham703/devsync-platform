import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Bell, Search, User, MessageSquarePlus, Users, X, Check, Mail, CheckCircle2, Target, Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { teamService } from '../services/teamService';
import authService from '../services/authService';
import socket from '../services/socketService';
import notificationService from '../services/notificationService';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../lib/utils';

import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const Layout = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  
  const notificationRef = useRef(null);
  const searchRef = useRef(null);
  const currentUser = authService.getCurrentUser();

  const fetchNotifications = async () => {
    try {
      const data = await notificationService.getNotifications();
      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.isRead).length || 0);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  useEffect(() => {
    if (!currentUser) {
      navigate('/auth', { replace: true });
      return;
    }

    fetchNotifications();

    socket.connect();
    socket.emit('join-user', currentUser.id || currentUser._id);

    socket.on('notification:new', (notif) => {
      setNotifications(prev => [notif, ...prev]);
      setUnreadCount(prev => prev + 1);
    });

    return () => {
      socket.off('notification:new');
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search logic
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.length >= 2) {
        setIsSearching(true);
        setShowSearchResults(true);
        try {
          const response = await api.get(`/search?q=${searchQuery}`);
          setSearchResults(response.data);
        } catch (err) {
          console.error(err);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults(null);
        setShowSearchResults(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleMarkAsRead = async (id) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearNotifications = async () => {
    try {
      await notificationService.clearNotifications();
      setNotifications([]);
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotificationAction = async (notif) => {
    if (!notif.isRead) handleMarkAsRead(notif._id);
    
    if (notif.type === 'TEAM_INVITE') {
      // For team invites, we might want to navigate to teams page
      // or handle it in a modal. The link is already in the notif.
    }
    setShowNotifications(false);
  };

  return (
    <div className="flex h-screen w-screen bg-background text-foreground overflow-hidden transition-colors duration-300">
      {/* Background glowing blobs for ambient feeling */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[100px] pointer-events-none animate-pulse-slow" />
      <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] rounded-full bg-indigo-600/5 blur-[100px] pointer-events-none" />

      <Sidebar isMobileOpen={isMobileSidebarOpen} setIsMobileOpen={setIsMobileSidebarOpen} />

      <div className="flex flex-col flex-1 relative overflow-hidden">
        {/* Top Bar */}
        <header className="h-20 border-b border-white/5 flex items-center justify-between px-4 md:px-8 z-20 glass-light sticky top-0">
          <div className="flex items-center">
            {/* Mobile Menu Toggle */}
            <button 
              className="md:hidden mr-3 text-muted-foreground hover:text-foreground bg-white/5 p-2 rounded-xl border border-white/5 transition-colors"
              onClick={() => setIsMobileSidebarOpen(true)}
            >
              <Menu size={20} />
            </button>
            <div className="relative" ref={searchRef}>
              <div className="flex items-center bg-white/5 border border-white/5 px-3 md:px-4 py-2 rounded-xl w-48 sm:w-64 md:w-80 focus-within:border-primary/40 focus-within:bg-white/10 transition-all group">
              <Search size={16} className="text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input 
                type="text" 
                placeholder="Search everything..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery.length >= 2 && setShowSearchResults(true)}
                className="bg-transparent border-none text-sm font-light focus:outline-none ml-3 text-foreground placeholder:text-muted-foreground w-full" 
              />
              {isSearching && (
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              )}
            </div>

            {/* Search Results Dropdown */}
            <AnimatePresence>
              {showSearchResults && searchResults && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-full left-0 mt-2 w-[300px] sm:w-[400px] bg-[#0d0d12] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 p-2"
                >
                  <div className="max-h-[400px] overflow-y-auto scrollbar-thin">
                    {/* Tasks */}
                    {searchResults.tasks?.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-3 py-2">Tasks</h4>
                        {searchResults.tasks.map(task => (
                          <button
                            key={task._id}
                            onClick={() => { navigate('/kanban'); setShowSearchResults(false); }}
                            className="w-full text-left px-3 py-2 hover:bg-white/5 rounded-xl transition-colors flex items-center gap-3"
                          >
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                              <CheckCircle2 size={14} />
                            </div>
                            <span className="text-sm text-foreground truncate">{task.title}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Projects */}
                    {searchResults.projects?.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-3 py-2">Projects</h4>
                        {searchResults.projects.map(project => (
                          <button
                            key={project._id}
                            onClick={() => { navigate('/dashboard'); setShowSearchResults(false); }}
                            className="w-full text-left px-3 py-2 hover:bg-white/5 rounded-xl transition-colors flex items-center gap-3"
                          >
                            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                              <Target size={14} />
                            </div>
                            <span className="text-sm text-foreground truncate">{project.name}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Teams */}
                    {searchResults.teams?.length > 0 && (
                      <div className="mb-2">
                        <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-3 py-2">Teams</h4>
                        {searchResults.teams.map(team => (
                          <button
                            key={team._id}
                            onClick={() => { navigate('/teams'); setShowSearchResults(false); }}
                            className="w-full text-left px-3 py-2 hover:bg-white/5 rounded-xl transition-colors flex items-center gap-3"
                          >
                            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
                              <Users size={14} />
                            </div>
                            <span className="text-sm text-foreground truncate">{team.name}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {Object.values(searchResults).every(arr => arr.length === 0) && (
                      <div className="p-8 text-center text-muted-foreground text-xs italic">
                        No results found for "{searchQuery}"
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-5">
            <button className="relative bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 p-2.5 rounded-xl transition-all text-muted-foreground hover:text-white">
              <MessageSquarePlus size={18} />
            </button>
            
            <div className="relative" ref={notificationRef}>
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className={cn(
                  "relative bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 p-2.5 rounded-xl transition-all text-muted-foreground hover:text-white",
                  showNotifications && "bg-white/10 text-white border-primary/40"
                )}
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 w-4 h-4 bg-primary text-[9px] font-bold text-white flex items-center justify-center rounded-full ring-2 ring-zinc-950">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-4 w-80 bg-[#0d0d12] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50"
                  >
                    <div className="p-4 border-b border-white/5 bg-white/5">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold">Notifications</h4>
                        <div className="flex gap-3">
                          <button 
                            onClick={handleMarkAllRead}
                            className="text-[10px] text-primary hover:underline font-medium"
                          >
                            Mark all read
                          </button>
                          <button 
                            onClick={handleClearNotifications}
                            className="text-[10px] text-muted-foreground hover:text-red-400 font-medium"
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="max-h-[400px] overflow-y-auto scrollbar-thin">
                      {notifications.length === 0 ? (
                        <div className="p-10 text-center space-y-2">
                          <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto text-muted-foreground/30">
                            <Bell size={20} />
                          </div>
                          <p className="text-xs text-muted-foreground font-light">All caught up!</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-white/5">
                          {notifications.map((notif) => (
                            <Link 
                              key={notif._id}
                              to={notif.link || '#'}
                              onClick={() => handleNotificationAction(notif)}
                              className={cn(
                                "flex gap-3 p-4 hover:bg-white/5 transition-all relative group",
                                !notif.isRead && "bg-primary/5"
                              )}
                            >
                              {!notif.isRead && (
                                <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-full" />
                              )}
                              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/5 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 overflow-hidden shadow-lg">
                                {notif.sender?.avatar ? (
                                  <img src={notif.sender.avatar} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  notif.sender?.username?.charAt(0).toUpperCase() || 'S'
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={cn(
                                  "text-[11px] leading-relaxed mb-1",
                                  notif.isRead ? "text-muted-foreground" : "text-foreground font-medium"
                                )}>
                                  {notif.message}
                                </p>
                                <div className="flex items-center gap-2">
                                  <span className="text-[9px] text-muted-foreground/60 font-light">
                                    {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                                  </span>
                                  {!notif.isRead && (
                                    <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                                  )}
                                </div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="p-3 bg-white/5 border-t border-white/5 text-center">
                      <button className="text-[10px] font-bold text-muted-foreground hover:text-white transition-colors uppercase tracking-widest">
                        View Archive
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="h-8 w-px bg-white/10 mx-1" />

            <Link to="/profile" className="flex items-center gap-3 hover:bg-white/5 p-1.5 pr-3 rounded-xl transition-colors group">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold border border-white/10 shadow-md group-hover:scale-105 transition-transform">
                {currentUser?.avatar ? <img src={currentUser.avatar} className="w-full h-full object-cover rounded-xl" /> : <User size={16} />}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs font-medium text-foreground">{currentUser?.username || 'Developer'}</p>
                <p className="text-[10px] text-muted-foreground">{currentUser?.email || 'devsync@user.com'}</p>
              </div>
            </Link>
          </div>
        </header>

        {/* Main Page Content Viewport */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden relative p-4 md:p-8 scrollbar-thin">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default Layout;

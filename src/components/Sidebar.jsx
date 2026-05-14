import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  MessageSquare, 
  KanbanSquare, 
  Settings, 
  LogOut, 
  Users, 
  ChevronLeft, 
  ChevronRight,
  Activity,
  Terminal,
  Sun,
  Moon
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Chat UI', path: '/chat', icon: MessageSquare },
    { name: 'Kanban Board', path: '/kanban', icon: KanbanSquare },
    { name: 'Teams', path: '/teams', icon: Users },
    { name: 'Analytics', path: '/analytics', icon: Activity },
  ];

  return (
    <motion.aside
      initial={{ width: 260 }}
      animate={{ width: isCollapsed ? 80 : 260 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="h-screen sticky top-0 border-r border-white/10 bg-black/40 backdrop-blur-xl flex flex-col justify-between z-20 relative"
    >
      {/* Toggle button */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute top-6 -right-3 bg-primary rounded-full p-1 border border-white/10 hover:bg-primary/80 transition-colors z-30"
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      <div>
        {/* Logo */}
        <div className={cn("p-6 flex items-center gap-3 border-b border-white/5 h-20", isCollapsed ? "justify-center" : "")}>
          <div className="bg-gradient-to-br from-primary to-purple-600 p-2.5 rounded-xl flex items-center justify-center text-white shadow-[0_0_20px_rgba(139,92,246,0.4)]">
            <Terminal size={20} />
          </div>
          {!isCollapsed && (
            <motion.span 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="font-bold text-xl tracking-tight text-gradient font-sans"
            >
              DevSync
            </motion.span>
          )}
        </div>

        {/* Navigation */}
        <nav className="p-4 flex flex-col gap-2 mt-4">
          {menuItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              onClick={(e) => item.path === '#' && e.preventDefault()}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group cursor-pointer relative",
                isActive && item.path !== '#' 
                  ? "bg-white/10 text-primary border border-white/5 shadow-lg" 
                  : "text-muted-foreground hover:bg-white/5 hover:text-white border border-transparent"
              )}
            >
              <item.icon size={20} className="min-w-[20px]" />
              {!isCollapsed && (
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }}
                  className="flex justify-between items-center w-full"
                >
                  <span className="font-medium text-sm">{item.name}</span>
                  {item.badge && (
                    <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-semibold border border-primary/30">
                      {item.badge}
                    </span>
                  )}
                </motion.div>
              )}
              
              {/* Hover Tooltip for Collapsed State */}
              {isCollapsed && (
                <div className="absolute left-full ml-4 px-3 py-2 rounded-lg bg-zinc-900 border border-white/10 text-white text-xs font-medium opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 -translate-x-2 group-hover:translate-x-0 shadow-xl z-50 whitespace-nowrap">
                  {item.name}
                </div>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Footer of sidebar */}
      <div className="p-4 border-t border-white/5 flex flex-col gap-2">
        <button
          onClick={toggleTheme}
          className="flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 text-muted-foreground hover:bg-white/5 hover:text-white border border-transparent group relative text-left w-full"
        >
          {theme === 'dark' ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} className="text-indigo-400" />}
          {!isCollapsed && <span className="font-medium text-sm">Light / Dark</span>}
          {isCollapsed && (
            <div className="absolute left-full ml-4 px-3 py-2 rounded-lg bg-zinc-900 border border-white/10 text-white text-xs font-medium opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 -translate-x-2 group-hover:translate-x-0 shadow-xl z-50 whitespace-nowrap">
              Toggle Theme
            </div>
          )}
        </button>
        <NavLink
          to="/profile"
          className={({ isActive }) => cn(
            "flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative",
            isActive 
              ? "bg-white/10 text-primary border border-white/5 shadow-lg" 
              : "text-muted-foreground hover:bg-white/5 hover:text-white border border-transparent"
          )}
        >
          <Settings size={20} />
          {!isCollapsed && <span className="font-medium text-sm">Settings</span>}
          {isCollapsed && (
            <div className="absolute left-full ml-4 px-3 py-2 rounded-lg bg-zinc-900 border border-white/10 text-white text-xs font-medium opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 -translate-x-2 group-hover:translate-x-0 shadow-xl z-50 whitespace-nowrap">
              Settings
            </div>
          )}
        </NavLink>
        <button
          onClick={() => {
            import('../services/authService').then(m => {
              m.default.logoutUser();
              navigate('/');
            });
          }}
          className="flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 text-red-400 hover:bg-red-500/10 hover:text-red-300 border border-transparent group w-full relative text-left"
        >
          <LogOut size={20} />
          {!isCollapsed && <span className="font-medium text-sm">Logout</span>}
          {isCollapsed && (
            <div className="absolute left-full ml-4 px-3 py-2 rounded-lg bg-zinc-900 border border-white/10 text-red-300 text-xs font-medium opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 -translate-x-2 group-hover:translate-x-0 shadow-xl z-50 whitespace-nowrap">
              Logout
            </div>
          )}
        </button>
      </div>
    </motion.aside>
  );
};

export default Sidebar;

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  FolderPlus, 
  ListTodo, 
  Users, 
  UserPlus, 
  Rocket, 
  MessageSquarePlus,
  Search,
  Command
} from 'lucide-react';

const QuickActions = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const actions = [
    { 
      id: 'project',
      name: 'Create Project', 
      description: 'Start a new dev workspace',
      icon: FolderPlus, 
      color: 'text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/20',
      shortcut: 'P',
      onClick: () => { navigate('/dashboard'); setIsOpen(false); }
    },
    { 
      id: 'task',
      name: 'Create Task', 
      description: 'Add a card to your Kanban board',
      icon: ListTodo, 
      color: 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20',
      shortcut: 'T',
      onClick: () => { navigate('/kanban'); setIsOpen(false); }
    },
    { 
      id: 'team',
      name: 'Create Team', 
      description: 'Assemble a group of developers',
      icon: Users, 
      color: 'text-purple-400 bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/20',
      shortcut: 'M',
      onClick: () => { navigate('/teams'); setIsOpen(false); }
    },
    { 
      id: 'invite',
      name: 'Invite Member', 
      description: 'Send invitation link to user',
      icon: UserPlus, 
      color: 'text-pink-400 bg-pink-500/10 hover:bg-pink-500/20 border-pink-500/20',
      shortcut: 'I',
      onClick: () => { navigate('/teams'); setIsOpen(false); }
    },
    { 
      id: 'sprint',
      name: 'Create Sprint', 
      description: 'Initiate a new development cycle',
      icon: Rocket, 
      color: 'text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/20',
      shortcut: 'S',
      onClick: () => { navigate('/kanban'); setIsOpen(false); }
    },
    { 
      id: 'channel',
      name: 'Create Channel', 
      description: 'Establish a chat discussion room',
      icon: MessageSquarePlus, 
      color: 'text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/20',
      shortcut: 'C',
      onClick: () => { navigate('/chat'); setIsOpen(false); }
    }
  ];

  // Outside click close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Toggle dropdown with Cmd/Ctrl + K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      
      // Close on Escape
      if (e.key === 'Escape') {
        setIsOpen(false);
      }

      // Quick hotkeys if open
      if (isOpen) {
        const key = e.key.toLowerCase();
        const action = actions.find(a => a.shortcut.toLowerCase() === key);
        if (action) {
          e.preventDefault();
          action.onClick();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const filteredActions = actions.filter(action => 
    action.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    action.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Plus Trigger Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Quick Actions"
        className={`relative p-2.5 rounded-xl border transition-all duration-300 flex items-center justify-center text-muted-foreground hover:text-white ${
          isOpen 
            ? 'bg-primary/20 border-primary/40 text-primary shadow-[0_0_15px_rgba(139,92,246,0.3)]' 
            : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
        }`}
      >
        <Plus size={18} className={`transition-transform duration-300 ${isOpen ? 'rotate-45 text-primary' : ''}`} />
      </motion.button>

      {/* Menu Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute right-0 mt-3 w-80 bg-[#07070a]/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_30px_70px_rgba(0,0,0,0.8),0_0_50px_rgba(139,92,246,0.05)] overflow-hidden z-50 p-2 text-left"
          >
            {/* Command Input Box */}
            <div className="flex items-center gap-2.5 px-3.5 py-3 border-b border-white/5 bg-white/[0.02]">
              <Search size={14} className="text-muted-foreground" />
              <input
                type="text"
                placeholder="Search quick action..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className="bg-transparent border-none text-xs focus:outline-none text-foreground placeholder:text-muted-foreground w-full font-light"
              />
              <div className="flex items-center gap-1 bg-white/5 border border-white/5 px-2 py-0.5 rounded-md text-[9px] font-bold text-muted-foreground">
                <Command size={9} />
                <span>K</span>
              </div>
            </div>

            {/* Scrollable list */}
            <div className="max-h-[320px] overflow-y-auto p-1.5 space-y-1.5 scrollbar-thin">
              {filteredActions.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-[10px] font-medium tracking-wide">
                  No quick actions match "{searchQuery}"
                </div>
              ) : (
                filteredActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.id}
                      onClick={action.onClick}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-white/[0.03] border border-transparent hover:border-white/5 transition-all text-left group"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all ${action.color}`}>
                          <Icon size={16} className="group-hover:scale-110 transition-transform" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white group-hover:text-primary transition-colors">{action.name}</p>
                          <p className="text-[10px] text-muted-foreground/80 mt-0.5 font-light leading-normal">{action.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity bg-white/5 border border-white/5 px-2 py-1 rounded-md text-[8px] font-black text-muted-foreground">
                        <span>{action.shortcut}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Bottom Panel */}
            <div className="p-3 bg-white/[0.01] border-t border-white/5 flex items-center justify-between text-[8px] font-bold text-zinc-500 uppercase tracking-widest px-4">
              <span>Quick Commands</span>
              <span>ESC TO CLOSE</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default QuickActions;

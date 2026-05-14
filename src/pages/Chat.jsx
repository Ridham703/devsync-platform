import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Hash, 
  Send, 
  Paperclip, 
  Smile, 
  Search, 
  Users, 
  Settings, 
  AtSign, 
  Code,
  ChevronDown,
  Sparkles,
  MessageSquare,
  Trash2
} from 'lucide-react';
import { cn } from '../lib/utils';
import socket from '../services/socketService';
import chatService from '../services/chatService';
import authService from '../services/authService';

const FALLBACK_MESSAGES = [];
import { teamService } from '../services/teamService';
import { useCallback } from 'react';

const Chat = () => {
  const [channels, setChannels] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null); // Will store team object
  const [isLoading, setIsLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  const [dms] = useState([
    { id: 101, name: 'Sarah Connor', role: 'Lead Dev', online: true },
    { id: 102, name: 'Marcus Aurelius', role: 'Manager', online: true },
    { id: 103, name: 'Alan Turing', role: 'Data', online: false },
    { id: 104, name: 'Grace Hopper', role: 'DevOps', online: true },
  ]);

  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchTeams = useCallback(async () => {
    try {
      setIsLoading(true);
      const teamsData = await teamService.getTeams();
      const teamChannels = teamsData.map(team => ({
        id: team._id,
        name: team.name,
        type: 'public',
        count: team.members?.length || 0,
        ...team
      }));
      setChannels(teamChannels);
      
      // Only set initial active channel if none is selected
      if (teamChannels.length > 0 && !activeChannel) {
        setActiveChannel(teamChannels[0]);
      }
    } catch (err) {
      console.error('Failed to fetch teams:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeChannel]);

  // Initial Load
  useEffect(() => {
    fetchTeams();
  }, []); // Run once on mount

  // Socket listeners for team updates
  useEffect(() => {
    const handleTeamJoined = () => fetchTeams();
    const handleTeamDeleted = (data) => {
      if (activeChannel?._id === data.teamId) {
        setActiveChannel(null);
      }
      fetchTeams();
    };
    const handleRemovedFromTeam = (data) => {
      if (activeChannel?._id === data.teamId) {
        setActiveChannel(null);
      }
      fetchTeams();
    };

    socket.on('team-joined', handleTeamJoined);
    socket.on('team-deleted', handleTeamDeleted);
    socket.on('removed-from-team', handleRemovedFromTeam);

    return () => {
      socket.off('team-joined', handleTeamJoined);
      socket.off('team-deleted', handleTeamDeleted);
      socket.off('removed-from-team', handleRemovedFromTeam);
    };
  }, [activeChannel, fetchTeams]);

  useEffect(() => {
    if (!activeChannel) return;

    const loadChannelHistory = async () => {
      if (activeChannel.isBot) {
        setMessages([{
          id: 'welcome',
          user: 'DevSync AI',
          initial: 'AI',
          color: 'from-primary to-violet-600',
          text: 'Hi there! I am your AI assistant. Feel free to ask me anything about DevSync!',
          time: 'Now',
          isBot: true
        }]);
        return;
      }

      try {
        const history = await chatService.getChannelMessages(activeChannel.name, activeChannel._id);
        setMessages(history || []);
      } catch (err) {
        console.error('API fetch failed:', err);
        setMessages([]);
      }
    };

    loadChannelHistory();

    loadChannelHistory();

    // Join room and listen for messages
    if (socket.connected) {
      socket.emit('join-channel', activeChannel._id);
    } else {
      socket.connect();
      socket.once('connect', () => {
        socket.emit('join-channel', activeChannel._id);
      });
    }

    const handleReceiveMessage = (newMessage) => {
      setMessages(prev => {
        // Check if message belongs to current channel/team
        if (newMessage.teamId !== activeChannel._id) return prev;
        
        // Prevent duplicate for sender (optimistic UI already added it)
        const currentUser = authService.getCurrentUser();
        const isFromMe = newMessage.userId === (currentUser.id || currentUser._id) || newMessage.user === currentUser.username;
        
        if (isFromMe) {
          // Optionally update the optimistic message with the real one from DB
          return prev.map(m => (m.isOptimistic && m.text === newMessage.text) ? newMessage : m);
        }
        
        // If it's a new message from someone else, add it
        return [...prev, newMessage];
      });
    };

    socket.on('receive-message', handleReceiveMessage);

    return () => {
      socket.emit('leave-channel', activeChannel._id);
      socket.off('receive-message', handleReceiveMessage);
    };
  }, [activeChannel]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || !activeChannel) return;
    
    const currentUserInfo = authService.getCurrentUser();
    const username = currentUserInfo ? currentUserInfo.username : 'Developer';
    const userInitial = username.charAt(0).toUpperCase();

    const colors = [
      'from-blue-500 to-cyan-500',
      'from-purple-500 to-indigo-500',
      'from-pink-500 to-rose-500',
      'from-emerald-500 to-teal-500'
    ];
    const chatColor = colors[username.length % colors.length];

    const messagePayload = {
      user: username,
      initial: userInitial,
      color: chatColor,
      text: inputValue,
      channel: activeChannel.name,
      teamId: activeChannel._id,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isOptimistic: true // Mark for local display
    };

    // Optimistic Update
    setMessages(prev => [...prev, { ...messagePayload, id: Date.now() }]);
    setInputValue('');

    // Handle Chatbot Logic
    if (activeChannel.isBot) {
      setTimeout(() => {
        const botResponse = {
          id: Date.now() + 1,
          user: 'DevSync AI',
          initial: 'AI',
          color: 'from-primary to-violet-600',
          text: getBotResponse(messagePayload.text),
          channel: 'bot',
          teamId: 'bot',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isBot: true
        };
        setMessages(prev => [...prev, botResponse]);
      }, 1000);
      return;
    }

    try {
      // The API now handles broadcasting to all sockets in the room
      await chatService.saveMessageRest(messagePayload);
    } catch (err) {
      console.error('Failed to send message:', err);
      // Optionally remove optimistic message or show error
    }
  };

  const handleClearChat = async () => {
    if (!activeChannel || activeChannel.isBot) return;
    if (!window.confirm('Are you sure you want to clear all messages in this team? This action cannot be undone.')) return;

    try {
      await chatService.clearChat(activeChannel._id);
      setMessages([]);
    } catch (err) {
      alert(err.message);
    }
  };

  const getBotResponse = (text) => {
    const input = text.toLowerCase();
    if (input.includes('hello') || input.includes('hi')) return "Hello! I'm your DevSync assistant. How can I help you today?";
    if (input.includes('task')) return "You can manage your tasks in the Kanban section. Would you like me to show you how?";
    if (input.includes('team')) return "Teams are the core of DevSync. You can invite members in the Teams tab.";
    if (input.includes('project')) return "Projects help you organize tasks within a team. You can create them from the Dashboard.";
    return "That's interesting! I'm still learning, but I can help you navigate DevSync. Ask me about tasks, teams, or projects!";
  };

  return (
    <div className="h-[calc(100vh-12rem)] flex border border-border rounded-2xl bg-card/50 backdrop-blur-xl overflow-hidden relative shadow-2xl">
      {/* Channels List Sub-Sidebar */}
      <div className="w-64 border-r border-border flex flex-col bg-card/30 flex-shrink-0 hidden md:flex">
        {/* Workspace Header */}
        <div className="h-14 border-b border-border flex items-center justify-between px-4 hover:bg-accent cursor-pointer transition-colors">
          <div className="flex items-center gap-2">
            <span className="font-bold text-foreground text-sm tracking-wide uppercase">DEV TEAM</span>
            <ChevronDown size={14} className="text-muted-foreground" />
          </div>
          <div className="bg-primary/10 border border-primary/20 p-1 rounded-md text-primary">
            <Sparkles size={14} />
          </div>
        </div>

        {/* Nav Area */}
        <div className="flex-1 overflow-y-auto p-3 space-y-6 scrollbar-thin">
          <div>
            <div className="flex items-center justify-between text-[11px] font-extrabold text-muted-foreground tracking-wider uppercase px-2 mb-2">
              <span>Channels</span>
              <span className="text-lg leading-none cursor-pointer hover:text-foreground font-light">+</span>
            </div>
            <div className="space-y-0.5">
              {isLoading ? (
                <div className="px-4 py-2 text-xs text-muted-foreground animate-pulse">Loading teams...</div>
              ) : channels.length === 0 ? (
                <div className="px-4 py-2 text-xs text-muted-foreground font-light italic">No teams joined yet.</div>
              ) : (
                channels.map(ch => {
                  const isActive = activeChannel && ch.id === activeChannel.id;
                  return (
                    <button
                      key={ch.id}
                      onClick={() => setActiveChannel(ch)}
                      className={cn(
                        "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all group relative",
                        isActive 
                          ? "bg-primary/10 text-primary font-bold" 
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      )}
                    >
                      <Hash size={16} className={cn(isActive ? "text-primary" : "text-muted-foreground/70")} />
                      <span className="truncate">{ch.name.toLowerCase().replace(/\s+/g, '-')}</span>
                      {isActive && (
                        <div className="absolute left-0 top-2 w-1 h-5 bg-primary rounded-r" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-[11px] font-extrabold text-muted-foreground tracking-wider uppercase px-2 mb-2">
              <span>AI Assistants</span>
            </div>
            <div className="space-y-0.5 mb-6">
              <button
                onClick={() => {
                  const botChannel = { _id: 'bot', name: 'DevSync AI', isBot: true, members: [{ user: { username: 'AI' } }] };
                  setActiveChannel(botChannel);
                  setMessages([{
                    id: 'welcome',
                    sender: 'bot',
                    senderName: 'DevSync AI',
                    text: 'Hi there! I am your AI assistant. Feel free to ask me anything about DevSync!',
                    time: 'Now',
                    isBot: true
                  }]);
                }}
                className={cn(
                  "w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all",
                  activeChannel?.isBot ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-white/5"
                )}
              >
                <div className="h-6 w-6 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                  <Sparkles size={14} />
                </div>
                <span>DevSync AI</span>
              </button>
            </div>

            <div className="flex items-center justify-between text-[11px] font-extrabold text-muted-foreground tracking-wider uppercase px-2 mb-2">
              <span>Direct Messages</span>
              <span className="text-lg leading-none cursor-pointer hover:text-white font-light">+</span>
            </div>
            <div className="space-y-0.5">
              {dms.map(dm => (
                <button
                  key={dm.id}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-white/5 hover:text-zinc-200 transition-all"
                >
                  <div className="relative flex-shrink-0">
                    <div className="w-6 h-6 bg-accent border border-border rounded-full flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                      {dm.name.charAt(0)}
                    </div>
                    <div className={cn(
                      "absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ring-1 ring-black",
                      dm.online ? "bg-green-500" : "bg-zinc-500"
                    )} />
                  </div>
                  <span className="truncate">{dm.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Chat Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative bg-zinc-900/10">
        {/* Top Bar */}
        <div className="h-14 border-b border-border px-6 flex items-center justify-between bg-background/30">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-foreground font-bold text-base">
              <Hash size={18} className="text-primary" />
              <span>{activeChannel?.name ? activeChannel.name.toLowerCase().replace(/\s+/g, '-') : 'Select Team'}</span>
            </div>
            <div className="hidden sm:flex h-4 w-px bg-border mx-1" />
            <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
              <Users size={12} />
              <span>{activeChannel?.members?.length || 0} members</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center bg-accent rounded-lg px-2.5 py-1 border border-border focus-within:border-primary/50 transition-all">
              <Search size={14} className="text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Search..." 
                className="bg-transparent border-none outline-none text-xs text-foreground placeholder:text-muted-foreground/50 w-32 sm:w-48 ml-2"
              />
            </div>
            <div className="relative group/settings">
              <button 
                onClick={() => setShowSettings(!showSettings)}
                className={cn(
                  "p-2 rounded-lg hover:bg-white/5 transition-all",
                  showSettings ? "text-primary bg-primary/5" : "text-muted-foreground"
                )}
              >
                <Settings size={18} />
              </button>
              
              <AnimatePresence>
                {showSettings && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="absolute right-0 mt-2 w-48 bg-[#0d0d12] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 p-1.5"
                  >
                    {(() => {
                      const currentUser = authService.getCurrentUser();
                      const requester = activeChannel.members?.find(m => (m.user._id || m.user) === (currentUser.id || currentUser._id));
                      const isOwner = activeChannel.owner === (currentUser.id || currentUser._id) || activeChannel.owner?._id === (currentUser.id || currentUser._id);
                      const isAdmin = requester && requester.role === 'admin';
                      
                      if (isOwner || isAdmin) {
                        return (
                          <>
                            <button 
                              onClick={() => {
                                setShowSettings(false);
                                handleClearChat();
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                            >
                              <Trash2 size={14} />
                              Clear Chat History
                            </button>
                            <div className="h-px bg-white/5 my-1" />
                          </>
                        );
                      }
                      return null;
                    })()}
                    <button className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-white/5 rounded-lg transition-all">
                      <Settings size={14} />
                      Channel Settings
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Message Feed */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
          {/* Welcome message header */}
          <div className="border-b border-border pb-6 mb-6">
            <div className="w-14 h-14 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center text-primary mb-4 shadow-lg">
              <Hash size={28} />
            </div>
            <h3 className="text-xl font-bold text-foreground">Welcome to #{activeChannel?.name}!</h3>
            <p className="text-sm text-muted-foreground font-light">This is the start of the {activeChannel?.name} team channel. Start collaborating!</p>
          </div>

          {messages.map((msg) => {
            const msgKey = msg._id || msg.id;
            return (
              <motion.div 
                key={msgKey}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-4 group"
            >
              <div className={cn(
                "w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-md overflow-hidden", 
                msg.color
              )}>
                {msg.avatar || msg.userId?.avatar ? (
                  <img src={msg.avatar || msg.userId.avatar} alt={msg.user} className="w-full h-full object-cover" />
                ) : (
                  msg.initial
                )}
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-bold text-foreground hover:underline cursor-pointer">{msg.user}</span>
                  <span className="text-[10px] text-muted-foreground font-light">
                    {msg.time || (msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '')}
                  </span>
                </div>
                <div className="text-sm text-foreground/90 leading-relaxed break-words font-light">
                  {msg.text}
                </div>
                
                {/* Render code block layout */}
                {msg.isCode && (
                  <div className="mt-2.5 bg-accent/50 border border-border rounded-xl overflow-hidden">
                    <div className="bg-accent/80 px-4 py-1.5 border-b border-border flex items-center justify-between text-[10px] text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Code size={12} className="text-primary" />
                        <span>javascript</span>
                      </div>
                      <span className="cursor-pointer hover:text-foreground">Copy</span>
                    </div>
                    <pre className="p-4 text-xs font-mono text-foreground overflow-x-auto scrollbar-thin bg-background/30">
                      <code>{msg.code}</code>
                    </pre>
                  </div>
                )}
              </div>
              </motion.div>
            );
          })}
          <div ref={messagesEndRef} />
          
          {messages.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
              <div className="w-20 h-20 bg-primary/5 rounded-3xl flex items-center justify-center text-primary/30 mb-4 border border-dashed border-primary/20">
                <MessageSquare size={32} />
              </div>
              <h4 className="text-lg font-bold text-foreground">No messages in {activeChannel?.name} yet</h4>
              <p className="text-sm text-muted-foreground font-light max-w-xs mx-auto mt-2">
                Be the first to start the conversation! Send a message below to collaborate with your team.
              </p>
            </div>
          )}
        </div>

        {/* Sticky composer bottom */}
        <div className="p-4 md:p-6 bg-gradient-to-t from-black/40 via-black/10 to-transparent">
          <form 
            onSubmit={handleSendMessage}
            className="glass border border-border rounded-2xl flex items-center px-4 py-2.5 gap-2 shadow-2xl focus-within:border-primary/50 transition-all"
          >
            <button type="button" className="p-2 text-muted-foreground hover:text-foreground bg-white/0 hover:bg-accent rounded-xl transition-all flex-shrink-0">
              <Paperclip size={18} />
            </button>
            
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={`Message #${activeChannel?.name || '...'}`}
              className="flex-1 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground/50 py-2"
            />

            <div className="flex items-center gap-1 flex-shrink-0">
              <button type="button" className="p-2 text-muted-foreground hover:text-foreground bg-white/0 hover:bg-accent rounded-xl transition-all">
                <Smile size={18} />
              </button>
              <button 
                type="submit"
                disabled={!inputValue.trim()}
                className={cn(
                  "p-2.5 rounded-xl text-white shadow-md transition-all active:scale-95 flex items-center justify-center",
                  inputValue.trim() 
                    ? "bg-primary hover:bg-primary/90" 
                    : "bg-accent text-muted-foreground/50 cursor-not-allowed opacity-50 shadow-none"
                )}
              >
                <Send size={16} />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Chat;

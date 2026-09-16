import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import socket from '../services/socketService';
import { activityService } from '../services/activityService';

const ActivityContext = createContext();

export const useActivity = () => {
  const context = useContext(ActivityContext);
  if (!context) {
    throw new Error('useActivity must be used within an ActivityProvider');
  }
  return context;
};

// Clean Synthesized Bell notification sound utilizing Web Audio API (Zero dependencies)
const playNotificationChime = () => {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;
    
    // Tone 1: High crisp chime (G#5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(830.61, now); 
    gain1.gain.setValueAtTime(0.1, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    
    // Tone 2: Soft delay bell (C6)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1046.50, now + 0.06); 
    gain2.gain.setValueAtTime(0.08, now + 0.06);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    
    osc1.start(now);
    osc1.stop(now + 0.3);
    osc2.start(now + 0.06);
    osc2.stop(now + 0.4);
  } catch (error) {
    console.warn('[ActivityAudio] Web Audio context not allowed or supported yet.', error);
  }
};

export const ActivityProvider = ({ children }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [soundOn, setSoundOn] = useState(() => {
    return localStorage.getItem('devsync_activity_sound') !== 'false';
  });

  const [activeFilters, setActiveFilters] = useState({
    teamId: '',
    actionType: ''
  });

  // Fetch paginated activities
  const fetchActivities = useCallback(async (filters = {}, loadMore = false) => {
    const token = localStorage.getItem('devsync_token');
    if (!token) return;

    try {
      setLoading(true);
      const nextPage = loadMore ? page + 1 : 1;
      
      const queryParams = {
        page: nextPage,
        limit: 20,
        ...filters
      };

      const data = await activityService.getActivities(queryParams);
      
      if (loadMore) {
        setActivities(prev => {
          // Avoid duplicate activity IDs
          const existingIds = new Set(prev.map(a => a._id));
          const uniqueNew = data.activities.filter(a => !existingIds.has(a._id));
          return [...prev, ...uniqueNew];
        });
        setPage(nextPage);
      } else {
        setActivities(data.activities);
        setPage(1);
      }
      
      setHasMore(data.hasMore);
    } catch (error) {
      console.error('[ActivityContext] Failed to load activities:', error);
    } finally {
      setLoading(false);
    }
  }, [page]);

  // Handle changing filters
  const applyFilters = useCallback((filters = {}) => {
    const updatedFilters = { ...activeFilters, ...filters };
    setActiveFilters(updatedFilters);
    fetchActivities(updatedFilters, false);
  }, [activeFilters, fetchActivities]);

  // Trigger simulation events
  const triggerActivity = useCallback(async (activityData) => {
    try {
      await activityService.triggerActivity(activityData);
    } catch (error) {
      console.error('[ActivityContext] Failed to trigger activity:', error);
    }
  }, []);

  // Sound toggle
  const toggleSound = useCallback(() => {
    setSoundOn(prev => {
      const next = !prev;
      localStorage.setItem('devsync_activity_sound', next.toString());
      return next;
    });
  }, []);

  const resetUnreadCount = useCallback(() => {
    setUnreadCount(0);
  }, []);

  // Listen to Socket IO live events
  useEffect(() => {
    // Connect user and set up listeners
    const storedUser = localStorage.getItem('devsync_user');
    let userId = null;
    if (storedUser) {
      try {
        userId = JSON.parse(storedUser)._id;
      } catch (e) {}
    }

    if (!socket.connected) {
      socket.connect();
    }

    if (userId) {
      socket.emit('join-user', userId);
    }

    // New activity broadcast listener
    const handleNewActivity = (activity) => {
      if (!activity || !activity._id) return;
      
      setActivities(prev => {
        // Prevent duplicate socket activities
        if (prev.some(a => a._id === activity._id)) return prev;
        return [activity, ...prev];
      });

      setUnreadCount(prev => prev + 1);

      // Play audio chime if enabled
      if (soundOn) {
        playNotificationChime();
      }
    };

    // Live online users list listener
    const handleOnlineUsers = (usersList) => {
      setOnlineUsers(usersList || []);
    };

    socket.on('new-activity', handleNewActivity);
    socket.on('users:online', handleOnlineUsers);

    return () => {
      socket.off('new-activity', handleNewActivity);
      socket.off('users:online', handleOnlineUsers);
    };
  }, [soundOn]);

  // Fetch initial activities on mount
  useEffect(() => {
    fetchActivities({}, false);
  }, []);

  return (
    <ActivityContext.Provider
      value={{
        activities,
        loading,
        page,
        hasMore,
        unreadCount,
        onlineUsers,
        soundOn,
        activeFilters,
        fetchActivities,
        applyFilters,
        triggerActivity,
        toggleSound,
        resetUnreadCount
      }}
    >
      {children}
    </ActivityContext.Provider>
  );
};

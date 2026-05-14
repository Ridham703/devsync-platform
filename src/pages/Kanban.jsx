import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  DndContext, 
  DragOverlay, 
  closestCorners, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors 
} from '@dnd-kit/core';
import { 
  SortableContext, 
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

import { 
  Plus, 
  MoreHorizontal, 
  MessageSquare, 
  Paperclip, 
  User,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  X,
  AlertCircle,
  Layout,
  Edit,
  Trash2,
  Eye,
  Lock,
  Activity,
  FileText,
  Send,
  Loader2,
  Filter
} from 'lucide-react';

import GlassCard from '../components/GlassCard';
import { cn } from '../lib/utils';
import taskService from '../services/taskService';
import { projectService } from '../services/projectService';
import { teamService } from '../services/teamService';
import authService from '../services/authService';
import socket from '../services/socketService';

// --- Constants & Helpers ---

const COLUMNS = [
  { id: 'TODO', title: 'To Do', color: 'bg-zinc-500/20 text-zinc-500 dark:text-zinc-400 border-zinc-500/30' },
  { id: 'IN_PROGRESS', title: 'In Progress', color: 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30' },
  { id: 'UNDER_REVIEW', title: 'Under Review', color: 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30' },
  { id: 'DONE', title: 'Done', color: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' },
];

const getTaskId = (task) => task?._id || task?.id;

const normalizeStatus = (status) => {
  if (!status) return 'TODO';
  const s = status.toUpperCase().replace(' ', '_');
  return ['TODO', 'IN_PROGRESS', 'UNDER_REVIEW', 'DONE'].includes(s) ? s : 'TODO';
};

// --- Components ---

const DroppableColumn = ({ id, children }) => {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className="flex-1 bg-card/40 backdrop-blur-sm rounded-2xl border border-border/50 p-3 flex flex-col gap-3 overflow-y-auto scrollbar-thin min-h-[200px] transition-colors duration-300">
      {children}
    </div>
  );
};

const SortableTask = ({ task, isLocked, onClick, children }) => {
  const tId = getTaskId(task);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: tId,
    data: { task, type: 'Task' },
    disabled: isLocked
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : 1,
    cursor: isLocked ? 'default' : 'grab'
  };

  return (
    <div ref={setNodeRef} style={style} {...(isLocked ? {} : attributes)} {...(isLocked ? {} : listeners)} onClick={onClick} className="outline-none">
      {children}
    </div>
  );
};

// --- Main Page ---

const Kanban = () => {
  // State
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [teams, setTeams] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(null); // Column ID
  const [newTitle, setNewTitle] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [modalData, setModalData] = useState({
    title: '',
    desc: '',
    tag: 'Feature',
    priority: 'Medium',
    projectId: '',
    assignedTo: []
  });

  // Modal Extras
  const [comments, setComments] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [activeDragTask, setActiveDragTask] = useState(null);

  // User Info
  const currentUser = authService.getCurrentUser();
  const userRole = useMemo(() => {
    const role = currentUser?.role?.toLowerCase() || 'visitor';
    if (['admin', 'manager', 'assignment_man'].includes(role)) return role;
    if (['developer', 'member'].includes(role)) return 'assignment_man';
    return 'visitor';
  }, [currentUser?.role]);

  // Sensors for DND
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // --- Data Fetching ---

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [tasksData, projectsData, teamsData] = await Promise.all([
        taskService.getAllTasks(),
        projectService.getProjects(),
        teamService.getTeams()
      ]);
      
      setTasks(tasksData || []);
      setProjects(projectsData || []);
      setTeams(teamsData || []);
      
      const members = teamsData.reduce((acc, team) => {
        team.members?.forEach(m => {
          if (m.user && !acc.find(u => u._id === m.user._id)) acc.push(m.user);
        });
        return acc;
      }, []);
      setTeamMembers(members);
    } catch (error) {
      console.error('Board data fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?._id]);

  useEffect(() => {
    fetchData();
    // Socket setup...

    socket.connect();
    socket.emit('join-board', 'default-project-board');

    socket.on('task-updated', (data) => {
      setTasks(prev => prev.map(t => 
        String(getTaskId(t)) === String(data.taskId) ? { ...t, status: normalizeStatus(data.targetStatus) } : t
      ));
    });

    socket.on('task-created', (task) => {
      setTasks(prev => [task, ...prev]);
    });

    socket.on('task-deleted', (taskId) => {
      setTasks(prev => prev.filter(t => getTaskId(t) !== taskId));
    });

    return () => {
      socket.off('task-updated');
      socket.off('task-created');
      socket.off('task-deleted');
      socket.disconnect();
    };
  }, [fetchData]);

  // Fetch comments/activity when task selected
  useEffect(() => {
    if (selectedTask && !isEditing) {
      const fetchExtras = async () => {
        try {
          const tId = getTaskId(selectedTask);
          const [comms, logs] = await Promise.all([
            taskService.getComments(tId),
            taskService.getActivityLogs(tId)
          ]);
          setComments(comms || []);
          setActivityLogs(logs || []);
        } catch (error) {
          console.error("Failed to fetch task extras", error);
        }
      };
      fetchExtras();
    }
  }, [selectedTask, isEditing]);

  // --- Logic & Actions ---

  const checkMovementPermission = (task, targetStatus = null) => {
    if (userRole === 'admin' || userRole === 'manager') return { allowed: true };
    if (userRole === 'visitor') return { allowed: false, message: 'Visitors have read-only access' };
    
    if (userRole === 'assignment_man') {
      const currentUserId = currentUser?.id || currentUser?._id;
      const assignedIds = Array.isArray(task.assignedTo) 
        ? task.assignedTo.map(a => a._id || a) 
        : [task.assignedTo?._id || task.assignedTo];
      
      const isAssignee = assignedIds.includes(currentUserId);
      const isCreator = (task.createdBy?._id || task.createdBy) === currentUserId;
      
      if (!isAssignee && !isCreator) {
        return { allowed: false, message: 'You can only move tasks assigned to you or created by you.' };
      }

      if (targetStatus === 'DONE') {
        return { allowed: false, message: 'Only Managers or Admins can move tasks to Done.' };
      }
    }

    return { allowed: true };
  };

  const moveTask = async (taskId, newStatus) => {
    const currentTask = tasks.find(t => getTaskId(t) === taskId);
    if (!currentTask || normalizeStatus(currentTask.status) === newStatus) return;
    
    const permission = checkMovementPermission(currentTask, newStatus);
    if (!permission.allowed) {
      alert(permission.message);
      return;
    }

    // Optimistic update
    const oldStatus = currentTask.status;
    setTasks(prev => prev.map(t => String(getTaskId(t)) === String(taskId) ? { ...t, status: newStatus } : t));

    try {
      await taskService.updateTaskDetails(taskId, { status: newStatus });
      socket.emit('card-moved', {
        taskId,
        sourceStatus: oldStatus,
        targetStatus: newStatus,
        boardId: 'default-project-board'
      });
    } catch (err) {
      console.error('Failed to move task:', err);
      // Revert
      setTasks(prev => prev.map(t => String(getTaskId(t)) === String(taskId) ? { ...t, status: oldStatus } : t));
      alert(err.response?.data?.message || 'Failed to move task. Reverting...');
    }
  };

  const handleDragStart = (event) => {
    const { active } = event;
    const task = tasks.find(t => getTaskId(t) === active.id);
    if (task) setActiveDragTask(task);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveDragTask(null);

    if (!over) return;

    const taskId = active.id;
    const overId = over.id;
    

    // Determine target status
    let targetStatus = null;
    if (['TODO', 'IN_PROGRESS', 'UNDER_REVIEW', 'DONE'].includes(overId)) {
      targetStatus = overId;
    } else {
      const overTask = tasks.find(t => getTaskId(t) === overId);
      if (overTask) targetStatus = normalizeStatus(overTask.status);
    }

    if (targetStatus && targetStatus !== normalizeStatus(activeTaskData?.status)) {
      await moveTask(taskId, targetStatus);
    }
  };

  const handleOpenModal = (task = null) => {
    if (task) {
      setSelectedTask(task);
      setModalData({
        title: task.title || '',
        desc: task.description || task.desc || '',
        tag: task.tag || 'Feature',
        priority: task.priority || 'Medium',
        projectId: task.projectId || (task.projectId?._id || ''),
        assignedTo: (task.assignedTo || []).map(a => a._id || a)
      });
      setIsEditing(false);
    } else {
      setSelectedTask(null);
      setModalData({ title: '', desc: '', tag: 'Feature', priority: 'Medium', projectId: '', assignedTo: [] });
      setIsEditing(true);
    }
    setActiveTab('details');
    setIsModalOpen(true);
  };

  const handleSaveTask = async (colId = 'TODO') => {
    if (!modalData.title.trim()) return;

    const payload = {
      title: modalData.title,
      description: modalData.desc,
      status: selectedTask ? normalizeStatus(selectedTask.status) : colId,
      tag: modalData.tag,
      priority: modalData.priority,
      projectId: modalData.projectId || undefined,
      assignedTo: modalData.assignedTo
    };

    try {
      if (selectedTask) {
        const taskId = getTaskId(selectedTask);
        const updated = await taskService.updateTaskDetails(taskId, payload);
        setTasks(prev => prev.map(t => getTaskId(t) === taskId ? updated : t));
      } else {
        const created = await taskService.createNewTask(payload);
        setTasks(prev => [created, ...prev]);
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error('Save task error:', err);
      alert(err.response?.data?.message || 'Failed to save task');
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Permanent deletion. Are you sure?')) return;
    try {
      await taskService.deleteTaskById(taskId);
      setTasks(prev => prev.filter(t => getTaskId(t) !== taskId));
      setIsModalOpen(false);
    } catch (err) {
      console.error('Delete task error:', err);
    }
  };

  const handleQuickAdd = async (colId) => {
    if (!newTitle.trim()) return;
    try {
      const created = await taskService.createNewTask({
        title: newTitle,
        status: colId,
        tag: 'Task',
        priority: 'Medium'
      });
      setTasks(prev => [created, ...prev]);
      setNewTitle('');
      setIsAdding(null);
    } catch (err) {
      console.error('Quick add error:', err);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !selectedTask) return;
    try {
      const added = await taskService.addComment(getTaskId(selectedTask), newComment);
      setComments(prev => [...prev, added]);
      setNewComment('');
    } catch (err) {
      console.error('Comment add error:', err);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedTask) return;
    try {
      setIsUploading(true);
      const tId = getTaskId(selectedTask);
      const newAttachment = await taskService.uploadAttachment(tId, file);
      
      setSelectedTask(prev => ({
        ...prev,
        attachments: [...(prev.attachments || []), newAttachment]
      }));
      
      setTasks(prev => prev.map(t => getTaskId(t) === tId ? {
        ...t, attachments: [...(t.attachments || []), newAttachment]
      } : t));
    } catch (err) {
      console.error('File upload error:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const getTagColor = (tag) => {
    switch(tag) {
      case 'Bug': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'Feature': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'Design': return 'bg-pink-500/10 text-pink-500 border-pink-500/20';
      case 'DevOps': return 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20';
      default: return 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20';
    }
  };

  const getPriorityColor = (p) => {
    switch(p) {
      case 'High': return 'text-red-500';
      case 'Medium': return 'text-amber-500';
      default: return 'text-blue-500';
    }
  };

  // --- Render ---

  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 text-primary animate-spin" />
        <p className="text-muted-foreground font-medium animate-pulse">Loading workspace...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Sprint Board</h1>
          <p className="text-muted-foreground text-sm mt-1 font-light">Collaborate and track project progress in real-time</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            {teamMembers.slice(0, 5).map((m, i) => (
              <div key={i} className="h-8 w-8 rounded-full bg-accent border-2 border-background flex items-center justify-center text-[10px] font-bold" title={m.username}>
                {m.avatar ? <img src={m.avatar} alt="" className="h-full w-full rounded-full object-cover"/> : m.username?.charAt(0).toUpperCase()}
              </div>
            ))}
            {teamMembers.length > 5 && (
              <div className="h-8 w-8 rounded-full bg-accent border-2 border-background flex items-center justify-center text-[10px] text-muted-foreground">
                +{teamMembers.length - 5}
              </div>
            )}
          </div>
          <div className="h-8 w-px bg-border mx-2" />
          {userRole !== 'visitor' && (
            <button 
              onClick={() => handleOpenModal()}
              className="bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-primary/20 transition-all active:scale-95 flex items-center gap-2"
            >
              <Plus size={16} />
              New Task
            </button>
          )}
        </div>
      </div>

      {/* Board Content */}
      <DndContext 
        sensors={sensors} 
        collisionDetection={closestCorners} 
        onDragStart={handleDragStart} 
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 flex gap-6 overflow-x-auto pb-6 scrollbar-thin">
          {COLUMNS.map((col) => {
            const colTasks = tasks.filter(t => normalizeStatus(t.status) === col.id);
            return (
              <div key={col.id} className="w-80 flex-shrink-0 flex flex-col gap-4 max-h-[78vh]">
                {/* Column Header */}
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-3">
                    <span className={cn("px-3 py-1 text-[10px] font-extrabold rounded-lg border uppercase tracking-widest", col.color)}>
                      {col.title}
                    </span>
                    <span className="text-xs text-muted-foreground font-bold opacity-60">{colTasks.length}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {userRole !== 'visitor' && (
                      <button 
                        onClick={() => setIsAdding(col.id)}
                        className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                      >
                        <Plus size={16} />
                      </button>
                    )}
                    <button className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-all">
                      <MoreHorizontal size={16} />
                    </button>
                  </div>
                </div>

                {/* Tasks Droppable Area */}
                <DroppableColumn id={col.id}>
                  {/* Quick Add Form */}
                  <AnimatePresence>
                    {isAdding === col.id && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="glass border border-primary/20 p-3 rounded-xl flex flex-col gap-3 shadow-xl"
                      >
                        <textarea
                          autoFocus
                          placeholder="Task title..."
                          value={newTitle}
                          onChange={(e) => setNewTitle(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleQuickAdd(col.id))}
                          className="w-full bg-background/50 border border-border text-foreground p-3 rounded-lg text-xs focus:border-primary/50 outline-none resize-none"
                          rows={2}
                        />
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => { setIsAdding(null); setNewTitle(''); }} className="px-3 py-1.5 text-[10px] text-muted-foreground hover:text-foreground font-bold">Cancel</button>
                          <button onClick={() => handleQuickAdd(col.id)} className="px-4 py-1.5 bg-primary text-white font-bold text-[10px] rounded-lg shadow-lg shadow-primary/20 transition-transform active:scale-95">Add</button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Task Cards */}
                  <SortableContext items={colTasks.map(getTaskId)} strategy={verticalListSortingStrategy}>
                    {colTasks.map((task) => {
                      const tId = getTaskId(task);
                      const { allowed } = checkMovementPermission(task);
                      const isLocked = !allowed;
                      
                      return (
                        <SortableTask key={tId} task={task} isLocked={isLocked} onClick={() => handleOpenModal(task)}>
                          <div className={cn(
                            "group glass border border-border hover:border-primary/30 p-4 rounded-xl relative transition-all duration-300 shadow-sm hover:shadow-md cursor-pointer overflow-hidden",
                            isLocked && "opacity-80 grayscale-[0.3]"
                          )}>
                            {/* Decorative accent */}
                            <div className={cn("absolute left-0 top-0 bottom-0 w-1 opacity-0 group-hover:opacity-100 transition-opacity", col.color.split(' ')[1])} />

                            <div className="flex items-center justify-between gap-2 mb-3">
                              <span className={cn("px-2 py-0.5 text-[9px] font-bold rounded border uppercase tracking-wider", getTagColor(task.tag))}>
                                {task.tag}
                              </span>
                              {isLocked ? (
                                <Lock size={12} className="text-muted-foreground/40" />
                              ) : (
                                <span className={cn("text-[9px] font-bold", getPriorityColor(task.priority))}>
                                  {task.priority}
                                </span>
                              )}
                            </div>

                            <h4 className="text-sm font-bold text-foreground leading-snug group-hover:text-primary transition-colors mb-2">
                              {task.title}
                            </h4>
                            
                            {(task.description || task.desc) && (
                              <p className="text-[11px] text-muted-foreground font-light mb-4 line-clamp-2 leading-relaxed">
                                {task.description || task.desc}
                              </p>
                            )}

                            <div className="flex items-center justify-between pt-3 border-t border-border/50">
                              <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-medium">
                                <span className="flex items-center gap-1.5">
                                  <MessageSquare size={12} /> {task.commentsCount || 0}
                                </span>
                                {(task.attachments?.length > 0) && (
                                  <span className="flex items-center gap-1.5">
                                    <Paperclip size={12} /> {task.attachments.length}
                                  </span>
                                )}
                              </div>
                              <div className="flex -space-x-1.5">
                                {(task.assignedTo || []).slice(0, 3).map((user, idx) => {
                                  const member = teamMembers.find(m => m._id === (user._id || user));
                                  return (
                                    <div key={idx} className="h-6 w-6 rounded-full border-2 border-card bg-zinc-800 flex items-center justify-center overflow-hidden" title={member?.username}>
                                      {member?.avatar ? <img src={member.avatar} alt="" className="h-full w-full object-cover"/> : <span className="text-[8px] font-bold text-white">{member?.username?.charAt(0).toUpperCase() || '?'}</span>}
                                    </div>
                                  );
                                })}
                                {task.assignedTo?.length > 3 && (
                                  <div className="h-6 w-6 rounded-full border-2 border-card bg-accent flex items-center justify-center text-[8px] font-bold">
                                    +{task.assignedTo.length - 3}
                                  </div>
                                )}
                                {(!task.assignedTo || task.assignedTo.length === 0) && (
                                  <div className="h-6 w-6 rounded-full border-2 border-card bg-zinc-800 flex items-center justify-center text-muted-foreground/30">
                                    <User size={10} />
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </SortableTask>
                      );
                    })}
                  </SortableContext>

                  {colTasks.length === 0 && !isAdding === col.id && (
                    <div className="flex-1 flex flex-col items-center justify-center py-10 text-center border-2 border-dashed border-border/30 rounded-2xl opacity-40">
                      <CheckCircle2 size={24} className="text-muted-foreground mb-3" />
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Clear</p>
                    </div>
                  )}
                </DroppableColumn>
              </div>
            );
          })}
        </div>

        <DragOverlay>
          {activeDragTask ? (
            <div className="glass border border-primary/40 p-4 rounded-xl shadow-2xl bg-card/95 scale-105 cursor-grabbing w-80 opacity-90">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className={cn("px-2 py-0.5 text-[9px] font-bold rounded border uppercase tracking-wider", getTagColor(activeDragTask.tag))}>
                  {activeDragTask.tag}
                </span>
                <span className={cn("text-[9px] font-bold", getPriorityColor(activeDragTask.priority))}>
                  {activeDragTask.priority}
                </span>
              </div>
              <h4 className="text-sm font-bold text-foreground leading-snug">{activeDragTask.title}</h4>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Task Multi-purpose Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-card border border-border/50 rounded-[2.5rem] shadow-2xl p-8 max-h-[90vh] overflow-y-auto scrollbar-thin"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-2xl text-primary shadow-inner">
                    {!selectedTask ? <Plus size={24} /> : isEditing ? <Edit size={24} /> : <Layout size={24} />}
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-foreground tracking-tight">
                      {!selectedTask ? 'Create New Task' : isEditing ? 'Edit Task' : 'Task Perspective'}
                    </h3>
                    <p className="text-xs text-muted-foreground font-medium">
                      {selectedTask ? `ID: ${getTaskId(selectedTask).slice(-8)}` : 'Initiate a new workflow item'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedTask && !isEditing && userRole !== 'visitor' && (
                    <button onClick={() => setIsEditing(true)} className="p-2.5 hover:bg-primary/10 rounded-xl text-primary transition-all shadow-sm"><Edit size={20} /></button>
                  )}
                  {selectedTask && (userRole === 'admin' || (selectedTask.createdBy?._id || selectedTask.createdBy) === currentUser?.id) && (
                    <button onClick={() => handleDeleteTask(getTaskId(selectedTask))} className="p-2.5 hover:bg-red-500/10 rounded-xl text-red-500 transition-all shadow-sm"><Trash2 size={20} /></button>
                  )}
                  <button onClick={() => setIsModalOpen(false)} className="p-2.5 hover:bg-accent rounded-xl transition-all"><X size={20} /></button>
                </div>
              </div>

              {selectedTask && !isEditing && (
                <div className="flex items-center gap-8 border-b border-border/50 mb-8 overflow-x-auto scrollbar-hide">
                  {['details', 'comments', 'activity'].map(tab => (
                    <button 
                      key={tab}
                      onClick={() => setActiveTab(tab)} 
                      className={cn(
                        "pb-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all whitespace-nowrap", 
                        activeTab === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {tab === 'comments' ? 'Comments & Files' : tab}
                    </button>
                  ))}
                </div>
              )}

              <div className="space-y-8">
                {/* Details Tab / Edit Mode */}
                {(activeTab === 'details' || isEditing || !selectedTask) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Title</label>
                      {isEditing || !selectedTask ? (
                        <input
                          required autoFocus
                          type="text" placeholder="What needs to be done?"
                          value={modalData.title}
                          onChange={(e) => setModalData({...modalData, title: e.target.value})}
                          className="w-full px-6 py-4 bg-accent/30 border border-border/50 rounded-2xl outline-none text-foreground placeholder:text-muted-foreground/30 focus:border-primary/50 transition-all font-semibold"
                        />
                      ) : (
                        <div className="w-full px-6 py-4 bg-accent/10 border border-border/20 rounded-2xl text-xl font-bold text-foreground">{modalData.title}</div>
                      )}
                    </div>
                    
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Description</label>
                      {isEditing || !selectedTask ? (
                        <textarea
                          rows={4} placeholder="Describe the mission details..."
                          value={modalData.desc}
                          onChange={(e) => setModalData({...modalData, desc: e.target.value})}
                          className="w-full px-6 py-4 bg-accent/30 border border-border/50 rounded-2xl outline-none text-foreground placeholder:text-muted-foreground/30 focus:border-primary/50 transition-all resize-none font-light leading-relaxed"
                        />
                      ) : (
                        <div className="w-full px-6 py-4 bg-accent/10 border border-border/20 rounded-2xl text-muted-foreground text-sm font-light leading-relaxed min-h-[120px] whitespace-pre-wrap">
                          {modalData.desc || 'No mission briefing provided.'}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Project</label>
                      {isEditing || !selectedTask ? (
                        <select
                          value={modalData.projectId}
                          onChange={(e) => setModalData({...modalData, projectId: e.target.value})}
                          className="w-full px-5 py-3.5 bg-accent/30 border border-border/50 rounded-2xl text-sm outline-none text-foreground focus:border-primary/50 transition-all cursor-pointer font-medium"
                        >
                          <option value="">Select Target Project</option>
                          {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                        </select>
                      ) : (
                        <div className="w-full px-5 py-3.5 bg-accent/10 border border-border/20 rounded-2xl text-sm text-foreground font-bold">
                          {projects.find(p => p._id === modalData.projectId)?.name || 'General Operations'}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Primary Assignee</label>
                      {isEditing || !selectedTask ? (
                        <select
                          value={modalData.assignedTo[0] || ''}
                          onChange={(e) => setModalData({...modalData, assignedTo: e.target.value ? [e.target.value] : []})}
                          className="w-full px-5 py-3.5 bg-accent/30 border border-border/50 rounded-2xl text-sm outline-none text-foreground focus:border-primary/50 transition-all cursor-pointer font-medium"
                        >
                          <option value="">Unassigned</option>
                          {teamMembers.map(u => <option key={u._id} value={u._id}>{u.username}</option>)}
                        </select>
                      ) : (
                        <div className="flex items-center gap-3 w-full px-5 py-3.5 bg-accent/10 border border-border/20 rounded-2xl text-sm">
                          <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold">
                            {teamMembers.find(u => u._id === modalData.assignedTo[0])?.username?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <span className="font-bold">{teamMembers.find(u => u._id === modalData.assignedTo[0])?.username || 'Freelance / Unassigned'}</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Type Tag</label>
                      {isEditing || !selectedTask ? (
                        <div className="flex flex-wrap gap-2">
                          {['Feature', 'Bug', 'Design', 'DevOps', 'Task'].map(t => (
                            <button 
                              key={t} type="button" 
                              onClick={() => setModalData({...modalData, tag: t})}
                              className={cn(
                                "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all",
                                modalData.tag === t ? "bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-105" : "bg-accent/20 text-muted-foreground border-border/50 hover:bg-accent/40"
                              )}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className={cn("w-fit px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest border", getTagColor(modalData.tag))}>
                          {modalData.tag}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Priority Matrix</label>
                      {isEditing || !selectedTask ? (
                        <div className="flex gap-2">
                          {['Low', 'Medium', 'High'].map(p => (
                            <button 
                              key={p} type="button" 
                              onClick={() => setModalData({...modalData, priority: p})}
                              className={cn(
                                "flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all",
                                modalData.priority === p ? cn("bg-card text-foreground border-border shadow-md", getPriorityColor(p)) : "bg-accent/20 text-muted-foreground border-border/50"
                              )}
                            >
                              {p}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className={cn("w-fit px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest border border-border/30", getPriorityColor(modalData.priority))}>
                          {modalData.priority} Priority
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Comments & Files Tab */}
                {selectedTask && !isEditing && activeTab === 'comments' && (
                  <div className="space-y-8 animate-in fade-in duration-500">
                    {/* Files */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Mission Attachments</label>
                        <div className="relative">
                          <input type="file" onChange={handleFileUpload} disabled={isUploading} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                          <button disabled={isUploading} className="flex items-center gap-2 text-[10px] font-black uppercase bg-primary text-white px-4 py-2 rounded-xl hover:shadow-lg hover:shadow-primary/30 transition-all disabled:opacity-50">
                            {isUploading ? <Loader2 size={12} className="animate-spin" /> : <Paperclip size={12} />} {isUploading ? 'Syncing...' : 'Upload Asset'}
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {selectedTask.attachments?.length > 0 ? selectedTask.attachments.map((file, i) => (
                          <a key={i} href={file.url} target="_blank" rel="noreferrer" className="flex items-center gap-4 bg-accent/20 border border-border/30 p-4 rounded-2xl hover:bg-accent/30 transition-all group">
                            <div className="p-3 bg-primary/10 rounded-xl text-primary group-hover:bg-primary/20 transition-all"><FileText size={20} /></div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-foreground truncate">{file.filename}</p>
                              <p className="text-[10px] text-muted-foreground">{new Date(file.uploadedAt).toLocaleDateString()}</p>
                            </div>
                          </a>
                        )) : (
                          <div className="sm:col-span-2 text-center py-10 border-2 border-dashed border-border/20 rounded-3xl opacity-50">
                            <Paperclip size={32} className="mx-auto mb-2 text-muted-foreground/30" />
                            <p className="text-xs font-bold text-muted-foreground tracking-tighter">No encrypted files found for this task.</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="h-px bg-border/50" />

                    {/* Comments */}
                    <div className="space-y-6">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1 flex items-center gap-2"><MessageSquare size={14}/> Communication Log</label>
                      <div className="space-y-4 max-h-[350px] overflow-y-auto scrollbar-thin pr-2">
                        {comments.length > 0 ? comments.map(c => (
                          <div key={c._id} className="flex gap-4 group">
                            <div className="h-10 w-10 rounded-full bg-accent flex-shrink-0 overflow-hidden border border-border/50 shadow-sm">
                              {c.user?.avatar ? <img src={c.user.avatar} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center font-black text-xs text-primary">{c.user?.username?.charAt(0).toUpperCase()}</div>}
                            </div>
                            <div className="bg-accent/20 border border-border/30 rounded-[2rem] rounded-tl-sm p-5 flex-1 relative">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-black text-foreground">{c.user?.username}</span>
                                <span className="text-[10px] text-muted-foreground font-medium opacity-50">{new Date(c.createdAt).toLocaleString()}</span>
                              </div>
                              <p className="text-sm text-foreground/80 font-light leading-relaxed">{c.content}</p>
                            </div>
                          </div>
                        )) : (
                          <div className="text-center py-8 opacity-40 italic text-xs font-medium">Be the first to leave a status update...</div>
                        )}
                      </div>
                      <form onSubmit={handleAddComment} className="flex gap-3 pt-2">
                        <input 
                          type="text" 
                          value={newComment}
                          onChange={e => setNewComment(e.target.value)}
                          placeholder="Broadcast a comment..." 
                          className="flex-1 bg-accent/20 border border-border/50 rounded-2xl px-6 py-4 text-sm outline-none focus:border-primary/50 transition-all font-medium"
                        />
                        <button type="submit" disabled={!newComment.trim()} className="p-4 bg-primary text-white rounded-2xl disabled:opacity-50 hover:shadow-lg hover:shadow-primary/30 transition-all active:scale-95">
                          <Send size={18} />
                        </button>
                      </form>
                    </div>
                  </div>
                )}

                {/* Activity Tab */}
                {selectedTask && !isEditing && activeTab === 'activity' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-h-[450px] overflow-y-auto scrollbar-thin pr-4">
                    {activityLogs.length > 0 ? activityLogs.map((log, i) => (
                      <div key={log._id || i} className="flex gap-6 relative">
                        {i !== activityLogs.length - 1 && <div className="absolute left-[1.25rem] top-10 bottom-[-24px] w-0.5 bg-gradient-to-b from-border/50 to-transparent" />}
                        <div className="h-10 w-10 rounded-2xl bg-card border border-border/50 overflow-hidden flex-shrink-0 relative z-10 flex items-center justify-center shadow-sm">
                           {log.user?.avatar ? <img src={log.user.avatar} className="w-full h-full object-cover"/> : <Activity size={16} className="text-primary/50"/>}
                        </div>
                        <div className="py-1">
                          <p className="text-sm text-foreground leading-relaxed">
                            <span className="font-black">{log.user?.username || 'System'}</span> <span className="text-muted-foreground font-light">{log.details || log.action}</span>
                          </p>
                          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-tighter mt-1">{new Date(log.createdAt).toLocaleString()}</p>
                        </div>
                      </div>
                    )) : (
                      <div className="text-center py-16 opacity-30">
                        <Activity size={48} className="mx-auto mb-4" />
                        <p className="text-sm font-black uppercase tracking-widest">No spectral history found.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Modal Actions */}
                <div className="flex flex-col gap-4 pt-8 mt-4 border-t border-border/30">
                  {selectedTask && !isEditing && (
                    <div className="flex flex-wrap items-center gap-3 mb-2 animate-in fade-in slide-in-from-left-4 duration-500">
                      <div className="flex items-center gap-2 text-[9px] font-black text-zinc-500 uppercase tracking-widest mr-2">
                        <Activity size={12} />
                        Transition To:
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {COLUMNS.filter(c => c.id !== normalizeStatus(selectedTask.status)).map(col => (
                          <button 
                            key={col.id}
                            onClick={() => { 
                              moveTask(getTaskId(selectedTask), col.id); 
                              setIsModalOpen(false); 
                            }}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-[9px] font-bold border transition-all hover:scale-105 active:scale-95 shadow-sm",
                              col.color
                            )}
                          >
                            {col.title}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex gap-4">
                    <button
                      onClick={() => { setIsModalOpen(false); setSelectedTask(null); setIsEditing(false); }}
                      className="flex-1 py-4 border border-border/50 hover:bg-accent/20 text-muted-foreground rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all"
                    >
                      {isEditing || !selectedTask ? 'Cancel' : 'Dismiss'}
                    </button>
                    {(isEditing || !selectedTask) && (
                      <button
                        onClick={() => handleSaveTask()}
                        className="flex-1 py-4 bg-primary hover:bg-primary/90 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary/20 transition-all active:scale-[0.98]"
                      >
                        {selectedTask ? 'Finalize Changes' : 'Initialize Task'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Kanban;

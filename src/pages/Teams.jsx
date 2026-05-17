import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  UserPlus, 
  Shield, 
  Mail, 
  Plus, 
  X,
  ArrowRight,
  Loader2,
  Trash2,
  UserMinus
} from 'lucide-react';
import GlassCard from '../components/GlassCard';
import { teamService } from '../services/teamService';
import { cn } from '../lib/utils';
import socket from '../services/socketService';

const Teams = () => {
  const [teams, setTeams] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDesc, setNewTeamDesc] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);

  const currentUser = JSON.parse(localStorage.getItem('devsync_user'));

  const fetchData = async () => {
    try {
      const [teamsData, invitesData] = await Promise.all([
        teamService.getTeams(),
        teamService.getInvitations()
      ]);
      setTeams(teamsData || []);
      setInvitations(invitesData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Socket listeners for real-time experience
    socket.on('team-joined', () => fetchData());
    socket.on('team-deleted', () => fetchData());
    socket.on('removed-from-team', () => fetchData());
    socket.on('member-joined', () => fetchData());
    socket.on('member-removed', () => fetchData());
    socket.on('new-notification', () => fetchData());

    return () => {
      socket.off('team-joined');
      socket.off('team-deleted');
      socket.off('removed-from-team');
      socket.off('member-joined');
      socket.off('member-removed');
      socket.off('new-notification');
    };
  }, []);

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    try {
      await teamService.createTeam({ name: newTeamName, description: newTeamDesc });
      setIsModalOpen(false);
      setNewTeamName('');
      setNewTeamDesc('');
      fetchData();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleJoinTeam = async (teamId) => {
    try {
      await teamService.joinTeam(teamId);
      fetchData();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleDeclineTeam = async (teamId) => {
    try {
      await teamService.declineInvitation(teamId);
      fetchData();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    setInviting(true);
    try {
      await teamService.inviteMember(selectedTeam._id, inviteEmail);
      setIsInviteModalOpen(false);
      setInviteEmail('');
      fetchData();
    } catch (error) {
      alert(error.message);
    } finally {
      setInviting(false);
    }
  };

  const handleUpdateRole = async (userId, newRole) => {
    try {
      await teamService.updateMemberRole(selectedTeam._id, userId, newRole);
      fetchData();
      const updatedTeams = await teamService.getTeams();
      const updatedSelected = updatedTeams.find(t => t._id === selectedTeam._id);
      setSelectedTeam(updatedSelected);
    } catch (error) {
      alert(error.message);
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm('Are you sure you want to remove this member?')) return;
    try {
      await teamService.removeMember(selectedTeam._id, userId);
      fetchData();
      const updatedTeams = await teamService.getTeams();
      const updatedSelected = updatedTeams.find(t => t._id === selectedTeam._id);
      setSelectedTeam(updatedSelected);
    } catch (error) {
      alert(error.message);
    }
  };

  const handleDeleteTeam = async (teamId) => {
    if (!window.confirm('Are you sure you want to delete this team? This action cannot be undone.')) return;
    try {
      await teamService.deleteTeam(teamId);
      fetchData();
    } catch (error) {
      alert(error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="animate-spin text-primary h-12 w-12" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Teams</h1>
          <p className="text-muted-foreground text-sm mt-1 font-light">Manage your organizational units.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary hover:bg-primary/90 transition-all px-6 py-2.5 rounded-xl text-white text-sm font-bold shadow-lg flex items-center gap-2"
        >
          <Plus size={18} />
          Create Team
        </button>
      </div>

      {/* Pending Invitations Section */}
      {invitations.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider ml-1">Pending Invitations</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {invitations.map((invite) => (
              <GlassCard key={invite._id} className="p-4 border-primary/20 bg-primary/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <Mail size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">{invite.name}</h4>
                    <p className="text-[10px] text-muted-foreground">Invited by {invite.owner?.username}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleDeclineTeam(invite._id)}
                    className="px-4 py-2 border border-white/10 hover:bg-white/5 text-muted-foreground text-xs font-bold rounded-lg transition-all"
                  >
                    Decline
                  </button>
                  <button 
                    onClick={() => handleJoinTeam(invite._id)}
                    className="px-4 py-2 bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded-lg transition-all"
                  >
                    Accept
                  </button>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teams.map((team) => (
          <GlassCard key={team._id} className="p-6">
            <div className="flex justify-between items-start mb-6">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <Users size={28} />
              </div>
              <div className="flex items-center gap-2">
                {team.owner._id === currentUser?._id && (
                  <>
                    <span className="text-[10px] font-bold uppercase px-2 py-1 bg-primary/10 text-primary rounded-md border border-primary/20">Owner</span>
                    <button 
                      onClick={() => handleDeleteTeam(team._id)}
                      className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                      title="Delete Team"
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
              </div>
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">{team.name}</h3>
            <p className="text-sm text-muted-foreground mb-6 line-clamp-2 h-10 font-light">{team.description}</p>
            
            <div className="space-y-3 mb-6">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Members ({team.members.length})</span>
                <button 
                  onClick={() => { setSelectedTeam(team); setIsMembersModalOpen(true); }}
                  className="text-[10px] text-primary hover:underline font-bold"
                >
                  View All
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {team.members.slice(0, 5).map((m, i) => (
                  <div 
                    key={i} 
                    title={m.user.username}
                    className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-2 py-1 pr-3"
                  >
                    <div className="h-5 w-5 rounded-md bg-accent flex items-center justify-center text-[8px] font-bold">
                      {m.user.avatar ? <img src={m.user.avatar} className="w-full h-full object-cover" /> : m.user.username.charAt(0)}
                    </div>
                    <span className="text-[10px] font-medium text-foreground truncate max-w-[60px]">{m.user.username}</span>
                  </div>
                ))}
                {team.members.length > 5 && (
                  <div className="h-7 px-2 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[10px] text-muted-foreground font-bold">
                    +{team.members.length - 5}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-4 border-t border-white/5">
              <div className="flex -space-x-2">
                {team.members.slice(0, 3).map((m, i) => (
                  <div key={i} className="h-8 w-8 rounded-full border-2 border-background bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-white uppercase overflow-hidden ring-1 ring-white/10 shadow-lg">
                    {m.user.avatar ? <img src={m.user.avatar} className="w-full h-full object-cover" /> : m.user.username.charAt(0)}
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                {team.owner._id === currentUser?._id && (
                  <button onClick={() => { setSelectedTeam(team); setIsInviteModalOpen(true); }} className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-muted-foreground"><UserPlus size={16} /></button>
                )}
                <button onClick={() => { setSelectedTeam(team); setIsMembersModalOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-xs font-bold hover:bg-white/10 transition-all">Manage <ArrowRight size={14} /></button>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-md bg-[#12121a] border border-white/10 rounded-3xl p-8">
              <h3 className="text-2xl font-bold mb-8">Create New Team</h3>
              <form onSubmit={handleCreateTeam} className="space-y-6">
                <input required type="text" placeholder="Team Name" value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl outline-none" />
                <textarea placeholder="Description" value={newTeamDesc} onChange={(e) => setNewTeamDesc(e.target.value)} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl outline-none resize-none" rows={3} />
                <button type="submit" className="w-full py-4 bg-primary rounded-xl font-bold">Initialize Team</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      <AnimatePresence>
        {isInviteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsInviteModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-md bg-[#12121a] border border-white/10 rounded-3xl p-8">
              <h3 className="text-2xl font-bold mb-4">Invite Member</h3>
              <form onSubmit={handleInvite} className="space-y-6">
                <input required type="email" placeholder="Member Email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl outline-none" />
                <button type="submit" disabled={inviting} className="w-full py-4 bg-primary rounded-xl font-bold flex items-center justify-center gap-2">
                  {inviting ? <Loader2 className="animate-spin" size={18} /> : 'Send Invitation'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isMembersModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsMembersModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-lg bg-[#0d0d12] border border-white/10 rounded-3xl p-8">
              <h3 className="text-2xl font-bold mb-8">Team Members</h3>
              <div className="space-y-4">
                {selectedTeam?.members.map((m) => (
                  <div key={m.user._id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl group hover:bg-white/10 transition-all gap-4">
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary/20 to-violet-500/10 border border-white/10 flex items-center justify-center overflow-hidden shadow-inner">
                        {m.user.avatar ? <img src={m.user.avatar} className="w-full h-full object-cover" /> : <span className="text-sm font-bold text-primary">{m.user.username.charAt(0)}</span>}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground flex items-center gap-2">
                          {m.user.username}
                          {m.user._id === selectedTeam.owner._id && <Shield size={12} className="text-primary" />}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-light">{m.user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                      <span className={cn(
                        "text-[9px] font-bold uppercase px-2 py-0.5 rounded-md border",
                        m.role === 'admin' ? "bg-primary/10 border-primary/20 text-primary" : "bg-white/5 border-white/10 text-muted-foreground"
                      )}>
                        {m.role}
                      </span>
                      {selectedTeam.owner._id === currentUser?._id && m.user._id !== currentUser?._id && (
                        <div className="flex items-center gap-1">
                          <select 
                            value={m.role} 
                            onChange={(e) => handleUpdateRole(m.user._id, e.target.value)} 
                            className="bg-[#0d0d12] border border-white/10 rounded-lg text-[10px] px-2 py-1 outline-none focus:border-primary/50"
                          >
                            <option value="admin">Admin</option>
                            <option value="member">Member</option>
                            <option value="viewer">Viewer</option>
                          </select>
                          <button 
                            onClick={() => handleRemoveMember(m.user._id)}
                            className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                            title="Remove Member"
                          >
                            <UserMinus size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => setIsMembersModalOpen(false)} className="w-full mt-8 py-4 border border-white/10 rounded-xl font-bold">Close</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Teams;

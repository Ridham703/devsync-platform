import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  User, 
  Mail, 
  Briefcase, 
  MapPin, 
  Phone, 
  Globe, 
  Save, 
  Camera,
  CheckCircle2,
  AlertCircle,
  Code
} from 'lucide-react';

// Custom Brand Icons since some lucide-react versions don't include them
const Github = ({ size = 16, className = "" }) => (
  <svg 
    width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" 
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}
  >
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
  </svg>
);

const Linkedin = ({ size = 16, className = "" }) => (
  <svg 
    width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" 
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}
  >
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect width="4" height="12" x="2" y="9" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

const Twitter = ({ size = 16, className = "" }) => (
  <svg 
    width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" 
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}
  >
    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
  </svg>
);
import userService from '../services/userService';
import { cn } from '../lib/utils';

const Profile = () => {
  const [profile, setProfile] = useState({
    username: '',
    email: '',
    bio: '',
    jobTitle: '',
    location: '',
    phone: '',
    skills: [],
    socialLinks: {
      github: '',
      linkedin: '',
      twitter: ''
    }
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [newSkill, setNewSkill] = useState('');
  const fileInputRef = useRef(null);

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Local preview (Optimistic UI)
    const reader = new FileReader();
    reader.onloadend = () => {
      setProfile(prev => ({ ...prev, avatar: reader.result }));
    };
    reader.readAsDataURL(file);

    // Upload to server
    const formData = new FormData();
    formData.append('avatar', file);

    try {
      setIsSaving(true);
      const data = await userService.uploadAvatar(formData);
      setProfile(prev => ({ ...prev, avatar: data.avatar }));
      
      // Update local storage
      const currentUser = JSON.parse(localStorage.getItem('devsync_user') || '{}');
      currentUser.avatar = data.avatar;
      localStorage.setItem('devsync_user', JSON.stringify(currentUser));
      
      setMessage({ type: 'success', text: 'Avatar updated successfully!' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Avatar upload failed' });
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await userService.getProfile();
        setProfile(data);
      } catch (err) {
        setMessage({ type: 'error', text: 'Failed to load profile' });
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setProfile(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setProfile(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleAddSkill = (e) => {
    if (e.key === 'Enter' && newSkill.trim()) {
      e.preventDefault();
      if (!profile.skills.includes(newSkill.trim())) {
        setProfile(prev => ({
          ...prev,
          skills: [...prev.skills, newSkill.trim()]
        }));
      }
      setNewSkill('');
    }
  };

  const removeSkill = (skillToRemove) => {
    setProfile(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skillToRemove)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const updated = await userService.updateProfile(profile);
      setProfile(updated);
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      
      // Update local storage if username/avatar changed
      const currentUser = JSON.parse(localStorage.getItem('devsync_user') || '{}');
      const newUser = { ...currentUser, ...updated };
      localStorage.setItem('devsync_user', JSON.stringify(newUser));
      
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Update failed' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      {/* Header Profile Summary */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative h-64 rounded-3xl overflow-hidden shadow-2xl border border-white/10"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-background to-violet-500/10" />
        <div className="absolute inset-0 backdrop-blur-3xl" />
        
        <div className="absolute bottom-0 left-0 right-0 p-8 flex flex-col md:flex-row items-end gap-6 bg-gradient-to-t from-black/60 to-transparent">
          <div className="relative group">
            <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 border-4 border-background shadow-2xl overflow-hidden flex items-center justify-center text-white text-4xl font-bold">
              {profile.avatar ? (
                <img src={profile.avatar} alt={profile.username} className="w-full h-full object-cover" />
              ) : (
                profile.username.charAt(0).toUpperCase()
              )}
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleAvatarChange} 
              className="hidden" 
              accept="image/*" 
            />
            <button 
              onClick={() => fileInputRef.current.click()}
              className="absolute bottom-2 right-2 p-2 bg-primary rounded-xl shadow-lg hover:scale-110 transition-transform text-white border border-white/20"
            >
              <Camera size={16} />
            </button>
          </div>
          
          <div className="flex-1 text-center md:text-left mb-2">
            <h1 className="text-3xl font-bold text-white mb-1">{profile.username}</h1>
            <p className="text-white/70 font-medium">{profile.jobTitle || 'Productive Member'}</p>
            <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-3">
              {profile.location && (
                <div className="flex items-center gap-1.5 text-xs text-white/50">
                  <MapPin size={14} />
                  <span>{profile.location}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 text-xs text-white/50">
                <Mail size={14} />
                <span>{profile.email}</span>
              </div>
            </div>
          </div>
          
          <button 
            onClick={handleSubmit}
            disabled={isSaving}
            className="w-full md:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-primary hover:bg-primary/90 text-white rounded-2xl font-bold shadow-xl shadow-primary/20 transition-all disabled:opacity-50"
          >
            {isSaving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={18} />}
            <span>Save Profile</span>
          </button>
        </div>
      </motion.div>

      {message.text && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className={cn(
            "p-4 rounded-2xl flex items-center gap-3 border shadow-lg",
            message.type === 'success' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-red-500/10 border-red-500/20 text-red-500"
          )}
        >
          {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span className="font-medium text-sm">{message.text}</span>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Basic Info */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-card/30 border border-white/5 rounded-3xl p-8 backdrop-blur-xl">
            <div className="flex items-center gap-2 mb-6">
              <User size={20} className="text-primary" />
              <h2 className="text-lg font-bold text-foreground">Basic Information</h2>
            </div>
            
            <form className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">Username</label>
                <div className="relative">
                  <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
                  <input
                    type="text"
                    name="username"
                    value={profile.username}
                    onChange={handleChange}
                    className="w-full bg-background/50 border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-sm focus:border-primary/50 outline-none transition-all text-foreground"
                    placeholder="Your unique handle"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">Email Address</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
                  <input
                    type="email"
                    name="email"
                    value={profile.email}
                    onChange={handleChange}
                    className="w-full bg-background/50 border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-sm focus:border-primary/50 outline-none transition-all text-foreground"
                    placeholder="email@example.com"
                  />
                </div>
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">About / Bio</label>
                <textarea
                  name="bio"
                  value={profile.bio}
                  onChange={handleChange}
                  rows={4}
                  className="w-full bg-background/50 border border-white/5 rounded-2xl p-4 text-sm focus:border-primary/50 outline-none transition-all text-foreground resize-none"
                  placeholder="Tell us a bit about yourself, your goals, and what you're working on..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">Job Title</label>
                <div className="relative">
                  <Briefcase size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
                  <input
                    type="text"
                    name="jobTitle"
                    value={profile.jobTitle}
                    onChange={handleChange}
                    className="w-full bg-background/50 border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-sm focus:border-primary/50 outline-none transition-all text-foreground"
                    placeholder="Senior Frontend Developer"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">Location</label>
                <div className="relative">
                  <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
                  <input
                    type="text"
                    name="location"
                    value={profile.location}
                    onChange={handleChange}
                    className="w-full bg-background/50 border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-sm focus:border-primary/50 outline-none transition-all text-foreground"
                    placeholder="City, Country"
                  />
                </div>
              </div>
            </form>
          </div>

          <div className="bg-card/30 border border-white/5 rounded-3xl p-8 backdrop-blur-xl">
            <div className="flex items-center gap-2 mb-6">
              <Code size={20} className="text-primary" />
              <h2 className="text-lg font-bold text-foreground">Skills & Expertise</h2>
            </div>
            
            <div className="space-y-6">
              <div className="relative">
                <input
                  type="text"
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyDown={handleAddSkill}
                  className="w-full bg-background/50 border border-white/5 rounded-2xl py-3 px-4 text-sm focus:border-primary/50 outline-none transition-all text-foreground"
                  placeholder="Add a skill (React, Node.js, Design...) and press Enter"
                />
              </div>
              
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((skill, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-xl text-xs font-medium text-primary"
                  >
                    <span>{skill}</span>
                    <button 
                      onClick={() => removeSkill(skill)}
                      className="hover:text-white transition-colors"
                    >
                      &times;
                    </button>
                  </motion.div>
                ))}
                {profile.skills.length === 0 && (
                  <p className="text-sm text-muted-foreground italic font-light">No skills added yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Sidebar info */}
        <div className="space-y-8">
          <div className="bg-card/30 border border-white/5 rounded-3xl p-8 backdrop-blur-xl">
            <div className="flex items-center gap-2 mb-6">
              <Globe size={20} className="text-primary" />
              <h2 className="text-lg font-bold text-foreground">Social Presence</h2>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="relative">
                  <Github size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
                  <input
                    type="text"
                    name="socialLinks.github"
                    value={profile.socialLinks.github}
                    onChange={handleChange}
                    className="w-full bg-background/50 border border-white/5 rounded-2xl py-2.5 pl-12 pr-4 text-xs focus:border-primary/50 outline-none transition-all text-foreground"
                    placeholder="GitHub URL"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="relative">
                  <Linkedin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
                  <input
                    type="text"
                    name="socialLinks.linkedin"
                    value={profile.socialLinks.linkedin}
                    onChange={handleChange}
                    className="w-full bg-background/50 border border-white/5 rounded-2xl py-2.5 pl-12 pr-4 text-xs focus:border-primary/50 outline-none transition-all text-foreground"
                    placeholder="LinkedIn URL"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="relative">
                  <Twitter size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
                  <input
                    type="text"
                    name="socialLinks.twitter"
                    value={profile.socialLinks.twitter}
                    onChange={handleChange}
                    className="w-full bg-background/50 border border-white/5 rounded-2xl py-2.5 pl-12 pr-4 text-xs focus:border-primary/50 outline-none transition-all text-foreground"
                    placeholder="Twitter URL"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card/30 border border-white/5 rounded-3xl p-8 backdrop-blur-xl">
            <div className="flex items-center gap-2 mb-6">
              <Phone size={20} className="text-primary" />
              <h2 className="text-lg font-bold text-foreground">Contact</h2>
            </div>
            
            <div className="space-y-2">
              <div className="relative">
                <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
                <input
                  type="text"
                  name="phone"
                  value={profile.phone}
                  onChange={handleChange}
                  className="w-full bg-background/50 border border-white/5 rounded-2xl py-2.5 pl-12 pr-4 text-xs focus:border-primary/50 outline-none transition-all text-foreground"
                  placeholder="+1 (555) 000-0000"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;

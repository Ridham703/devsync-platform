import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Mail, Lock, User, ArrowRight, ShieldAlert, ShieldCheck, KeyRound } from 'lucide-react';
import GlassCard from '../components/GlassCard';
import authService from '../services/authService';

const Auth = () => {
  // Viewport Step Controller: 'form' | 'otp' | 'forgot' | 'reset'
  const [step, setStep] = useState('form');
  const [isLogin, setIsLogin] = useState(true);
  
  // State holders
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  // Status/Feedbacks
  const [isLoading, setIsLoading] = useState(false);
  const [isOtpLoading, setIsOtpLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const navigate = useNavigate();
  
  // Auto-redirect if already logged in
  React.useEffect(() => {
    if (authService.getCurrentUser()) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

  const clearForm = () => {
    setError('');
    setSuccess('');
    setOtp('');
    setPassword('');
    setNewPassword('');
    setOtpSent(false);
  };
  // Handle Submit for standard Login / Final Signup
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!isLogin) {
      if (!name || !email || !password || !otp) {
        return setError('All fields including OTP are required');
      }
      if (otp.length !== 6) {
        return setError('OTP must be 6 digits');
      }
    }

    setIsLoading(true);
    setError('');
    setSuccess('');
    
    try {
      if (isLogin) {
        // Direct database check & session persist
        await authService.loginUser({ email, password });
        navigate('/dashboard');
      } else {
        // Register with OTP
        await authService.registerUser({ username: name, email, password, otp });
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Form error:', err);
      setError(err.response?.data?.message || 'Connection issues. Is server running?');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!email) return setError('Please enter your email first');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError('Invalid email format');

    setIsOtpLoading(true);
    setError('');
    setSuccess('');

    try {
      await authService.sendOtp(email, 'signup');
      setOtpSent(true);
      setSuccess('OTP sent successfully to your email');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setIsOtpLoading(false);
    }
  };

  // Verify OTP + Register Account (DEPRECATED - direct signup enabled)
  const handleOTPVerify = async (e) => { e.preventDefault(); };

  // Step 1: Request OTP for password reset
  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    if (!email) return setError('Please enter your email first');

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      // Trigger OTP dispatch for 'reset' type
      await authService.sendOtp(email, 'reset');
      setSuccess('Recovery code sent! Please check your inbox.');
      setStep('reset');
    } catch (err) {
      setError(err.response?.data?.message || 'No registered account linked to this email.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify OTP and finalize recovery
  const handlePasswordReset = async (e) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) return setError('Please enter the 6-digit recovery code');
    if (!newPassword || newPassword.length < 6) return setError('Password must be at least 6 characters');

    setIsLoading(true);
    setError('');

    try {
      await authService.resetPassword(email, otp, newPassword);
      setSuccess('Profile secured! Please sign in with your new credentials.');
      setStep('form');
      setIsLogin(true);
      setOtp('');
      setNewPassword('');
      setPassword('');
    } catch (err) {
      setError(err.response?.data?.message || 'Recovery failed. Invalid code or connection error.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative px-4 py-12 overflow-hidden transition-colors duration-300">
      {/* Ambient background glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-gradient-radial from-primary/20 via-violet-900/5 to-transparent blur-[80px] pointer-events-none" />
      <div className="absolute -top-24 right-1/4 w-96 h-96 rounded-full bg-pink-600/10 blur-[100px] pointer-events-none animate-pulse-slow" />
      
      <Link 
        to="/" 
        className="absolute top-8 left-8 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group z-20"
      >
        <div className="bg-white/5 hover:bg-white/10 border border-white/10 p-2 rounded-xl group-hover:border-white/20 transition-all">
          <Terminal size={16} />
        </div>
        <span className="font-semibold text-sm tracking-tight">Back to Home</span>
      </Link>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-md z-10 mt-8"
      >
        <div className="text-center mb-6 flex flex-col items-center">
          <div className="w-14 h-14 bg-gradient-to-br from-primary to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-[0_0_30px_rgba(139,92,246,0.4)] mb-4">
            <Terminal size={28} />
          </div>
          <h2 className="text-2xl font-extrabold text-foreground tracking-tight">
            {step === 'otp' ? "Verify Your Identity" : 
             step === 'forgot' ? "Reset Credentials" : 
             step === 'reset' ? "Enter Recovery Key" : 
             isLogin ? "Welcome back to DevSync" : "Create your account"}
          </h2>
          <p className="text-muted-foreground text-sm font-light mt-2 px-6">
            {step === 'otp' ? `We dispatched a code to ${email}. Check server terminal!` : 
             step === 'forgot' ? "Type your registered work email to dispatch a recovery code." : 
             step === 'reset' ? "Type the code printed in terminal alongside new password." :
             isLogin ? "Sign in to your shared workspace" : "Join thousands of developer teams today"}
          </p>
        </div>

        <GlassCard className="shadow-3xl border border-white/10 p-8 relative">
          
          {/* Validation Status Banners */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex items-start gap-3 text-[13px] backdrop-blur-md shadow-lg"
              >
                <ShieldAlert size={18} className="flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-red-500 mb-0.5">Authentication Error</p>
                  <p className="opacity-90">{error}</p>
                </div>
              </motion.div>
            )}
            
            {success && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex items-start gap-3 text-[13px] backdrop-blur-md shadow-lg"
              >
                <ShieldCheck size={18} className="flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-emerald-500 mb-0.5">Success</p>
                  <p className="opacity-90">{success}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ======================================= */}
          {/* STEP: PRIMARY AUTH FORM                 */}
          {/* ======================================= */}
          {step === 'form' && (
            <>
              {/* Tab Switcher */}
              <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 mb-8">
                <button
                  type="button"
                  onClick={() => { setIsLogin(true); clearForm(); }}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all relative ${
                    isLogin ? 'text-white' : 'text-muted-foreground hover:text-white'
                  }`}
                >
                  {isLogin && (
                    <motion.div 
                      layoutId="activeTab"
                      className="absolute inset-0 bg-white/10 border border-white/10 rounded-lg shadow-sm"
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">Log In</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setIsLogin(false); clearForm(); }}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all relative ${
                    !isLogin ? 'text-white' : 'text-muted-foreground hover:text-white'
                  }`}
                >
                  {!isLogin && (
                    <motion.div 
                      layoutId="activeTab"
                      className="absolute inset-0 bg-white/10 border border-white/10 rounded-lg shadow-sm"
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">Sign Up</span>
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="space-y-5">
                <AnimatePresence mode="wait">
                  {!isLogin && (
                    <motion.div
                      key="name-input"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-2 overflow-hidden"
                    >
                      <label className="text-xs font-medium text-zinc-400 ml-1">Full Name</label>
                      <div className="relative">
                        <User className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                        <input
                          required
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Alex Doe"
                          className="w-full pl-10 pr-4 py-3 bg-white/5 border border-border rounded-xl focus:border-primary/50 focus:ring-0 outline-none text-foreground placeholder:text-muted-foreground/50 text-sm transition-all"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-400 ml-1">Work Email</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Mail className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                      <input
                        required
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="alex@company.com"
                        className="w-full pl-10 pr-4 py-3 bg-white/5 border border-border rounded-xl focus:border-primary/50 focus:ring-0 outline-none text-foreground placeholder:text-muted-foreground/50 text-sm transition-all"
                      />
                    </div>
                    {!isLogin && (
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={isOtpLoading || otpSent}
                        className="px-4 py-3 bg-primary/10 border border-primary/20 text-primary text-xs font-semibold rounded-xl hover:bg-primary/20 disabled:opacity-50 transition-all whitespace-nowrap"
                      >
                        {isOtpLoading ? (
                          <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                        ) : otpSent ? "Resend" : "Send OTP"}
                      </button>
                    )}
                  </div>
                </div>

                {!isLogin && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-2"
                  >
                    <label className="text-xs font-medium text-zinc-400 ml-1">6-Digit OTP</label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                      <input
                        required={!isLogin}
                        type="text"
                        maxLength={6}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                        placeholder="Enter 6-digit code"
                        className="w-full pl-10 pr-4 py-3 bg-white/5 border border-border rounded-xl focus:border-primary/50 focus:ring-0 outline-none text-foreground placeholder:text-muted-foreground/50 text-sm transition-all tracking-[0.2em] font-mono"
                      />
                    </div>
                  </motion.div>
                )}

                <div className="space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-xs font-medium text-zinc-400">Password</label>
                    {isLogin && (
                      <button 
                        type="button"
                        onClick={() => { setStep('forgot'); setError(''); }}
                        className="text-[11px] text-primary hover:underline focus:outline-none"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                    <input
                      required
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-3 bg-white/5 border border-border rounded-xl focus:border-primary/50 focus:ring-0 outline-none text-foreground placeholder:text-muted-foreground/50 text-sm transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-primary text-white font-semibold h-12 rounded-xl hover:bg-primary/90 transition-all active:scale-[0.98] shadow-[0_4px_20px_-2px_rgba(139,92,246,0.4)] relative flex items-center justify-center overflow-hidden"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span className="flex items-center gap-2">
                      {isLogin ? "Sign In" : "Sign Up"} <ArrowRight size={16} />
                    </span>
                  )}
                </button>
              </form>

              <div className="relative my-6 text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/5"></div>
                </div>
                <span className="relative z-10 bg-background px-3 text-[11px] text-muted-foreground uppercase tracking-wider transition-colors duration-300">Or continue with</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button className="flex items-center justify-center gap-2 py-2.5 px-4 bg-white/5 border border-border hover:bg-white/10 rounded-xl text-foreground text-sm font-medium transition-all active:scale-[0.98]">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0012 2z" />
                  </svg>
                  Github
                </button>
                <button className="flex items-center justify-center gap-2 py-2.5 px-4 bg-white/5 border border-border hover:bg-white/10 rounded-xl text-foreground text-sm font-medium transition-all active:scale-[0.98]">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12.24 10.285V14.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.579-7.859-8s3.529-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l3.227-3.102C18.228 1.814 15.524 1 12.24 1 6.03 1 1 6.03 1 12.24s5.03 11.24 11.24 11.24c6.48 0 10.789-4.557 10.789-10.983 0-.738-.079-1.3-.177-1.857H12.24z" />
                  </svg>
                  Google
                </button>
              </div>
            </>
          )}

          {/* ======================================= */}
          {/* STEP: FORGOT PASSWORD EMAIL TRIGGER     */}
          {/* ======================================= */}
          {step === 'forgot' && (
            <form onSubmit={handleForgotSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400 ml-1">Account Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                  <input
                    required
                    autoFocus
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter recovery email..."
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-border rounded-xl focus:border-primary/50 focus:ring-0 outline-none text-foreground placeholder:text-muted-foreground/50 text-sm transition-all"
                  />
                </div>
              </div>

              <div className="space-y-3 pt-3">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-primary text-white font-semibold h-12 rounded-xl hover:bg-primary/90 transition-all flex items-center justify-center"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span className="flex items-center gap-2">Continue <ArrowRight size={16} /></span>
                  )}
                </button>
                <button 
                  type="button"
                  disabled={isLoading}
                  onClick={() => { setStep('form'); setError(''); }}
                  className="w-full text-xs text-zinc-500 hover:text-foreground transition-colors py-2 text-center"
                >
                  Back to Log In
                </button>
              </div>
            </form>
          )}

          {/* ======================================= */}
          {/* STEP: RESET PASSWORD DIRECT SUBMIT      */}
          {/* ======================================= */}
          {step === 'reset' && (
            <form onSubmit={handlePasswordReset} className="space-y-5">
              
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400 ml-1">Recovery Code</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                  <input
                    required
                    autoFocus
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 6-digit code"
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-border rounded-xl focus:border-primary/50 focus:ring-0 outline-none text-foreground placeholder:text-muted-foreground/50 text-sm transition-all tracking-[0.2em] font-mono"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400 ml-1">Choose New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                  <input
                    required
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-border rounded-xl focus:border-primary/50 focus:ring-0 outline-none text-foreground placeholder:text-muted-foreground/50 text-sm transition-all"
                  />
                </div>
              </div>

              <div className="space-y-3 pt-4">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-primary to-purple-600 text-white font-bold h-12 rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center shadow-lg"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span>Update & Log In</span>
                  )}
                </button>
                <button 
                  type="button"
                  disabled={isLoading}
                  onClick={() => { setStep('form'); setOtp(''); setError(''); }}
                  className="w-full text-xs text-zinc-500 hover:text-foreground transition-colors py-2 text-center"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {step === 'form' && !isLogin && (
            <p className="text-center text-[11px] text-zinc-500 mt-6 font-light leading-relaxed">
              By proceeding, you agree to DevSync's <a href="#" className="text-zinc-300 hover:underline">Terms of Service</a> and <a href="#" className="text-zinc-300 hover:underline">Privacy Policy</a>.
            </p>
          )}
        </GlassCard>
      </motion.div>
    </div>
  );
};

export default Auth;

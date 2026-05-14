import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';

const GlassCard = ({ children, className, hover = false, animate = false, delay = 0, ...props }) => {
  const Comp = animate ? motion.div : 'div';
  
  const animationProps = animate ? {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, delay, ease: "easeOut" }
  } : {};

  return (
    <Comp
      className={cn(
        "glass-card rounded-2xl p-6 relative overflow-hidden",
        hover && "transition-all duration-300 hover:shadow-[0_0_30px_rgba(139,92,246,0.15)] hover:border-border/80",
        className
      )}
      {...animationProps}
      {...props}
    >
      {/* Subtle background glow inside the card */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-violet-600/5 rounded-full blur-3xl pointer-events-none" />
      
      <div className="relative z-10 h-full w-full">
        {children}
      </div>
    </Comp>
  );
};

export default GlassCard;

import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, className = '' }) => {
  return (
    <div className={`bg-gradient-to-br from-white/70 via-white/50 to-white/30 backdrop-blur-md border border-white/60 shadow-[0_8px_32px_rgba(31,38,135,0.07)] rounded-[2rem] p-6 ${className}`}>
      {children}
    </div>
  );
};
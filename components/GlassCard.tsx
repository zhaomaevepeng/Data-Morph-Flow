import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, className = '' }) => {
  return (
    <div className={`bg-white/40 backdrop-blur-xl border border-white/50 shadow-lg rounded-3xl p-6 ${className}`}>
      {children}
    </div>
  );
};

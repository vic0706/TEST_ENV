import React from 'react';

export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-slate-800 rounded-2xl p-4 shadow-lg border border-slate-700 ${className}`}>
    {children}
  </div>
);

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' }> = ({ 
  children, variant = 'primary', className = '', ...props 
}) => {
  const baseStyle = "px-4 py-3 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2";
  const variants = {
    // Red Theme for Louie RUNBIKE
    primary: "bg-red-600 hover:bg-red-500 text-white shadow-red-900/20 shadow-lg",
    secondary: "bg-slate-700 hover:bg-slate-600 text-slate-200",
    danger: "bg-rose-600 hover:bg-rose-500 text-white"
  };
  
  return (
    <button className={`${baseStyle} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

export const StatBox: React.FC<{ label: string; value: string | number; sub?: string; color?: string }> = ({ label, value, sub, color = "text-white" }) => (
  <div className="flex flex-col">
    <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">{label}</span>
    <span className={`text-2xl font-black font-mono mt-1 ${color}`}>{value}</span>
    {sub && <span className="text-slate-500 text-xs mt-1">{sub}</span>}
  </div>
);

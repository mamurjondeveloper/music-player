import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverEffect?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  hoverEffect = true,
  className = '',
  ...props
}) => {
  return (
    <div
      className={`bg-zinc-900/40 border border-white/5 backdrop-blur-xl rounded-2xl p-6 transition-all duration-300 ${hoverEffect ? 'hover:bg-zinc-900/60 hover:border-white/10 hover:shadow-xl hover:shadow-black/20' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

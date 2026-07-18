import React from 'react';
import { Music } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon = <Music className="w-12 h-12 text-zinc-600" />,
  action,
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 border border-dashed border-white/10 rounded-2xl bg-zinc-950/20 backdrop-blur-xl min-h-[300px]">
      <div className="mb-4 flex items-center justify-center p-4 bg-white/5 rounded-full">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-white mb-1.5">{title}</h3>
      <p className="text-sm text-zinc-400 max-w-xs mb-5 leading-normal">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
};

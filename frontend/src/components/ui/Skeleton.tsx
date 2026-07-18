import React from 'react';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'rect' | 'circle';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'rect',
  className = '',
  ...props
}) => {
  const baseStyles = 'bg-white/5 animate-pulse';
  
  const shapes = {
    text: 'h-4 rounded w-full',
    rect: 'rounded-xl',
    circle: 'rounded-full',
  };

  return (
    <div
      className={`${baseStyles} ${shapes[variant]} ${className}`}
      {...props}
    />
  );
};

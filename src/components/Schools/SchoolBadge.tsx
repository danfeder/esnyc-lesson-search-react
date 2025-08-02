interface SchoolBadgeProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function SchoolBadge({ name, size = 'md', className = '' }: SchoolBadgeProps) {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full bg-blue-100 text-blue-800 font-medium ${sizeClasses[size]} ${className}`}
    >
      {name}
    </span>
  );
}

interface ProgressBarProps {
  value: number; // 0-100
  color?: string;
  className?: string;
}

export function ProgressBar({ value, color = '#6366f1', className = '' }: ProgressBarProps) {
  return (
    <div className={`w-full bg-surface-tertiary rounded-full h-1.5 ${className}`}>
      <div
        className="h-1.5 rounded-full transition-all duration-300"
        style={{ width: `${Math.min(100, Math.max(0, value))}%`, backgroundColor: color }}
      />
    </div>
  );
}

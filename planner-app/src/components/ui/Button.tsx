import { type ButtonHTMLAttributes, type ReactNode } from 'react';
import { clsx } from 'clsx';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

export function Button({ variant = 'secondary', size = 'md', className, children, ...props }: ButtonProps) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        {
          'bg-gray-900 text-white hover:bg-gray-700': variant === 'primary',
          'bg-white border border-border text-text-primary hover:bg-surface-secondary': variant === 'secondary',
          'text-text-secondary hover:bg-surface-secondary hover:text-text-primary': variant === 'ghost',
          'bg-red-50 text-red-600 hover:bg-red-100': variant === 'danger',
          'text-xs px-2.5 py-1': size === 'sm',
          'text-sm px-3.5 py-2': size === 'md',
          'text-base px-5 py-2.5': size === 'lg',
        },
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

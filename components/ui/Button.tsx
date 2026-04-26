'use client';

import { type ButtonHTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={clsx(
          'inline-flex items-center justify-center rounded-lg font-semibold transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
          {
            'bg-amber-500 text-white hover:bg-amber-400 focus:ring-amber-500': variant === 'primary',
            'bg-zinc-700 text-white hover:bg-zinc-600 focus:ring-zinc-500': variant === 'secondary',
            'bg-red-600 text-white hover:bg-red-500 focus:ring-red-500': variant === 'danger',
            'bg-transparent text-zinc-300 hover:bg-zinc-800 focus:ring-zinc-500': variant === 'ghost',
            'border border-zinc-600 text-zinc-300 hover:bg-zinc-800 focus:ring-zinc-500': variant === 'outline',
          },
          {
            'px-3 py-1.5 text-sm': size === 'sm',
            'px-4 py-2 text-sm': size === 'md',
            'px-6 py-3 text-base': size === 'lg',
          },
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';

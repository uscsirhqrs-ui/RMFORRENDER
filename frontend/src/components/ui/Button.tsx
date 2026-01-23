/**
 * @fileoverview React Component - UI component for the application
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-13
 */

import React from 'react';

// Define props interface
interface ButtonProps {
  label?: string;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  children?: React.ReactNode;
}

// Button component with modern shine effect
function Button({
  label,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  icon,
  iconPosition = 'left',
  onClick,
  disabled = false,
  type = 'button',
  className = '',
  children,
}: ButtonProps) {

  // Base classes for all buttons
  const baseClasses = 'relative overflow-hidden font-heading font-semibold rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2';

  // Variant-specific styles
  const variantClasses = {
    primary: 'button-gradient text-white shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-300 focus:ring-indigo-500 border-t border-indigo-500/50',
    secondary: 'bg-white text-indigo-600 border-2 border-indigo-600 shadow-md hover:bg-indigo-50 hover:shadow-lg focus:ring-indigo-500',
    danger: 'bg-gradient-to-br from-red-600 to-red-700 text-white shadow-lg shadow-red-200 hover:shadow-xl hover:shadow-red-300 hover:from-red-700 hover:to-red-800 focus:ring-red-500 border-t border-red-500/50',
  };

  // Size-specific styles
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-6 py-2.5 text-base',
    lg: 'px-8 py-3 text-lg',
  };

  // Width classes
  const widthClass = fullWidth ? 'w-full' : '';

  // Combine all classes
  const combinedClasses = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${widthClass} ${className}`.trim();

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={combinedClasses}
    >
      {/* Shine effect overlay */}
      <span className="absolute inset-0 bg-linear-to-br from-white/20 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none"></span>

      {/* Loading spinner */}
      {loading && (
        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
      )}

      {/* Icon Left */}
      {icon && !loading && iconPosition === 'left' && <span className="relative z-10">{icon}</span>}

      {/* Label or children */}
      {(label || children) && (
        <span className="relative z-10">{children || label}</span>
      )}

      {/* Icon Right */}
      {icon && !loading && iconPosition === 'right' && <span className="relative z-10">{icon}</span>}
    </button>
  );
}

export default Button;

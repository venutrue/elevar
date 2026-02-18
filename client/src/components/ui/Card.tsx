import type { ReactNode, HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hover?: boolean;
  interactive?: boolean;
}

export function Card({ children, className = '', hover, interactive, ...props }: CardProps) {
  const hoverClass = interactive
    ? 'hover:shadow-md hover:border-gray-300 cursor-pointer active:scale-[0.99]'
    : hover
      ? 'hover:shadow-md hover:border-gray-300'
      : '';

  return (
    <div
      className={`bg-white rounded-xl border border-gray-200 shadow-sm transition-all duration-200 ${hoverClass} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function CardHeader({ children, className = '', ...props }: CardHeaderProps) {
  return (
    <div className={`px-6 py-4 border-b border-gray-200 ${className}`} {...props}>
      {children}
    </div>
  );
}

interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  children: ReactNode;
}

export function CardTitle({ children, className = '', ...props }: CardTitleProps) {
  return (
    <h3 className={`text-lg font-semibold text-gray-900 ${className}`} {...props}>
      {children}
    </h3>
  );
}

interface CardContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function CardContent({ children, className = '', ...props }: CardContentProps) {
  return (
    <div className={`px-6 py-4 ${className}`} {...props}>
      {children}
    </div>
  );
}

interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function CardFooter({ children, className = '', ...props }: CardFooterProps) {
  return (
    <div
      className={`px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

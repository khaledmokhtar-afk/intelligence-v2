import { HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  glow?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
  hover?: boolean
}

export function Card({ glow, padding = 'md', hover = true, className = '', children, style, ...props }: CardProps) {
  const padMap = { none: 0, sm: 16, md: 24, lg: 32 }
  return (
    <div
      className={`card${hover ? ' card-hover' : ''} ${className}`}
      style={{
        padding: padMap[padding],
        ...(glow ? { boxShadow: '0 0 24px rgba(0,200,232,0.3)', borderColor: 'rgba(0,200,232,0.35)' } : {}),
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  )
}

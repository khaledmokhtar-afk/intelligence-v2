'use client'
import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'secondary' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size, loading, children, className = '', disabled, ...props }, ref) => {
    const base = {
      primary:   'btn-primary',
      ghost:     'btn-ghost',
      secondary: 'btn-secondary',
      danger:    'btn-danger',
    }[variant]

    const sizePatch = size === 'sm' ? 'style' : size === 'lg' ? 'large' : ''

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`${base} ${className}`}
        style={
          size === 'sm' ? { padding: '8px 16px', fontSize: 14 } :
          size === 'lg' ? { padding: '16px 32px', fontSize: 18 } :
          undefined
        }
        {...props}
      >
        {loading && (
          <span style={{
            width: 16, height: 16, border: '2px solid currentColor',
            borderTopColor: 'transparent', borderRadius: '50%',
            display: 'inline-block', animation: 'spin 1s linear infinite',
          }} />
        )}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'

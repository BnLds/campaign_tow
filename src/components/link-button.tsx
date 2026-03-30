import { cn } from '#/lib/utils'

interface LinkButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
  variant?: 'default' | 'danger'
}

const variantClasses = {
  default: 'text-cw-text-secondary hover:text-cw-text-primary',
  danger: 'text-cw-malus hover:text-cw-malus/70',
} as const

export function LinkButton({ className, children, variant = 'default', ...props }: LinkButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        'cursor-pointer text-xs underline transition-colors',
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

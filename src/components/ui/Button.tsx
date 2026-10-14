import { forwardRef, type AnchorHTMLAttributes, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { Spinner } from './Spinner'
import { buttonClasses, type ButtonStyleOptions } from './styles'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, Omit<ButtonStyleOptions, 'className'> {
  loading?: boolean
  /** Icon rendered before the label (replaced by a spinner while loading). */
  icon?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, iconOnly, block, className, loading = false, icon, disabled, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses({ variant, size, iconOnly, block, className })}
      {...rest}
    >
      {loading ? <Spinner /> : icon}
      {children}
    </button>
  )
})

export interface ButtonLinkProps extends LinkProps, Omit<ButtonStyleOptions, 'className'> {
  icon?: ReactNode
}

export function ButtonLink({ variant, size, iconOnly, block, className, icon, children, ...rest }: ButtonLinkProps) {
  return (
    <Link className={buttonClasses({ variant, size, iconOnly, block, className })} {...rest}>
      {icon}
      {children}
    </Link>
  )
}

export interface ButtonAnchorProps extends AnchorHTMLAttributes<HTMLAnchorElement>, Omit<ButtonStyleOptions, 'className'> {
  icon?: ReactNode
}

/** Plain `<a>` styled as a button — used for downloads / external links. */
export function ButtonAnchor({ variant, size, iconOnly, block, className, icon, children, ...rest }: ButtonAnchorProps) {
  return (
    <a className={buttonClasses({ variant, size, iconOnly, block, className })} {...rest}>
      {icon}
      {children}
    </a>
  )
}

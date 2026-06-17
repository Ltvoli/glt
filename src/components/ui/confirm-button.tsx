'use client'

import React from 'react'

interface ConfirmButtonProps {
  confirmMessage: string
  className?: string
  style?: React.CSSProperties
  type?: 'button' | 'submit'
  children: React.ReactNode
  title?: string
}

export default function ConfirmButton({
  confirmMessage,
  className,
  style,
  type = 'submit',
  children,
  title
}: ConfirmButtonProps) {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!window.confirm(confirmMessage)) {
      e.preventDefault()
    }
  }

  return (
    <button
      type={type}
      className={className}
      style={style}
      onClick={handleClick}
      title={title}
    >
      {children}
    </button>
  )
}

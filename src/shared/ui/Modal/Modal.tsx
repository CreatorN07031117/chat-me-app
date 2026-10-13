import {
  useEffect,
  useId,
  useRef,
  type MouseEvent,
  type PropsWithChildren,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import styles from './Modal.module.css'

export type ModalProps = PropsWithChildren<{
  isOpen: boolean
  onClose: () => void
  title?: string
  headerAction?: ReactNode
  ariaLabel?: string
  closeOnOverlayClick?: boolean
  className?: string
}>

export function Modal({
  isOpen,
  onClose,
  title,
  headerAction,
  ariaLabel = 'Диалоговое окно',
  closeOnOverlayClick = true,
  className,
  children,
}: ModalProps) {
  const modalRef = useRef<HTMLElement>(null)
  const titleId = useId()

  useEffect(() => {
    if (!isOpen) return

    const previousActiveElement = document.activeElement
    const previousBodyOverflow = document.body.style.overflow

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleKeyDown)
    modalRef.current?.focus()

    return () => {
      document.body.style.overflow = previousBodyOverflow
      document.removeEventListener('keydown', handleKeyDown)

      if (previousActiveElement instanceof HTMLElement) {
        previousActiveElement.focus({ preventScroll: true })
      }
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleOverlayClick = (event: MouseEvent<HTMLDivElement>) => {
    if (closeOnOverlayClick && event.target === event.currentTarget) {
      onClose()
    }
  }

  const modalClassName = [styles.modal, className].filter(Boolean).join(' ')

  return createPortal(
    <div className={styles.overlay} onMouseDown={handleOverlayClick}>
      <section
        ref={modalRef}
        className={modalClassName}
        role="dialog"
        aria-modal="true"
        aria-label={title ? undefined : ariaLabel}
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
      >
        {(headerAction || title) && (
          <div className={styles.header}>
            {headerAction && <div className={styles.headerAction}>{headerAction}</div>}
            {title && (
              <h2 className={styles.title} id={titleId}>
                {title}
              </h2>
            )}
          </div>
        )}
        <div className={styles.content}>{children}</div>
      </section>
    </div>,
    document.body,
  )
}

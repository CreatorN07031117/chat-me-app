import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import styles from './MessageComposer.module.css'

const emojis = ['😀', '😂', '😌', '👍', '🎉', '❤️', '🔥', '🤔']

type MessageComposerProps = {
  onSend: (message: string) => Promise<boolean>
  error?: string
}

export function MessageComposer({ onSend, error }: MessageComposerProps) {
  const [value, setValue] = useState('')
  const [isEmojiPickerOpen, setEmojiPickerOpen] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const resizeTextarea = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    textarea.style.height = 'auto'
    const computedStyle = window.getComputedStyle(textarea)
    const lineHeight = Number.parseFloat(computedStyle.lineHeight)
    const verticalPadding =
      Number.parseFloat(computedStyle.paddingTop) + Number.parseFloat(computedStyle.paddingBottom)
    const maxHeight = lineHeight * 12 + verticalPadding

    textarea.style.height = `${Math.min(Math.max(textarea.scrollHeight, 44), maxHeight)}px`
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden'
  }, [])

  useEffect(() => {
    resizeTextarea()
  }, [resizeTextarea, value])

  const handleSend = async () => {
    const message = value.trim()
    if (!message || isSending) return

    setIsSending(true)

    try {
      const wasSent = await onSend(message)

      if (wasSent) {
        setValue('')
        setEmojiPickerOpen(false)
      }
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return

    event.preventDefault()
    void handleSend()
  }

  const handleEmojiSelect = (emoji: string) => {
    setValue((currentValue) => `${currentValue}${emoji}`)
    textareaRef.current?.focus()
  }

  return (
    <footer className={styles.composer}>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <div className={styles.editor}>
        <textarea
          ref={textareaRef}
          className={styles.textarea}
          value={value}
          placeholder="Сообщение"
          rows={1}
          aria-label="Текст сообщения"
          disabled={isSending}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
        />

        <button
          className={styles.emojiButton}
          type="button"
          aria-label="Выбрать смайлик"
          aria-expanded={isEmojiPickerOpen}
          disabled={isSending}
          onClick={() => setEmojiPickerOpen((isOpen) => !isOpen)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="9.5" />
            <circle cx="9" cy="10" r="0.9" />
            <circle cx="15" cy="10" r="0.9" />
            <path d="M8.5 14c.9 1.2 2.1 1.8 3.5 1.8s2.6-.6 3.5-1.8" />
          </svg>
        </button>

        {isEmojiPickerOpen && (
          <div className={styles.emojiPicker} role="dialog" aria-label="Смайлики">
            {emojis.map((emoji) => (
              <button
                key={emoji}
                className={styles.emoji}
                type="button"
                onClick={() => handleEmojiSelect(emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        <button
          className={styles.sendButton}
          type="button"
          aria-label="Отправить сообщение"
          disabled={!value.trim() || isSending}
          onClick={handleSend}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m3.5 4.5 17 7.5-17 7.5 2.5-6.5 8-1-8-1-2.5-6.5Z" />
          </svg>
        </button>
      </div>
    </footer>
  )
}

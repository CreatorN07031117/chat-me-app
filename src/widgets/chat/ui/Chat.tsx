import { useEffect, useRef, useState } from 'react'

import avatarOne from '../../../assets/ava-1.png'
import avatarTwo from '../../../assets/ava-2.png'
import avatarThree from '../../../assets/ava-3.png'
import avatarFour from '../../../assets/ava-4.png'
import avatarFive from '../../../assets/ava-5.png'
import {
  deleteNotification,
  getIncomingTextMessage,
  GreenApiError,
  isIncomingMessageForPhone,
  receiveNotification,
  sendTextMessage,
  type GreenApiCredentials,
} from '../../../shared/api/greenApi'

import { MessageComposer } from './MessageComposer'
import styles from './Chat.module.css'

const avatars = [avatarOne, avatarTwo, avatarThree, avatarFour, avatarFive]
const receiveTimeoutSeconds = 5
const receiveRetryDelay = 5000

type ChatProps = {
  phone: string
  credentials: GreenApiCredentials
  userName?: string
}

type ChatMessage = {
  id: string
  text: string
  isOwn: boolean
}

function MessageStatusIcon() {
  return (
    <span className={`${styles.status} ${styles.statusSent}`} aria-label="Сообщение отправлено">
      <svg viewBox="0 0 20 14" aria-hidden="true">
        <path d="m2 7 3.5 3.5L13 3" />
      </svg>
    </span>
  )
}

export function Chat({ phone, credentials, userName }: ChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [sendError, setSendError] = useState('')
  const [receiveError, setReceiveError] = useState('')
  const messageListRef = useRef<HTMLDivElement>(null)
  const [avatar] = useState(
    () => avatars[Math.floor(Math.random() * avatars.length)] ?? avatars[0],
  )
  const displayName = userName || phone

  useEffect(() => {
    const controller = new AbortController()
    let isActive = true

    const pollNotifications = async () => {
      while (isActive) {
        try {
          const notification = await receiveNotification(
            credentials,
            receiveTimeoutSeconds,
            controller.signal,
          )

          if (!isActive) return

          if (!notification) {
            setReceiveError('')
            continue
          }

          const incomingMessage = getIncomingTextMessage(notification)

          if (incomingMessage && isIncomingMessageForPhone(incomingMessage, phone)) {
            setMessages((currentMessages) => {
              if (currentMessages.some((message) => message.id === incomingMessage.idMessage)) {
                return currentMessages
              }

              return [
                ...currentMessages,
                { id: incomingMessage.idMessage, text: incomingMessage.text, isOwn: false },
              ]
            })
          }

          await deleteNotification(credentials, notification.receiptId, controller.signal)

          if (!isActive) return

          setReceiveError('')
        } catch (pollingError) {
          if (!isActive || controller.signal.aborted) return

          setReceiveError(
            pollingError instanceof GreenApiError
              ? pollingError.message
              : 'Не удалось получить новые сообщения. Повторяем подключение...',
          )

          await new Promise((resolve) => window.setTimeout(resolve, receiveRetryDelay))
        }
      }
    }

    void pollNotifications()

    return () => {
      isActive = false
      controller.abort()
    }
  }, [credentials, phone])

  useEffect(() => {
    const messageList = messageListRef.current
    if (!messageList) return

    messageList.scrollTop = messageList.scrollHeight
  }, [messages])

  const handleSend = async (text: string) => {
    setSendError('')

    try {
      const { idMessage } = await sendTextMessage(credentials, phone, text)

      setMessages((currentMessages) => [
        ...currentMessages,
        { id: idMessage, text, isOwn: true },
      ])

      return true
    } catch (sendError) {
      setSendError(
        sendError instanceof GreenApiError
          ? sendError.message
          : 'Не удалось отправить сообщение. Попробуйте ещё раз.',
      )

      return false
    }
  }

  return (
    <section className={styles.chat} aria-label="Чат">
      <header className={styles.header}>
        <img className={styles.avatar} src={avatar} alt="" />
        <span className={styles.name}>{displayName}</span>
      </header>

      {messages.length === 0 ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyMessage}>
            Сообщений нет... Отправьте сообщение, чтобы начать чат
          </p>
        </div>
      ) : (
        <div ref={messageListRef} className={styles.messageList} aria-live="polite">
          {messages.map((message) => (
            <p
              className={`${styles.message} ${message.isOwn ? styles.messageOwn : styles.messageIncoming}`}
              key={message.id}
            >
              <span className={styles.messageText}>{message.text}</span>
              {message.isOwn && <MessageStatusIcon />}
            </p>
          ))}
        </div>
      )}

      <MessageComposer onSend={handleSend} error={sendError || receiveError} />
    </section>
  )
}

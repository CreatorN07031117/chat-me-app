import { useContext, useState, type FormEvent } from 'react'
import { Modal } from '../../../shared/ui'
import { ThemeContext } from '../../../shared/config/theme'
import {
  getInstanceState,
  GreenApiError,
  type GreenApiCredentials,
  type GreenApiInstanceState,
} from '../../../shared/api/greenApi'
import styles from './AuthorizationScreen.module.css'

type AuthorizationScreenProps = {
  isOpen: boolean
  onClose: () => void
  onChatStart: (phone: string, credentials: GreenApiCredentials) => void
}

type AuthorizationStep = 'credentials' | 'phone'

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, '')
  const nationalDigits = digits.startsWith('7') || digits.startsWith('8') ? digits.slice(1) : digits
  const phoneDigits = nationalDigits.slice(0, 10)

  if (!phoneDigits) return ''

  const groups = [
    phoneDigits.slice(0, 3),
    phoneDigits.slice(3, 6),
    phoneDigits.slice(6, 8),
    phoneDigits.slice(8, 10),
  ].filter(Boolean)

  return `+7 ${groups.join(' ')}`
}

const instanceStateMessages: Record<GreenApiInstanceState, string> = {
  notAuthorized: 'Инстанс не авторизован в Telegram.',
  authorized: '',
  blocked: 'Инстанс заблокирован GREEN-API.',
  suspended: 'На инстансе действуют временные ограничения.',
  starting: 'Инстанс ещё запускается. Повторите попытку через несколько минут.',
  pendingPassword: 'Для инстанса требуется пароль двухфакторной аутентификации.',
}

export function AuthorizationScreen({ isOpen, onClose, onChatStart }: AuthorizationScreenProps) {
  const [idInstance, setIdInstance] = useState('')
  const [apiTokenInstance, setApiTokenInstance] = useState('')
  const [phone, setPhone] = useState('')
  const [step, setStep] = useState<AuthorizationStep>('credentials')
  const [credentials, setCredentials] = useState<GreenApiCredentials | null>(null)
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [error, setError] = useState('')
  const { theme, toggleTheme } = useContext(ThemeContext)

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const nextCredentials = {
      idInstance: idInstance.trim(),
      apiTokenInstance: apiTokenInstance.trim(),
    }

    if (!nextCredentials.idInstance || !nextCredentials.apiTokenInstance) return

    setError('')
    setIsLoggingIn(true)

    try {
      const { stateInstance } = await getInstanceState(nextCredentials)

      if (stateInstance !== 'authorized') {
        setError(instanceStateMessages[stateInstance])
        return
      }

      setCredentials(nextCredentials)
      setStep('phone')
    } catch (loginError) {
      setError(
        loginError instanceof GreenApiError
          ? loginError.message
          : 'Не удалось выполнить авторизацию. Попробуйте ещё раз.',
      )
    } finally {
      setIsLoggingIn(false)
    }
  }

  const handlePhoneChange = (value: string) => {
    setPhone(formatPhone(value))
  }

  const isPhoneComplete = phone.replace(/\D/g, '').length === 11

  const handleStartChat = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (isPhoneComplete && credentials) {
      onChatStart(phone, credentials)
    }
  }

  const clearError = () => {
    if (error) setError('')
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        step === 'credentials'
          ? 'Войдите в свой аккаунт Green API'
          : 'Введите номер телефона пользователя, с которым хотите начать чат'
      }
      headerAction={
        <div className={styles.themeSwitcher} data-theme={theme}>
          <button
            className={styles.themeToggle}
            type="button"
            aria-label={theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'}
            title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
            onClick={toggleTheme}
          >
            <span className={`${styles.themeIcon} ${styles.themeIconDark}`} aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <use href="/icons.svg#theme-color-dark" />
              </svg>
            </span>
            <span className={`${styles.themeIcon} ${styles.themeIconLight}`} aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <use href="/icons.svg#theme-color-light" />
              </svg>
            </span>
          </button>
        </div>
      }
    >
      <form
        className={styles.form}
        onSubmit={step === 'credentials' ? handleLogin : handleStartChat}
        aria-busy={isLoggingIn}
      >
        {step === 'credentials' ? (
          <>
            <div className={styles.fields}>
              <div className={styles.field}>
                <input
                  className={styles.input}
                  id="idInstance"
                  name="idInstance"
                  type="text"
                  value={idInstance}
                  onChange={(event) => {
                    setIdInstance(event.target.value)
                    clearError()
                  }}
                  placeholder=" "
                  autoComplete="off"
                  required
                />
                <label className={styles.label} htmlFor="idInstance">
                  idInstance
                </label>
              </div>

              <div className={styles.field}>
                <input
                  className={styles.input}
                  id="apiTokenInstance"
                  name="apiTokenInstance"
                  type="password"
                  value={apiTokenInstance}
                  onChange={(event) => {
                    setApiTokenInstance(event.target.value)
                    clearError()
                  }}
                  placeholder=" "
                  autoComplete="current-password"
                  required
                />
                <label className={styles.label} htmlFor="apiTokenInstance">
                  apiTokenInstance
                </label>
              </div>
            </div>

            {error && (
              <p className={styles.error} role="alert">
                {error}
              </p>
            )}

            <button className={styles.submit} type="submit" disabled={isLoggingIn}>
              {isLoggingIn ? 'Проверяем...' : 'Войти'}
            </button>
          </>
        ) : (
          <>
            <div className={styles.fields}>
              <div className={styles.field}>
                <input
                  className={styles.input}
                  id="phone"
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  value={phone}
                  onFocus={() => !phone && setPhone('+7')}
                  onChange={(event) => handlePhoneChange(event.target.value)}
                  placeholder=" "
                  autoComplete="tel"
                  required
                />
                <label className={styles.label} htmlFor="phone">
                  Номер телефона
                </label>
              </div>
            </div>

            <button className={styles.submit} type="submit" disabled={!isPhoneComplete || !credentials}>
              Начать чат
            </button>
          </>
        )}
      </form>
    </Modal>
  )
}

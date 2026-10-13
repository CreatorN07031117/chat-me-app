import {
  lazy,
  Suspense,
  useContext,
  useState,
  type PropsWithChildren,
} from 'react'
import { ThemeProvider } from './providers/ThemeProvider'
import { AuthorizationScreen } from '../features/auth'
import { ThemeContext } from '../shared/config/theme'
import type { GreenApiCredentials } from '../shared/api/greenApi'
import { Chat } from '../widgets/chat'
import './styles/App.css'

function Loading() {
  return <div className="loading">Загрузка</div>
}

function Suspence({ children }: PropsWithChildren) {
  return <Suspense fallback={<Loading />}>{children}</Suspense>
}

function ChatBackground({ children }: PropsWithChildren) {
  const { theme } = useContext(ThemeContext)

  return (
    <main className="chat-background" data-theme={theme} aria-label="Фон чата">
      <div className="chat-background__pattern" aria-hidden="true" />
      <div className="chat-background__content">{children}</div>
    </main>
  )
}

const LoadedChat = lazy(
  () =>
    new Promise<{ default: typeof ChatBackground }>((resolve) => {
      window.setTimeout(() => resolve({ default: ChatBackground }), 250)
    }),
)

function App() {
  const [isAuthorizationOpen, setAuthorizationOpen] = useState(true)
  const [chatPhone, setChatPhone] = useState<string | null>(null)
  const [apiCredentials, setApiCredentials] = useState<GreenApiCredentials | null>(null)

  const handleChatStart = (phone: string, credentials: GreenApiCredentials) => {
    setChatPhone(phone)
    setApiCredentials(credentials)
    setAuthorizationOpen(false)
  }

  return (
    <ThemeProvider>
      <Suspence>
        <LoadedChat>
          {chatPhone && apiCredentials && (
            <Chat phone={chatPhone} credentials={apiCredentials} />
          )}
        </LoadedChat>
      </Suspence>
      <AuthorizationScreen
        isOpen={isAuthorizationOpen}
        onClose={() => setAuthorizationOpen(false)}
        onChatStart={handleChatStart}
      />
    </ThemeProvider>
  )
}

export default App

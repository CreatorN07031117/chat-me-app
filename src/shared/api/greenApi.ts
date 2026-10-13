export const GREEN_API_URL = 'https://7201.api.green-api.com'

export type GreenApiCredentials = {
  idInstance: string
  apiTokenInstance: string
}

export type GreenApiInstanceState =
  | 'notAuthorized'
  | 'authorized'
  | 'sleepMode'
  | 'starting'
  | 'yellowCard'
  | 'suspended'

type GreenApiStateResponse = {
  stateInstance?: GreenApiInstanceState
}

export class GreenApiError extends Error {
  readonly status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'GreenApiError'
    this.status = status
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function getErrorMessage(payload: unknown) {
  if (!isRecord(payload)) return null

  if (typeof payload.message === 'string') return payload.message
  if (typeof payload.error === 'string') return payload.error

  return null
}

function isInstanceState(value: string): value is GreenApiInstanceState {
  return [
    'notAuthorized',
    'authorized',
    'sleepMode',
    'starting',
    'yellowCard',
    'suspended',
  ].includes(value)
}

function buildEndpoint(credentials: GreenApiCredentials, method: string) {
  const idInstance = encodeURIComponent(credentials.idInstance.trim())
  const apiTokenInstance = encodeURIComponent(credentials.apiTokenInstance.trim())

  return `${GREEN_API_URL}/waInstance${idInstance}/${method}/${apiTokenInstance}`
}

export async function getInstanceState(
  credentials: GreenApiCredentials,
): Promise<GreenApiStateResponse & { stateInstance: GreenApiInstanceState }> {
  let response: Response

  try {
    response = await fetch(buildEndpoint(credentials, 'getStateInstance'), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    })
  } catch {
    throw new GreenApiError('Не удалось подключиться к GREEN-API. Проверьте соединение.')
  }

  const rawBody = await response.text()
  let payload: unknown = null

  if (rawBody) {
    try {
      payload = JSON.parse(rawBody)
    } catch {
      payload = null
    }
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new GreenApiError('Неверные idInstance или apiTokenInstance.', response.status)
    }

    throw new GreenApiError(
      getErrorMessage(payload) ?? `GREEN-API вернул ошибку (${response.status}).`,
      response.status,
    )
  }

  if (!isRecord(payload) || typeof payload.stateInstance !== 'string') {
    throw new GreenApiError('GREEN-API вернул некорректный ответ.')
  }

  if (!isInstanceState(payload.stateInstance)) {
    throw new GreenApiError('GREEN-API вернул неизвестное состояние инстанса.')
  }

  const stateInstance = payload.stateInstance

  return { stateInstance }
}

export function normalizePhoneNumber(phone: string | number) {
  const digits = String(phone).replace(/\D/g, '')

  return digits.startsWith('8') ? `7${digits.slice(1)}` : digits
}

export function phoneToChatId(phone: string) {
  const normalizedDigits = normalizePhoneNumber(phone)

  return `${normalizedDigits}@c.us`
}

export async function sendTextMessage(
  credentials: GreenApiCredentials,
  phone: string,
  message: string,
) {
  let response: Response

  try {
    response = await fetch(buildEndpoint(credentials, 'sendMessage'), {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chatId: phoneToChatId(phone),
        message,
      }),
    })
  } catch {
    throw new GreenApiError('Не удалось отправить сообщение. Проверьте соединение.')
  }

  const rawBody = await response.text()
  let payload: unknown = null

  if (rawBody) {
    try {
      payload = JSON.parse(rawBody)
    } catch {
      payload = null
    }
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new GreenApiError('Сессия GREEN-API недействительна. Выполните вход заново.', response.status)
    }

    throw new GreenApiError(
      getErrorMessage(payload) ?? `GREEN-API вернул ошибку (${response.status}).`,
      response.status,
    )
  }

  if (!isRecord(payload) || typeof payload.idMessage !== 'string') {
    throw new GreenApiError('GREEN-API вернул некорректный ответ при отправке сообщения.')
  }

  return { idMessage: payload.idMessage }
}

export type GreenApiNotification = {
  receiptId: number
  body: {
    typeWebhook?: string
    idMessage?: string
    senderData?: {
      chatId?: string
      senderPhoneNumber?: number
    }
    messageData?: {
      typeMessage?: string
      textMessageData?: {
        textMessage?: string
      }
    }
  }
}

export type GreenApiIncomingTextMessage = {
  idMessage: string
  chatId: string
  senderPhoneNumber?: number
  text: string
}

export async function receiveNotification(
  credentials: GreenApiCredentials,
  receiveTimeout = 5,
  signal?: AbortSignal,
): Promise<GreenApiNotification | null> {
  let response: Response

  try {
    response = await fetch(
      `${buildEndpoint(credentials, 'receiveNotification')}?receiveTimeout=${receiveTimeout}`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
        signal,
      },
    )
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error
    }

    throw new GreenApiError('Не удалось получить сообщения. Проверьте соединение.')
  }

  const rawBody = await response.text()
  let payload: unknown = null

  if (rawBody.trim()) {
    try {
      payload = JSON.parse(rawBody)
    } catch {
      payload = null
    }
  }

  if (!rawBody.trim()) return null

  if (!response.ok) {
    throw new GreenApiError(
      getErrorMessage(payload) ?? `GREEN-API вернул ошибку (${response.status}).`,
      response.status,
    )
  }

  if (!isRecord(payload) || typeof payload.receiptId !== 'number' || !isRecord(payload.body)) {
    throw new GreenApiError('GREEN-API вернул некорректное уведомление.')
  }

  return {
    receiptId: payload.receiptId,
    body: payload.body as GreenApiNotification['body'],
  }
}

export async function deleteNotification(
  credentials: GreenApiCredentials,
  receiptId: number,
  signal?: AbortSignal,
) {
  let response: Response

  try {
    response = await fetch(`${buildEndpoint(credentials, 'deleteNotification')}/${receiptId}`, {
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
      },
      signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error
    }

    throw new GreenApiError('Не удалось подтвердить получение сообщения. Проверьте соединение.')
  }

  const rawBody = await response.text()
  let payload: unknown = null

  if (rawBody.trim()) {
    try {
      payload = JSON.parse(rawBody)
    } catch {
      payload = null
    }
  }

  if (!response.ok) {
    throw new GreenApiError(
      getErrorMessage(payload) ?? `GREEN-API вернул ошибку (${response.status}).`,
      response.status,
    )
  }

  if (!isRecord(payload) || payload.result !== true) {
    throw new GreenApiError('GREEN-API не подтвердил обработку уведомления.')
  }
}

export function getIncomingTextMessage(
  notification: GreenApiNotification,
): GreenApiIncomingTextMessage | null {
  const { body } = notification
  const textMessageData = body.messageData?.textMessageData

  if (
    body.typeWebhook !== 'incomingMessageReceived' ||
    body.messageData?.typeMessage !== 'textMessage' ||
    typeof body.idMessage !== 'string' ||
    typeof body.senderData?.chatId !== 'string' ||
    typeof textMessageData?.textMessage !== 'string'
  ) {
    return null
  }

  return {
    idMessage: body.idMessage,
    chatId: body.senderData.chatId,
    senderPhoneNumber: body.senderData.senderPhoneNumber,
    text: textMessageData.textMessage,
  }
}

export function isIncomingMessageForPhone(
  message: GreenApiIncomingTextMessage,
  phone: string,
) {
  const targetPhone = normalizePhoneNumber(phone)
  const senderPhone = message.senderPhoneNumber
    ? normalizePhoneNumber(message.senderPhoneNumber)
    : ''

  return senderPhone === targetPhone || message.chatId === phoneToChatId(phone)
}

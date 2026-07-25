import api from '@/axios'

const LOGIN_CRYPTO_ALGORITHM = 'RSA-OAEP-256'
const MAX_PASSWORD_BYTES = 128

function decodeBase64(value) {
  const binary = window.atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes.buffer
}

function encodeBase64(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return window.btoa(binary)
}

function getChallenge(payload) {
  const challenge = payload?.data
  if (
    payload?.success !== true
    || !challenge?.challengeId
    || !challenge?.publicKey
    || challenge?.algorithm !== LOGIN_CRYPTO_ALGORITHM
  ) {
    throw new Error(payload?.message || '无法获取安全登录凭据，请稍后重试')
  }
  return challenge
}

async function encryptWithWebCrypto(publicKeyBase64, passwordBytes) {
  const publicKey = await window.crypto.subtle.importKey(
    'spki',
    decodeBase64(publicKeyBase64),
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt'],
  )
  const encryptedPassword = await window.crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    publicKey,
    passwordBytes,
  )
  return encodeBase64(encryptedPassword)
}

/**
 * 公网 HTTP 不属于浏览器安全上下文，window.crypto.subtle 会被禁用。
 * 使用纯 JavaScript 实现保持与后端一致的 RSA-OAEP(SHA-256/MGF1-SHA-256) 协议。
 */
async function encryptWithForge(publicKeyBase64, password) {
  const forgeModule = await import('node-forge')
  const forge = forgeModule.default || forgeModule
  const publicKeyDer = forge.util.decode64(publicKeyBase64)
  const publicKeyAsn1 = forge.asn1.fromDer(publicKeyDer)
  const publicKey = forge.pki.publicKeyFromAsn1(publicKeyAsn1)
  const encryptedPassword = publicKey.encrypt(
    forge.util.encodeUtf8(password),
    'RSA-OAEP',
    {
      md: forge.md.sha256.create(),
      mgf1: { md: forge.md.sha256.create() },
    },
  )
  return forge.util.encode64(encryptedPassword)
}

/**
 * 获取一次性挑战并在浏览器内使用 RSA-OAEP(SHA-256) 加密密码。
 * HTTPS 优先使用浏览器 Web Crypto；公网 HTTP 使用纯 JavaScript 兼容实现。
 * 返回对象中不包含明文密码。
 */
export async function encryptPassword(challengeUrl, password) {
  const passwordBytes = new TextEncoder().encode(password)
  if (passwordBytes.length === 0 || passwordBytes.length > MAX_PASSWORD_BYTES) {
    throw new Error(`密码长度必须为 1-${MAX_PASSWORD_BYTES} 个 UTF-8 字节`)
  }

  try {
    const { data } = await api.post(challengeUrl)
    const challenge = getChallenge(data)
    const encryptedPassword = window.crypto?.subtle
      ? await encryptWithWebCrypto(challenge.publicKey, passwordBytes)
      : await encryptWithForge(challenge.publicKey, password)
    return {
      challengeId: challenge.challengeId,
      encryptedPassword,
    }
  } finally {
    passwordBytes.fill(0)
  }
}

export async function createEncryptedLoginPayload(challengeUrl, username, password) {
  return {
    username,
    ...(await encryptPassword(challengeUrl, password)),
  }
}

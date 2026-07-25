import api from '@/axios'
import { createEncryptedLoginPayload } from '@/utils/loginCrypto'

/** 使用一次性挑战加密密码后登录。 */
export async function login(username, password) {
  const payload = await createEncryptedLoginPayload(
    '/admin/login/challenge',
    username,
    password,
  )
  return api.post('/admin/login', payload)
}

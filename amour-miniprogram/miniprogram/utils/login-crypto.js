// 使用小程序本地模块，不依赖微信开发者工具是否执行「构建 npm」。
const forge = require('./node-forge')
const { post } = require('./request')

const LOGIN_CRYPTO_ALGORITHM = 'RSA-OAEP-256'
const MAX_PASSWORD_BYTES = 128
const OAEP_SEED_BYTES = 32

function getSecureRandomBytes(length) {
  return new Promise((resolve, reject) => {
    wx.getRandomValues({
      length,
      success(result) {
        const bytes = new Uint8Array(result.randomValues)
        let binary = ''
        for (let index = 0; index < bytes.length; index += 1) {
          binary += String.fromCharCode(bytes[index])
        }
        resolve(binary)
      },
      fail(error) {
        reject(new Error(error.errMsg || '无法生成安全随机数'))
      },
    })
  })
}

async function encryptPassword(password) {
  const passwordBytes = forge.util.encodeUtf8(String(password || ''))
  if (!passwordBytes.length || passwordBytes.length > MAX_PASSWORD_BYTES) {
    throw new Error(`密码长度必须为 1-${MAX_PASSWORD_BYTES} 个 UTF-8 字节`)
  }

  const [challenge, seed] = await Promise.all([
    post('/login/challenge'),
    getSecureRandomBytes(OAEP_SEED_BYTES),
  ])
  if (
    !challenge
    || !challenge.challengeId
    || !challenge.publicKey
    || challenge.algorithm !== LOGIN_CRYPTO_ALGORITHM
  ) {
    throw new Error('无法获取安全验证信息')
  }

  const publicKeyDer = forge.util.decode64(challenge.publicKey)
  const publicKeyAsn1 = forge.asn1.fromDer(publicKeyDer)
  const publicKey = forge.pki.publicKeyFromAsn1(publicKeyAsn1)
  const encryptedPassword = publicKey.encrypt(passwordBytes, 'RSA-OAEP', {
    seed,
    md: forge.md.sha256.create(),
    mgf1: { md: forge.md.sha256.create() },
  })
  return {
    challengeId: challenge.challengeId,
    encryptedPassword: forge.util.encode64(encryptedPassword),
  }
}

module.exports = { encryptPassword }

/**
 * 接口地址配置 —— 本地联调只需要改这一个文件。
 *
 * 背景：
 * 微信小程序官方限制「不允许与本机 IP（127.0.0.1 / localhost）通信」，
 * 且开发者工具在「设置 → 代理 = 系统代理」时，代理软件（Clash / Surge 等）
 * 会把 127.0.0.1 的请求当成远端域名再转发一次，形成回环并最终 10s 超时。
 * 因此 develop 环境优先使用本机的**局域网 IP**。
 *
 * 换网络 / 换电脑后 IP 会变，改 DEV_API_BASE_URLS[0] 即可；
 * 也可以在小程序里执行 wx.setStorageSync('apiBaseUrl', 'http://x.x.x.x:8080') 临时覆盖。
 */

/** 体验版 / 正式版接口（必须 HTTPS 且已配置 request 合法域名）。 */
const PROD_API_BASE_URL = 'https://www.chengliuxiang.top/api'

/**
 * 开发版候选地址，按顺序尝试：
 * 1. 局域网 IP —— 真机预览也能用，且不受「本机 IP」限制与代理回环影响；
 * 2. 127.0.0.1 —— 仅当工具内关闭代理、且系统允许回环访问时可用。
 *
 * 本机当前局域网 IP：192.168.7.91（可用 `ipconfig getifaddr en0` 查看）。
 */
const DEV_API_BASE_URLS = [
  'http://192.168.7.91:8080',
  'http://127.0.0.1:8080',
]

/** 开发版允许通过缓存临时覆盖接口地址，避免改代码。 */
const API_BASE_URL_STORAGE_KEY = 'apiBaseUrl'

/** 开发版超时要短一些：候选地址不可达时尽快切下一个，而不是干等 10s。 */
const DEV_REQUEST_TIMEOUT = 5000
const PROD_REQUEST_TIMEOUT = 10000

/** 去掉尾部斜杠，保证拼接出 http://host:port/path。 */
function normalizeBaseUrl(value) {
  if (typeof value !== 'string') return ''
  const trimmed = value.trim()
  if (!trimmed) return ''
  return trimmed.replace(/\/+$/, '')
}

/**
 * 计算本次请求可用的接口地址列表（纯函数，便于单测）。
 *
 * @param {{ envVersion?: string, override?: string }} options
 * @returns {string[]} 至少一项；环境未知时回退正式环境
 */
function resolveBaseUrlCandidates(options) {
  const source = options || {}
  const envVersion = source.envVersion === 'develop' || source.envVersion === 'trial'
    ? source.envVersion
    : 'release'

  if (envVersion !== 'develop') {
    return [PROD_API_BASE_URL]
  }

  const override = normalizeBaseUrl(source.override)
  if (override) {
    // 显式覆盖时只认用户指定的地址，避免悄悄切到别的后端。
    return [override]
  }

  const candidates = []
  DEV_API_BASE_URLS.forEach((item) => {
    const normalized = normalizeBaseUrl(item)
    if (normalized && candidates.indexOf(normalized) === -1) candidates.push(normalized)
  })
  return candidates.length ? candidates : [PROD_API_BASE_URL]
}

/** 请求超时时间（毫秒）。 */
function resolveRequestTimeout(envVersion) {
  return envVersion === 'develop' ? DEV_REQUEST_TIMEOUT : PROD_REQUEST_TIMEOUT
}

module.exports = {
  PROD_API_BASE_URL,
  DEV_API_BASE_URLS,
  API_BASE_URL_STORAGE_KEY,
  normalizeBaseUrl,
  resolveBaseUrlCandidates,
  resolveRequestTimeout,
}

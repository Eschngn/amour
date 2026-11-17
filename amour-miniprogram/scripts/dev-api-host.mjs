/**
 * 把当前电脑的局域网 IP 写入小程序接口配置（本地开发用）。
 *
 * 为什么需要：微信小程序不允许请求本机 IP（127.0.0.1 / localhost），
 * 且开发者工具走系统代理时，回环地址容易被代理软件二次转发而超时。
 * 换 Wi-Fi 后局域网 IP 会变，跑一次这个脚本即可。
 *
 * 用法：npm run dev:host
 *      npm run dev:host -- --dry-run   # 只看结果不写文件
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { networkInterfaces } from 'node:os'
import { execFileSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const CONFIG_PATH = join(ROOT, 'miniprogram/utils/api-config.js')
const PORT = Number(process.env.AMOUR_API_PORT || 8080)
const dryRun = process.argv.includes('--dry-run')

/** 优先用默认路由对应的网卡地址，避免拿到 Docker / VPN 的虚拟网卡。 */
function detectLanIp() {
  const candidates = []

  // 1. macOS：查询默认路由使用的网卡
  try {
    const iface = execFileSync('route', ['-n', 'get', 'default'], { encoding: 'utf8' })
      .split('\n')
      .map(line => line.trim())
      .find(line => line.startsWith('interface:'))
      ?.replace('interface:', '')
      .trim()
    if (iface) {
      const address = networkInterfaces()[iface]?.find(item => item.family === 'IPv4' && !item.internal)?.address
      if (address) candidates.push(address)
    }
  } catch (error) {
    // 非 macOS 或没有默认路由时忽略
  }

  // 2. 兜底：遍历所有网卡，跳过回环与常见虚拟网段
  const ignored = /^(127\.|169\.254\.|0\.0\.0\.0$)/
  Object.values(networkInterfaces()).forEach((items) => {
    ;(items || []).forEach((item) => {
      if (item.family !== 'IPv4' || item.internal || ignored.test(item.address)) return
      if (item.address.startsWith('192.168.139.') || item.address.startsWith('192.168.215.')) return
      if (!candidates.includes(item.address)) candidates.push(item.address)
    })
  })

  return candidates
}

const ips = detectLanIp()
if (!ips.length) {
  console.error('没找到可用的局域网地址。请确认电脑已连上 Wi-Fi 或有线网络。')
  process.exit(1)
}

const preferred = ips[0]
const source = readFileSync(CONFIG_PATH, 'utf8')
const regex = /const DEV_API_BASE_URLS = \[\n([\s\S]*?)\n\]/
const match = source.match(regex)
if (!match) {
  console.error(`没在 ${CONFIG_PATH} 里找到 DEV_API_BASE_URLS，请手动修改。`)
  process.exit(1)
}

const nextBlock = `const DEV_API_BASE_URLS = [\n  'http://${preferred}:${PORT}',\n  'http://127.0.0.1:${PORT}',\n]`
const next = source.replace(regex, nextBlock)

console.log(`检测到局域网地址：${ips.join(', ')}`)
console.log(`接口地址将改为：  http://${preferred}:${PORT}`)

if (ips.length > 1) {
  console.log('其它候选（若上面不是你要的，请手动改成其中之一）：')
  ips.forEach(ip => console.log(`  - http://${ip}:${PORT}`))
}

if (dryRun) {
  console.log('\n--dry-run：未写入文件。')
} else if (next === source) {
  console.log('\n配置已是最新，无需修改。')
} else {
  writeFileSync(CONFIG_PATH, next)
  console.log(`\n已更新 ${CONFIG_PATH}`)
  console.log('请重新编译小程序，或在开发者工具里点「编译」。')
}

/**
 * 小程序静态校验（本地检查脚本，不参与打包）。
 *
 * 检查项：
 * 1. app.json 声明的页面都有 wxml / json / 脚本三件套，且没有未注册的页面目录；
 * 2. usingComponents 引用的组件路径真实存在，且组件 json 标记 component: true；
 * 3. WXML 标签闭合正确，wx:if / wx:elif / wx:else 同级链没有断裂；
 * 4. WXML 中声明的事件处理函数在对应脚本中存在；
 * 5. 同一页面没有重复声明导航栏，仓库只有一套底部导航实现。
 *
 * 用法：node scripts/check-miniprogram.mjs
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const APP_ROOT = join(ROOT, 'miniprogram')

const errors = []
const warnings = []

const fail = message => errors.push(message)

function readJson(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'))
  } catch (error) {
    fail(`${file}: JSON 解析失败 -> ${error.message}`)
    return null
  }
}

function resolveComponent(baseDir, path) {
  return path.startsWith('/')
    ? join(APP_ROOT, path.replace(/^\//, ''))
    : resolve(baseDir, path)
}

/** 小程序中允许自闭合的标签。 */
const VOID_TAGS = new Set([
  'image', 'input', 'icon', 'progress', 'switch', 'slider', 'textarea', 'camera',
  'live-player', 'live-pusher', 'map', 'canvas', 'video', 'import', 'include', 'wxs', 'slot',
])

/** 极简 WXML 扫描：返回带行号的标签序列。 */
function scanTags(file, source) {
  const tags = []
  let index = 0
  while (index < source.length) {
    const open = source.indexOf('<', index)
    if (open === -1) break
    if (source.startsWith('<!--', open)) {
      const close = source.indexOf('-->', open + 4)
      if (close === -1) {
        fail(`${file}: 注释未闭合`)
        break
      }
      index = close + 3
      continue
    }
    const close = source.indexOf('>', open)
    if (close === -1) {
      fail(`${file}: 标签未闭合`)
      break
    }
    let raw = source.slice(open + 1, close)
    const selfClosing = raw.trimEnd().endsWith('/')
    if (selfClosing) raw = raw.replace(/\/\s*$/, '')
    const closing = raw.startsWith('/')
    if (closing) raw = raw.slice(1)
    const name = raw.trim().split(/[\s/]/)[0]
    const line = source.slice(0, open).split('\n').length
    if (name) tags.push({ name, closing, selfClosing, raw, line, source: source.slice(open, close + 1) })
    index = close + 1
  }
  return tags
}

function checkWxml(file) {
  const source = readFileSync(file, 'utf8')
  const tags = scanTags(file, source)
  const stack = []
  // 同级 if/elif/else 链：栈顶记录父节点的“上一个同级是否属于条件链”
  const parents = [{ lastWasIfChain: false }]

  tags.forEach((tag) => {
    const isVoid = VOID_TAGS.has(tag.name)
    if (tag.closing) {
      if (isVoid) return
      const top = stack.pop()
      if (!top) {
        fail(`${file}:${tag.line} 多余的闭合标签 </${tag.name}>`)
        return
      }
      if (top.name !== tag.name) {
        fail(`${file}:${tag.line} 闭合标签不匹配：期望 </${top.name}>（第 ${top.line} 行），实际 </${tag.name}>`)
      }
      // 关闭节点后弹回父层级
      if (parents.length > 1) parents.pop()
      return
    }

    const parent = parents[parents.length - 1]
    const hasIf = /\swx:if=/.test(tag.source)
    const hasElif = /\swx:elif=/.test(tag.source)
    const hasElse = /\swx:else(?=[\s/>])/.test(tag.source)

    if ((hasElif || hasElse) && !parent.lastWasIfChain) {
      fail(`${file}:${tag.line} wx:${hasElif ? 'elif' : 'else'} 前没有同级相邻的 wx:if / wx:elif`)
    }

    // 记录条件链：if/elif 延续链，else 结束链
    if (hasIf || hasElif) parent.lastWasIfChain = true
    else if (hasElse) parent.lastWasIfChain = false
    else parent.lastWasIfChain = false

    if (!tag.selfClosing && !isVoid && tag.name !== 'block' && tag.name !== 'template') {
      stack.push({ name: tag.name, line: tag.line })
      parents.push({ lastWasIfChain: false })
    } else if (tag.name === 'block') {
      // block 是一个真实的容器，仍需要压栈以校验闭合
      stack.push({ name: tag.name, line: tag.line })
      parents.push({ lastWasIfChain: false })
    }
  })

  stack.forEach((tag) => {
    fail(`${file}:${tag.line} 标签 <${tag.name}> 未闭合`)
  })

  return source
}

/** 逐行提取方法名，避免正则跨行误吞整段代码。 */
function collectHandlers(file) {
  const raw = readFileSync(file, 'utf8')
  const source = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/[^\n]*/g, '$1')
  const names = new Set()
  const patterns = [
    /^\s*(?:async\s+)?([A-Za-z_$][\w$]*)\s*\((?:[^)]*)\)\s*\{/,        // method() {
    /^\s*([A-Za-z_$][\w$]*)\s*:\s*(?:async\s*)?function\b/,            // method: function
    /^\s*([A-Za-z_$][\w$]*)\s*:\s*\([^)]*\)\s*=>/,                     // method: () =>
  ]
  source.split('\n').forEach((line) => {
    patterns.forEach((pattern) => {
      const match = line.match(pattern)
      if (match) names.add(match[1])
    })
  })
  return names
}

function checkEvents(file, source, handlers, extraHandlers) {
  const eventPattern = /\b(?:bind|catch|mut-bind|capture-bind|capture-catch)(?::)?([a-z]+)\s*=\s*"([^"]+)"/g
  let match
  while ((match = eventPattern.exec(source)) !== null) {
    const handler = match[2].trim()
    if (!handler || handler.indexOf('{{') !== -1) continue
    if (handlers.has(handler) || extraHandlers.has(handler)) continue
    fail(`${file}: 事件 ${match[1]} 引用的处理函数 ${handler} 不存在`)
  }
}

function checkComponentJson(componentJsonPath) {
  const json = readJson(componentJsonPath)
  if (!json) return
  if (json.component !== true) fail(`${componentJsonPath}: 自定义组件缺少 "component": true`)
}

function walk(dir, callback) {
  readdirSync(dir).forEach((entry) => {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, callback)
    else callback(full)
  })
}

const appJson = readJson(join(APP_ROOT, 'app.json'))
if (!appJson) {
  console.error(errors.join('\n'))
  process.exit(1)
}

// 1. 页面文件完整性
const declaredPages = new Set(appJson.pages || [])
declaredPages.forEach((page) => {
  const base = join(APP_ROOT, page)
  const missing = ['.wxml', '.json'].filter(ext => !existsSync(`${base}${ext}`))
  if (!existsSync(`${base}.ts`) && !existsSync(`${base}.js`)) missing.push('.ts/.js')
  if (missing.length) fail(`app.json 声明的页面缺少文件：${page} (${missing.join(', ')})`)
})

const pageDirs = join(APP_ROOT, 'pages')
readdirSync(pageDirs).forEach((dir) => {
  if (!existsSync(join(pageDirs, dir, 'index.wxml'))) return
  const route = `pages/${dir}/index`
  if (!declaredPages.has(route)) fail(`页面 ${route} 未在 app.json 注册`)
})

// 2/3/4/5. 页面与组件检查
walk(APP_ROOT, (file) => {
  if (!file.endsWith('.wxml')) return
  const base = file.slice(0, -5)
  const source = checkWxml(file)

  const navCount = (source.match(/<navigation-bar[\s>]/g) || []).length
  if (navCount > 1) {
    // 历史遗留的 <block wx:if="{{false}}"> 分支不算活跃导航栏，但需要提醒清理。
    if (source.indexOf('wx:if="{{false}}"') !== -1) {
      warnings.push(`${file}: 存在被 wx:if="{{false}}" 关闭的历史分支，其中包含多余 navigation-bar`)
    } else {
      fail(`${file}: 同一页面声明了多个 navigation-bar，会出现重复导航栏`)
    }
  }

  const jsonPath = `${base}.json`
  if (!existsSync(jsonPath)) {
    fail(`${file}: 缺少同名 .json`)
    return
  }
  const json = readJson(jsonPath)
  const usingComponents = (json && json.usingComponents) || {}
  Object.keys(usingComponents).forEach((name) => {
    const target = resolveComponent(dirname(file), usingComponents[name])
    if (!existsSync(`${target}.wxml`)) fail(`${jsonPath}: 组件 ${name} 缺少文件 ${target}.wxml`)
    if (!existsSync(`${target}.json`)) {
      fail(`${jsonPath}: 组件 ${name} 缺少文件 ${target}.json`)
    } else {
      checkComponentJson(`${target}.json`)
    }
    if (!existsSync(`${target}.ts`) && !existsSync(`${target}.js`)) {
      fail(`${jsonPath}: 组件 ${name} 缺少脚本文件 ${target}.ts/.js`)
    }
    if (!new RegExp(`<${name}[\\s>]`).test(source)) {
      warnings.push(`${jsonPath}: 声明了组件 ${name} 但 WXML 未使用`)
    }
  })

  const scriptPath = existsSync(`${base}.ts`) ? `${base}.ts` : (existsSync(`${base}.js`) ? `${base}.js` : '')
  if (!scriptPath) {
    fail(`${file}: 缺少同名 ts/js`)
    return
  }
  const handlers = collectHandlers(scriptPath)
  // navigation-bar 的 homeButton 分支使用内置 home 方法（由组件自身提供）
  const extraHandlers = new Set(['home'])
  checkEvents(file, source, handlers, extraHandlers)

  if (!existsSync(`${base}.less`)) warnings.push(`${file}: 缺少同名 .less`)
})

// 只保留一套底部导航
const bottomNavFiles = []
walk(join(APP_ROOT, 'components'), (file) => {
  if (file.endsWith('bottom-nav.wxml')) bottomNavFiles.push(file)
})
if (bottomNavFiles.length > 1) fail(`存在多套底部导航实现：${bottomNavFiles.join(', ')}`)

if (warnings.length) {
  console.log('提醒：')
  warnings.forEach(item => console.log(`  - ${item}`))
}

if (errors.length) {
  console.error('校验失败：')
  errors.forEach(item => console.error(`  ✗ ${item}`))
  process.exit(1)
}

console.log(`校验通过：${declaredPages.size} 个页面，${bottomNavFiles.length} 套底部导航。`)

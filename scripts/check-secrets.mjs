#!/usr/bin/env node
/**
 * 提交前密钥自检
 *
 * 用法：npm run check:secrets
 *
 * 检查两件事：
 *  1) 是否有 .env 之类的敏感文件被纳入版本控制（只允许 .env.example）
 *  2) 源码/配置中是否存在真实密钥特征串
 *
 * 优先用 git 精确扫描「已跟踪的文件」（自动跳过 node_modules 等），
 * 若环境中无法调用 git，则降级为文件系统遍历。
 *
 * 退出码 0 = 通过，1 = 发现问题（建议接入 pre-commit 钩子或 CI）
 */
import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const SECRET_PATTERNS = [
  { name: 'OpenAI 风格密钥 sk-', re: /sk-[A-Za-z0-9_-]{20,}/ },
  { name: 'GitHub Token gh*_', re: /gh[pso]_[A-Za-z0-9]{20,}/ },
  { name: 'Google API Key AIza', re: /AIza[0-9A-Za-z_-]{30,}/ },
  { name: 'xAI 密钥 xai-', re: /xai-[A-Za-z0-9]{20,}/ },
  { name: 'AWS Access Key AKIA', re: /AKIA[0-9A-Z]{16}/ },
  { name: '私钥文件内容', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { name: 'Slack Token xox', re: /xox[baprs]-[A-Za-z0-9-]{10,}/ },
]

const ENV_FILE_RE = /^\.env(\.|$)/
const ENV_ALLOWLIST = new Set(['.env.example', '.env.sample', '.env.template'])

const SKIP_DIRS = new Set(['.git', 'node_modules', '.next', 'out', 'dist', 'coverage', '.turbo', '.workbuddy', '.idea'])
const SKIP_FILE_RE = /(\.(png|jpe?g|gif|webp|ico|svg|mp3|mp4|wav|woff2?|ttf|db|db-journal|lock|tsbuildinfo|map)$)|(^|\/)(package-lock\.json|pnpm-lock\.yaml|yarn\.lock)$/i
const MAX_FILE_BYTES = 2 * 1024 * 1024

function tryGit(args) {
  try {
    return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] })
  } catch (e) {
    if (e && (e.code === 'ENOENT' || e.code === 'EBUSY' || e.code === 'EPERM')) return null
    return '' // git 正常返回非 0（如 grep 无匹配）
  }
}

function walk(dir, root, acc = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue
    const full = join(dir, name)
    let st
    try {
      st = statSync(full)
    } catch {
      continue
    }
    if (st.isDirectory()) walk(full, root, acc)
    else if (st.isFile() && st.size <= MAX_FILE_BYTES) acc.push(full)
  }
  return acc
}

// ---- 确定待扫描的文件集合 ----
// 已跟踪 + 未跟踪但未被忽略（即「下一次提交可能包含的文件」），
// 这样新加的、尚未 git add 的文件也能被检查到。
const trackedOut = tryGit(['ls-files'])
const untrackedOut = tryGit(['ls-files', '--others', '--exclude-standard'])
const usingGit = trackedOut !== null && trackedOut.length > 0
const root = process.cwd()

let files
if (usingGit) {
  const list = new Set(
    `${trackedOut}\n${untrackedOut ?? ''}`
      .split('\n')
      .map((f) => f.trim())
      .filter(Boolean),
  )
  files = [...list].map((f) => ({ label: f, path: join(root, f) }))
} else {
  files = walk(root, root).map((p) => ({ label: relative(root, p).split(sep).join('/'), path: p }))
}

// ---- 1. 敏感环境变量文件 ----
const problems = []
if (usingGit) {
  const bad = files
    .map((f) => f.label)
    .filter((f) => ENV_FILE_RE.test(f) && !ENV_ALLOWLIST.has(f))
  if (bad.length) {
    problems.push(`以下环境变量文件被纳入了版本控制，请立即移除并轮换其中的密钥：\n    ${bad.join('\n    ')}`)
  }
} else {
  const present = files.map((f) => f.label).filter((f) => ENV_FILE_RE.test(f))
  console.log('  ⚠️  无法调用 git，已跳过「敏感文件是否被跟踪」检查')
  console.log(`      本机检测到：${present.join(', ') || '无'}（.env 已被 .gitignore 忽略，属正常）`)
}

// ---- 2. 扫描密钥特征串 ----
const hits = new Map()
for (const f of files) {
  if (f.label.startsWith('.env') && ENV_ALLOWLIST.has(f.label)) continue // 模板文件允许含占位符
  let text
  try {
    text = readFileSync(f.path, 'utf8')
  } catch {
    continue
  }
  if (text.includes('\u0000')) continue // 二进制
  const lines = text.split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    for (const p of SECRET_PATTERNS) {
      if (p.re.test(lines[i])) {
        if (!hits.has(f.label)) hits.set(f.label, [])
        hits.get(f.label).push(`第 ${i + 1} 行 [${p.name}] ${lines[i].trim().slice(0, 140)}`)
      }
    }
  }
}
if (hits.size) {
  let msg = '被发现疑似真实密钥：\n'
  for (const [file, list] of hits) msg += `  ${file}\n${list.map((h) => `      ${h}`).join('\n')}\n`
  problems.push(msg.trimEnd())
}

// ---- 输出 ----
console.log('密钥自检 · 敏感信息扫描')
console.log(`  扫描方式：${usingGit ? 'git（已跟踪 + 未忽略的新文件）' : '文件系统遍历（降级模式）'}`)
console.log(`  已检查文件：${files.length} 个`)

if (problems.length === 0) {
  console.log('  ✅ 未发现密钥泄露风险，可以提交')
  process.exit(0)
}

console.log('')
for (const p of problems) console.log(`  ❌ ${p}`)
console.log('')
console.log('  真实密钥必须通过环境变量配置，不得写入代码或提交到仓库。')
console.log('  若确认属误报（如示例占位符），可调整 scripts/check-secrets.mjs 中的匹配规则。')
process.exit(1)

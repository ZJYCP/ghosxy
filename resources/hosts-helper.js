const fs = require('fs')
const os = require('os')
const path = require('path')

const isWin = os.platform() === 'win32'
const HOSTS_PATH = isWin
  ? path.join(process.env.SystemRoot || 'C:\\Windows', 'System32/drivers/etc/hosts')
  : '/etc/hosts'

const EOL = isWin ? '\r\n' : '\n'

const action = process.argv[2] // 'add' | 'remove'
const domain = process.argv[3]
const ipv4 = process.argv[4] || '127.0.0.1'
const ipv6 = '::1' // 固定 IPv6 本地回环地址
const appName = process.argv[5] || 'Ghosxy'

if (!action || !domain) {
  console.error('Usage: node hosts-helper.js <add|remove> <domain> [ip] [appName]')
  process.exit(1)
}

try {
  const content = fs.readFileSync(HOSTS_PATH, 'utf8')
  const lines = content.split(/\r?\n/)
  const marker = `# Added by ${appName}`

  let newLines = []
  let modified = false

  // 1. 清理阶段：过滤掉所有涉及该域名的旧行（防止重复或冲突）
  const cleanLines = lines.filter((line) => {
    // 保留纯注释
    if (line.trim().startsWith('#') && !line.includes(marker)) return true

    // 如果行内包含目标域名，不管是 IPv4 还是 IPv6，统统删掉，准备重写
    if (line.includes(domain)) {
      modified = true
      return false
    }
    return true
  })

  newLines = cleanLines

  // 2. 添加阶段：同时写入 IPv4 和 IPv6
  if (action === 'add') {
    // 确保文件末尾有换行，防止粘连
    if (newLines.length > 0 && newLines[newLines.length - 1].trim() !== '') {
      newLines.push('')
    }

    // 写入两条记录
    newLines.push(`${ipv4} ${domain} ${marker}`)
    newLines.push(`${ipv6} ${domain} ${marker}`)
    modified = true
  }

  if (modified) {
    fs.writeFileSync(HOSTS_PATH, newLines.join(EOL), 'utf8')
    console.log(`Successfully updated hosts (IPv4/IPv6) for ${domain}`)
  } else {
    console.log('No changes needed.')
  }
} catch (err) {
  console.error('Hosts helper error:', err)
  process.exit(1)
}

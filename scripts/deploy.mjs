#!/usr/bin/env node
import { execSync } from 'child_process'
import { resolve } from 'path'

const dist = resolve('dist')

try {
  console.log('🔨 构建中...')
  execSync('npx vite build', { stdio: 'inherit' })

  console.log('🚀 正在部署到 gh-pages 分支...')
  const cmds = [
    'git init',
    'git checkout -b gh-pages',
    'git add -A',
    `git commit -m "deploy ${new Date().toISOString().slice(0,10)}"`,
    'git remote add origin https://github.com/JavonLoong/guang-website.git',
    'git push -f origin gh-pages'
  ]
  execSync(cmds.join(' && '), { cwd: dist, stdio: 'inherit' })

  console.log('✅ 部署成功！')
} catch (e) {
  console.error('❌ 部署失败:', e.message)
  process.exit(1)
}

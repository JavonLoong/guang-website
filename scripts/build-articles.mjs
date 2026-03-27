import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CONTENT_DIR = path.resolve(__dirname, '../src/content')
const OUTPUT_FILE = path.resolve(__dirname, '../public/data/articles.json')

// 解析简单的 Markdown Frontmatter
function parseMarkdown(fileContent) {
  const match = fileContent.match(/^---\n([\s\S]+?)\n---\n([\s\S]*)$/)
  if (!match) return null

  const frontmatterStr = match[1]
  const content = match[2].trim()

  const meta = {}
  let currentKey = null
  let listItems = []

  const lines = frontmatterStr.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trimEnd()
    if (!line) continue

    if (line.startsWith('  - ')) {
      if (currentKey) {
        listItems.push(line.replace('  - ', '').trim())
      }
    } else {
      if (currentKey && listItems.length > 0) {
        meta[currentKey] = [...listItems]
        listItems = []
      }
      
      const colonIdx = line.indexOf(':')
      if (colonIdx !== -1) {
        const key = line.slice(0, colonIdx).trim()
        let value = line.slice(colonIdx + 1).trim()
        
        // 处理引号包裹的值
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1)
        } else if (value.startsWith("'") && value.endsWith("'")) {
          value = value.slice(1, -1)
        }

        if (value === '') {
          currentKey = key
          listItems = []
        } else {
          meta[key] = value
          currentKey = null
        }
      }
    }
  }

  // 收尾最后一个列表
  if (currentKey && listItems.length > 0) {
    meta[currentKey] = listItems
  }

  return { meta, content }
}

function buildArticles() {
  console.log('📦 开始构建文章数据...')
  
  if (!fs.existsSync(CONTENT_DIR)) {
    console.warn(`⚠️ 警告: 内容目录 ${CONTENT_DIR} 不存在`)
    return
  }

  const files = fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith('.md'))
  const articles = []

  for (const file of files) {
    const filePath = path.join(CONTENT_DIR, file)
    const fileContent = fs.readFileSync(filePath, 'utf-8')
    
    const parsed = parseMarkdown(fileContent)
    if (!parsed) {
      console.warn(`⚠️ 无法解析 ${file} 的 Frontmatter，已跳过。`)
      continue
    }

    const { meta, content } = parsed
    
    // 构造最终的 JSON 结构
    const articleObject = {
      id: parseInt(meta.id, 10),
      title: meta.title || "未命名文章",
      updated_at: meta.date || new Date().toISOString().slice(0, 16).replace('T', ' '),
      tags: meta.tags || [],
      summary: meta.summary || "",
      content: content,
      // 为了兼容现有结构，添加一个默认的基础 history，不再每次保留完整的复杂 edits 版
      history: [
        {
          version: "v1.0",
          time: meta.date || new Date().toISOString().slice(0, 16).replace('T', ' '),
          description: "由自动化构建脚本发布",
          title: meta.title || "未命名文章",
          content: content
        }
      ]
    }
    articles.push(articleObject)
  }

  // 按照 ID 升序排序
  articles.sort((a, b) => a.id - b.id)

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(articles, null, 2), 'utf-8')
  console.log(`✅ 成功生成 public/data/articles.json，共包含 ${articles.length} 篇文章。`)
}

buildArticles()

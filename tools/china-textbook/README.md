# ChinaTextbook 本机阅读套件

[TapXWorld/ChinaTextbook](https://github.com/TapXWorld/ChinaTextbook) 不是软件项目，而是一份公开的 **PDF 教材合集**：小学、初中、高中、大学，数学为主、其它科目也有。上游大约 **43GB**，直接 `git clone` 会把电脑和 Cursor 索引一起拖垮。

本目录只做三件事：

1. 保存一份 **文件清单**（没有教材正文）
2. **按书名按需下载**，并自动拼回被拆开的 PDF
3. 把 PDF **抽成按页切开的 Markdown**，让 AI 用搜索阅读，而不是去啃二进制文件

教材版权仍归出版社。这里的 PDF 和抽取文本都放在仓库根目录的 `textbook/` 里，**不会提交到 git**。

## 在你电脑上怎么用

在仓库根目录执行：

```bash
python3 tools/china-textbook/cli.py status
python3 tools/china-textbook/cli.py list --query "线性代数"
python3 tools/china-textbook/cli.py prepare --query "线性代数" --ocr --pages 1-20
```

`prepare` = 下载 + 合并分卷 + 抽成 `textbook/text/.../p0001-0015.md`。

这个仓库里的多数课本是**扫描件**，PDF 里没有可选中的文字。不加 `--ocr`，AI 只能看到空白。OCR 大约每页 1–3 秒，建议先用 `--pages 1-20` 试读，确认可用再抽全书。

常用命令：

| 命令 | 作用 |
| --- | --- |
| `list -q "高中 数学"` | 只看目录，不下载 |
| `prepare -q "一年级上册" --stage 小学 --subject 数学` | 配齐一本书给 AI 读 |
| `search "特征值"` | 在已抽取文本里搜 |
| `refresh` | 从 GitHub 更新文件清单 |

抽取 PDF 需要：

```bash
pip install -r tools/china-textbook/requirements.txt
```

扫描件 OCR，任选一种：

- 安装 [Tesseract](https://github.com/tesseract-ocr/tesseract) 和中文语言包 `chi_sim`（本工具会优先用它）
- 或者 `pip install rapidocr onnxruntime`

## 为什么 AI 不能直接读那个 GitHub 仓库

- 仓库里主要是 PDF，很多还被切成 `.pdf.1`、`.pdf.2`，Cursor 没法当源代码搜。
- 一次塞进一本 50MB 的 PDF，上下文会被撑爆，还经常抽不出字。
- 正确顺序是：**清单定位 → 只下一本 → 抽成 Markdown 分片 → 按章节/页码读**。

对应的 Cursor 规则在 `.cursor/rules/china-textbook.mdc`。

## 不要做的事

- 不要 `git clone` 整个 ChinaTextbook。
- 不要把 `textbook/` 里的 PDF 或抽取正文提交到本网站仓库。
- 不要把教材正文发到公开页面。本站那篇笔记只介绍这个仓库怎么用，不收录课文。

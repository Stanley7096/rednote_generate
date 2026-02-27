# 小红书笔记生成网页工具

这是一个可本地打开的 HTML 工具，配套一个后端爬虫代理服务，用于抓取小红书帖子内容（文字 + 图片），并生成类似风格的小红书图文卡片，可下载 PNG。

## 功能
- URL 抓取原帖文字与图片
- 多风格卡片选择（带预览）
- 输入自定义要求
- 生成文案 + 生成图文卡片
- 导出 PNG

## 本地运行（后端）
1. 安装依赖

```bash
npm install
npx playwright install
```

2. 启动后端

```bash
npm start
```

3. 打开前端
- 直接双击 `index.html` 打开
- 将“后端地址”设置为 `http://localhost:3000`

## 一键部署（Render 推荐）
本项目已包含 `render.yaml` + `Dockerfile`，使用 Playwright 官方镜像避免浏览器安装失败，适配 Render Blueprint 一键部署。

1. 把项目推送到 GitHub
2. 打开 Render 控制台，选择 **New +** -> **Blueprint**
3. 选择该仓库，Render 会自动读取 `render.yaml` 与 `Dockerfile` 并部署

如果需要按钮方式，可以在 README 加入如下链接（替换你的仓库地址）：

```markdown
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=YOUR_REPO_URL)
```

部署完成后，把前端“后端地址”设置为 Render 给你的公网地址。

## 说明
- 小红书页面有反爬限制，抓取成功与否取决于页面结构与反爬策略。
- 若抓取失败，可使用“演示数据”或手动粘贴文本与图片链接。

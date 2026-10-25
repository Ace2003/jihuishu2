# 机会树 · 本地真实 API MVP

保留原有连续滚动页面与水彩树：两个输入框 → 角色规划 → 元宝真实搜索 → 下滑查看六颗苹果 → 人物列表 → 六字段报告 → 导出 1086×1448（3:4）PNG。

## 启动

需要 Node.js 22+（本次使用 22.18.0），没有运行时第三方依赖。

1. 在 `.env.local` 配置 `YUANBAO_API_KEY`、`LLM_API_KEY`、`LLM_CHAT_URL`、`LLM_MODEL`，格式见 `.env.example`；修改后重启服务。
2. 运行 `node server.mjs`，或双击 `启动Demo.bat`。
3. 打开 **http://localhost:3000**。初始为空树，提交后才调用真实 API；「体验示例数据」显示明确标注的静态公开案例。

元宝使用 **元宝搜索 → 服务 API KEY** 创建的完整 Key。KeyName 只是管理名称；通用 SecretId/SecretKey 不能填进此字段。

单独检查：

```text
node scripts/check-yuanbao.mjs "AI 创业者 公开活动"
node scripts/check-model.mjs
```

SearchPro 遵循[腾讯官方服务 API KEY 文档](https://cloud.tencent.com/document/product/1806/130615)：POST `https://api.wsa.cloud.tencent.com/SearchPro`，Bearer 认证，`{"Query":"..."}`；逐项解析 `Response.Pages` 中的 JSON 字符串。模型调用兼容 Chat Completions，并使用 JSON 输出模式。

## 事实与建议

- 最多六类角色，搜索后对具名候选做有上限的补充搜索。
- 职位、机构分别要求包含本人姓名的来源原文，不能仅出现姓名就通过。拒绝学历院校、采访他人、合作机构等歧义证据；不足则省略人物。
- 公开事实由通过校验的引文构造；背景交集标为推断、合作方向标为 AI 建议；过滤既有私人关系、实际合作和录用保证。
- 公开入口要求有对应本人或机构的原文；关闭、取消入口不采用。无入口就明确说明，不生成私人渠道。
- **核验范围是 SearchPro 返回的标题和摘要，不是逐页抓取原文，也不保证当前职位、活动仍有效。**保留可点击来源、资料日期与证据供用户打开核实。
- 六颗苹果固定，角色和人数动态变化，不凑满六类或每类四人；单次最多六位人物，每类最多四人。

## 本地额度与异常

默认只监听 `127.0.0.1`。每 IP 每分钟最多五次调查、同时最多两次、单进程每天最多三十次；单次最多十二次搜索和三次模型调用，无自动收费重试。模型各次输出上限为 1600 / 6500 / 6500 tokens；实际消耗记录在返回的 `usage` 中。

搜索超时 25 秒、模型超时 55 秒、整次调查超时 180 秒。取消会中断后续请求并释放槽位。鉴权失败、协议错误与真正的空结果分别处理，不把故障显示为搜索成功。模型使用官方 JSON 输出模式，格式错误或截断会明确失败。

日次数与限流保存在当前进程内，重启会重置，不能作为公开生产环境的永久计费保护。Render 部署配置见 `render.yaml` 和 [Render 部署说明](docs/Render部署.md)；免费实例休眠或重启会清零计数，公开部署前请评估额度消耗。

## 验证与证据

```text
node --test tests/server.test.mjs
node --check server.mjs
node --check public/app.js
```

服务端回归只用本地上游替身，覆盖伪造证据、机构误归属、关闭入口、虚构关系、鉴权/协议失败、空结果、秘密隔离、取消、并发与日额度。**这些不等同于真实 API 验收。**

真实验收：`node scripts/live-acceptance.mjs`；可指定 `--case=statistics`、`--case=game-art`、`--case=coffee`。命令会真实消耗搜索/模型额度。最新记录在 `artifacts/live/`，前次记录在 `artifacts/live/attempts/`。

浏览器验收：`node scripts/ui-acceptance.mjs --live`。使用本机 Edge 的独立无头会话及环境已有 Playwright；可用 `BROWSER_NODE_MODULES`、`BROWSER_EXECUTABLE` 指定测试依赖。截图、真实响应和 PNG 在 `artifacts/browser/`。文件名带 `static-example` 的图片仅为静态示例。

详细输入、人物、公开链接、历史失败与限制见 **[本地验收记录](docs/本地验收记录.md)**。搜索与模型存在波动，无可靠人物或入口时会正常降级，不保证每次相同结果。

## 安全与文件

密钥只在被 `.gitignore` 排除的 `.env.local`。静态服务仅暴露 `public/`，不暴露配置或诊断数据。不要把密钥放进前端或公开产物。

页面：`public/index.html`；样式：`public/style.css`；交互/导出：`public/app.js`；服务：`server.mjs`。

`机会树-立即预览.html` 仍是旧版离线静态案例，不接真实 API；不要把它作为实时版本提交。

当前目录没有 Git 仓库；本次使用 `artifacts/baseline-*` 进行实际差异核对，没有建仓库、提交或推送。原水彩图片保持原样。
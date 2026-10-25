# 部署到 Render

本目录已包含 Render 所需配置：

- `package.json`：声明 Node.js 22、`npm start` / `npm test`
- `render.yaml`：Render Blueprint（Web Service、免费实例、新加坡区域、健康检查 `/api/status`）

密钥不写入仓库。`.env.local` 已被 `.gitignore` 排除，Render 端通过环境变量注入。

## 一、把代码推到 GitHub

先在 GitHub 网页创建一个**空仓库**（不要勾选初始化 README），例如 `jihuishu`。然后在项目目录执行：

```bash
git init -b main
git add -A
git commit -m "Deploy 机会树 to Render"
git remote add origin https://github.com/<你的GitHub用户名>/jihuishu.git
git push -u origin main
```

推送前确认 `.env.local` 没被提交：

```bash
git ls-files | grep -i env
```

应当只看到 `.env.example`。如果看到 `.env.local`，立即停止并检查 `.gitignore`。

## 二、用 Blueprint 部署（推荐）

1. 打开 <https://dashboard.render.com>，注册/登录。
2. 在 **Account Settings → Git Deployment Credentials** 连接 GitHub，授权访问该仓库。
3. 点击 **New + → Blueprint**，选择刚创建的仓库。
4. Render 会读取 `render.yaml`。首次创建时会提示填写两个 `sync: false` 的密钥：
   - `YUANBAO_API_KEY`：元宝搜索「服务 API KEY」
   - `LLM_API_KEY`：DeepSeek（或其它兼容 Chat Completions 服务）的 Key
   两个值从本地 `.env.local` 复制，**不要**发到聊天或提交到仓库。
5. 点击 **Apply**，等待状态变为 **Live**。
6. 打开 Render 分配的地址（形如 `https://jihuishu.onrender.com`），访问 `/api/status` 应返回：

```json
{"searchConfigured":true,"modelConfigured":true,"mode":"real-api"}
```

## 三、不用 Blueprint 时的手动配置

在 **New + → Web Service** 中选择仓库后填写：

| 字段 | 值 |
| --- | --- |
| Language | Node |
| Branch | `main` |
| Build Command | `npm install --omit=dev` |
| Start Command | `npm start` |
| Instance Type | Free |
| Region | Singapore |
| Health Check Path | `/api/status` |

环境变量：

| Key | Value |
| --- | --- |
| `NODE_VERSION` | `22` |
| `HOST` | `0.0.0.0` |
| `LLM_CHAT_URL` | `https://api.deepseek.com/chat/completions` |
| `LLM_MODEL` | `deepseek-chat` |
| `MAX_CONCURRENT` | `2` |
| `DAILY_INVESTIGATION_LIMIT` | `30` |
| `YUANBAO_API_KEY` | 你的元宝服务 API KEY |
| `LLM_API_KEY` | 你的模型 API KEY |

`PORT` 由 Render 自动注入，不要手动设置。`HOST=0.0.0.0` 必须设置，否则 Render 无法从容器外访问服务。

## 四、上线前注意

- **免费实例会在 15 分钟无请求后休眠**，下一次访问需要几十秒冷启动。
- **每日额度计数保存在进程内**，实例休眠、重启或重新部署都会清零，因此免费实例上的 30 次/天不是可靠的硬上限。公开部署前请确认搜索和模型账户的额度/账单上限。
- 限流使用连接来源 IP。经过 Render 反向代理后，所有访问可能被视为同一个 IP，实际效果会是全站共享每分钟 5 次、同时 2 次的限制；这对控制成本有利，但高峰期可能提示稍后再试。
- 公开站点会消耗你配置的元宝搜索和模型额度，任何人都能触发调查。建议先调低 `DAILY_INVESTIGATION_LIMIT`，确认成本后再提高。
- 免费实例的文件系统是临时的，`artifacts/` 下的验收数据不会持久保存；`LOCAL_AUDIT` 不要在生产环境开启。
- SSE 长连接（单次调查最长 180 秒，含 10 秒心跳）Render 可直接支持，无需额外代理配置。

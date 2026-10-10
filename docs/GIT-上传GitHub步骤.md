# 上传到 GitHub —— 操作清单

> 适用：本项目当前状态（`main` 分支、10 条提交、6 个标签、仓库 2.7 MB）
>
> ⏩ **本仓库已完成**：远程地址 `https://github.com/Guanhongzheng/-AI-WEB-.git` 已配置、上游已设好、远端根提交已衔接。**请直接跳到第二节「推送」执行**。
> 下面第〇、一节是通用做法，保留作参考（仅在需要另建仓库时使用）。

---

## 〇、前置准备（约 3 分钟）

### 1. 确认 GitHub 账号已绑定提交邮箱

打开 GitHub → 右上角头像 → **Settings** → 左侧 **Emails**，确认 **`3038641679@qq.com`** 已在列表中。

> ⚠️ 这步很重要：GitHub 只按**注册邮箱**归因贡献。邮箱没加，提交虽然带你的名字，但**不会计入你的贡献图**，答辩时"作者是我"的证据会打折扣。

### 2. 在 GitHub 网页上新建一个**空仓库**

仓库页面右上角 **➕ → New repository**：

| 字段 | 填什么 |
|---|---|
| Repository name | `persona-mate-ai`（或你喜欢的名字） |
| Description | 可选，例如 `AI 原生情绪陪伴 Web 应用 · 传智杯参赛作品` |
| Public / Private | **推荐 Public** —— 公开仓库可作为"原创性"的佐证 |
| Add a README file | **不要勾** ❌ |
| Add .gitignore | **不要勾** ❌ |
| Choose a license | **不要选** ❌ |

> ❗ 后三项**必须留空**。如果建库时勾了 README，远程会先有一条提交，你推上去就会报 `rejected` 冲突（见第五节报错 4 的解法）。

### 3. 复制仓库地址

建完后页面上会出现地址，形如：

```
https://github.com/你的用户名/persona-mate-ai.git
```

---

## 一、连接远程仓库

在项目根目录打开终端（Git Bash 或 CMD 都可以），执行：

```bash
cd "C:/Users/30386/Desktop/project"
git remote add origin https://github.com/你的用户名/persona-mate-ai.git
```

验证：

```bash
git remote -v
# 应输出两行：
# origin  https://github.com/你的用户名/persona-mate-ai.git (fetch)
# origin  https://github.com/你的用户名/persona-mate-ai.git (push)
```

---

## 二、推送（两条命令，第二条别漏）

```bash
git push
git push origin --tags
```

- 第一条：推送 `main` 分支的 10 条提交（上游已设好，直接 `git push` 即可；如换仓库则用 `git push -u origin main`）
- 第二条：推送 `v0.1` ~ `v0.5`、`v1.0` 共 6 个标签
  **标签默认不会被推送**，漏了这句版本标记就丢在本地了。

### 认证：密码要填 Token，不是登录密码

推送时终端会提示：

```
Username for 'https://github.com':
Password for 'https://你的用户名@github.com':
```

- **Username**：填你的 GitHub 用户名
- **Password**：**不能填 GitHub 登录密码**（GitHub 早已禁用它做 Git 认证），必须填 **Personal Access Token**

**生成 PAT 的步骤**：

1. GitHub → 头像 → **Settings**
2. 左侧最下 **Developer settings**
3. **Personal access tokens → Tokens (classic)**
4. 右上 **Generate new token (classic)**
   - Note：`push-personamate`
   - Expiration：建议 `90 days`（够过完比赛）
   - Scopes：**只勾 `repo`** 即可（完整仓库读写权限）
5. 点 **Generate token**，复制以 `ghp_` 开头的那串

> ⚠️ **Token 只显示这一次**，关掉页面就再也看不到。先存到记事本里。

首次输入后，Windows 的 Git 凭据管理器通常会记住，后续推送不用再输。

---

## 三、推送完做什么

### 1. 在 GitHub 上核对三件事

| 检查项 | 期望看到 |
|---|---|
| 提交历史 | 9 条，最早的是 `阶段快照 1`，最新的是文档提交 |
| 作者名 | 每条都显示 **官弘政** |
| Tags | 仓库首页右侧或 `/tags` 页面能看到 v0.1 ~ v1.0 |
| Contributors | 显示你的账号（若没有，回第〇节第 1 步检查邮箱） |
| 文件数 | 127 个，**没有** `node_modules/`、`.env`、`dev.db` |

### 2. 把仓库链接填进参赛材料

传智杯要求提交作品说明，公开仓库地址是"原创性"的有力佐证，记得写进去。

---

## 四、以后每次更新（三件套）

```bash
git add -A
git commit -m "feat: 说明这次改了什么"
git push
```

**提交信息建议用规范前缀**，评委一眼能看出你的迭代节奏：

| 前缀 | 用于 |
|---|---|
| `feat:` | 新功能（如 `feat: RAG 接入真实 embedding 检索`） |
| `fix:` | 修 bug（如 `fix: 加密密钥缺失时改为报错`） |
| `docs:` | 改文档 |
| `refactor:` | 重构 |
| `chore:` | 杂项（配置、依赖） |

> 💡 **这才是往后再也无法被质疑的开发痕迹。** 距离校赛还有 4 周，每次改造单独提交一次，能积累出几十条真实提交，比任何说明都有说服力。

---

## 五、常见报错对照表

| 报错 | 原因 | 解法 |
|---|---|---|
| `remote: Support for password authentication was removed` | 填了登录密码 | 改用 PAT（见第二节） |
| `fatal: Authentication failed for 'https://github.com/...'` | Token 填错 / 过期 / 权限没勾 `repo` | 重新生成 PAT；或清掉旧凭据后重试 |
| `Failed to connect to github.com port 443: Timed out` | 网络不通（国内常见） | 见下方"网络问题" |
| `! [rejected] main -> main (fetch first)` / `remote contains work that you do not have` | 建库时勾了 README / .gitignore | 先 `git pull --rebase origin main`，解决冲突后再 `git push -u origin main`（**本项目这种情况已提前处理**：远端自动生成的 `Initial commit` 已作为历史根被衔接，推送为正常快进，无需强推） |
| `schannel: ... CRYPT_E_NO_REVOCATION_CHECK` 或 `unable to get local issuer certificate` | 本机代理软件拦截 HTTPS，Git 证书校验失败 | 单条命令临时关闭校验：`git -c http.sslVerify=false push origin main`（**不要**写进全局配置） |
| `error: src refspec main does not match any` | 本地没有 `main` 分支 | 先确认：`git branch -a`，切到 `main` 再推 |
| `fatal: remote origin already exists` | 已经配过 origin | `git remote set-url origin <新地址>` 直接改 |
| 推送卡住不动、输入框没反应 | 认证弹窗被挡住了 | 换用 Git Bash 终端重试；或检查是否弹出了凭据窗口 |

### 网络问题（推送超时）

如果你有本地代理（如 Clash、v2ray，常见端口 7890 / 10809），临时让 Git 走代理：

```bash
git config --global http.proxy  http://127.0.0.1:7890
git config --global https.proxy http://127.0.0.1:7890
git push -u origin main
git push origin --tags

# 推完取消代理，避免影响访问国内服务
git config --global --unset http.proxy
git config --global --unset https.proxy
```

---

## 六、两条红线

1. **只用这两条推送命令**：
   ```
   git push -u origin main
   git push origin --tags
   ```
   ❌ **绝对不要**用 `git push --all` 或 `git push --mirror` —— 会把本地所有分支（包括以前的历史重写备份分支）一并推上去。

2. **不要把 `.env` 提交进去**。项目里已有 `.gitignore` 拦住它，但也别手动 `git add -f .env`。真实的 API Key 一旦推上公开仓库，即使后续删除，历史里仍然能翻到，必须视为已泄露、立即更换 Key。

---

## 七、一句话流程

```
建空仓库 → git remote add origin <地址> → git push -u origin main → git push origin --tags → 网页核对
```

认证用 **PAT**，不要用登录密码。

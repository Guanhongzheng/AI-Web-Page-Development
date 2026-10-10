# Git 版本管理说明

项目此前的 5 个「project - 副本」文件夹已导入为 Git 历史，现在可以随时回滚，无需再复制文件夹。

## 一、历史结构

```
97b7bfd          docs: 新增上传 GitHub 操作清单
40a950c          docs: README 声明仓库历史来源
ec2d976          chore: 忽略 .workbuddy 目录；文档同步
8895e1d          docs: 新增 Git 版本管理说明
f74c7d1  v1.0    chore: 建立 Git 版本控制基线        ← 基线
cde45f1  v0.5    chore(snapshot): 阶段快照 5   (10-10 20:04)
3d575cc  v0.4    chore(snapshot): 阶段快照 4   (10-10 19:36)
95b62a6  v0.3    chore(snapshot): 阶段快照 3   (10-09 23:56)
44698dd  v0.2    chore(snapshot): 阶段快照 2   (10-09 23:32)
62fe325  v0.1    chore(snapshot): 阶段快照 1   (10-09 22:47)
09759b8          Initial commit   ← GitHub 建库时自动生成的根提交
```

每条提交的文件数：v0.1=100、v0.2=101、v0.3=104、v0.4=123、v0.5=123、v1.0=126，其后 127~128。
所有提交均不含 `node_modules`、`.next`、`.env`、`*.db`、`.workbuddy`。
全部提交的作者均为：`官弘政 <3038641679@qq.com>`。

> 历史根部是 GitHub 建库时自动生成的 `Initial commit`（只含一个空的 README.md），
> 项目自身的历史完整接在它之上，因此推送到 GitHub 是**正常快进**，无需 `--force`。

> **关于历史来源**：`v0.1` ~ `v0.5` 由开发期间的本地阶段快照整理入库，属于**阶段性整体快照**（粒度粗），并非逐次的小提交。详见 README「关于本仓库历史」。

## 二、查看历史

```bash
git log --oneline --graph            # 查看完整历史
git log --stat                       # 带文件变更统计
git show v0.3                        # 查看某个版本的完整改动
git diff v0.3 v0.5                   # 比较两个版本
git diff v0.5                        # 比较某版本与当前工作区
```

## 三、回滚

### 1. 只想看看旧版本长什么样（安全，不改动任何东西）

```bash
git checkout v0.3        # 切到版本 3（分离头指针状态）
git checkout main        # 看完切回来
```

### 2. 把某个旧版本的文件恢复到工作区（推荐，保留后续提交）

```bash
git checkout v0.3 -- .   # 把版本 3 的所有文件覆盖到当前工作区
git status               # 查看变化
git checkout main -- .   # 不想要了就撤销，恢复成当前版本
```

### 3. 只恢复某一个文件

```bash
git checkout v0.3 -- src/lib/rag.ts
```

### 4. 整个项目回到某个版本（危险，会丢弃之后的改动）

```bash
git reset --hard v0.3    # 工作区彻底回到版本 3
git reset --hard v1.0    # 回到最新
```

> 执行 `reset --hard` 前先确认没有未提交的改动，或先用 `git stash` 存起来。

### 5. 从旧版本开一条新分支继续开发

```bash
git branch try-from-v3 v0.3
git checkout try-from-v3
```

## 四、日常提交

```bash
git add -A
git commit -m "feat: 描述这次改了什么"
```

建议每次改造（如 RAG 接真、Agent 分支）单独提交一次，出问题就能精确回退到某一步。

## 五、当前身份配置

已设置为本人身份（提交会归因到 GitHub 账号）：

```bash
git config user.name    # 官弘政
git config user.email   # 3038641679@qq.com
```

> GitHub 只按**注册邮箱**归因贡献。请确认该邮箱已添加到你 GitHub 账号的 Email 设置中，否则贡献不会计入你的贡献图。

## 六、注意

- `.gitignore` 已忽略 `node_modules`、`.next`、`.env`、`*.db`、`*.tsbuildinfo`、`.workbuddy`。
- `.git/info/exclude` 另有一份本地兜底忽略规则（不会提交到仓库）。
- 桌面上的 5 个副本文件夹与 2 个 zip 在确认无误后即可删除。
- 历史整理期间产生的临时备份分支已全部删除。
- **推送时只推 main 与标签，不要用 `git push --all` / `--mirror`**：
  ```bash
  git push -u origin main
  git push origin --tags
  ```
- `.workbuddy/` 是本机工作记录目录，**已从版本库移除并忽略**，不会上传到 GitHub。

## 七、远程仓库

| 项 | 值 |
|---|---|
| 地址 | `https://github.com/Guanhongzheng/-AI-WEB-.git` |
| 可见性 | Public |
| 上游分支 | `origin/main`（已 `git branch --set-upstream-to=origin/main main`） |
| 推送方式 | **fast-forward 快进**（本地历史接在远端根提交之上），**无需 `--force`** |

远端原有 1 个提交 `09759b8 Initial commit`（GitHub 建库时自动生成，仅含一个内容为 `# -AI-WEB-` 的 README.md）。项目自身的 10 条提交已重放到该提交之上，因此两条历史已连成线性。

### 推送（在项目根目录执行）

```bash
git push
git push origin --tags      # 标签必须单独推，否则 v0.1~v1.0 不会上传
```

首次推送需认证：用户名填 GitHub 用户名，**密码填 Personal Access Token（不是登录密码）**。详见 [上传到 GitHub 步骤](./GIT-上传GitHub步骤.md)。

### 若推送报 TLS / 连接错误

本机若使用了会拦截 HTTPS 的代理软件，可能出现
`schannel: ... CRYPT_E_NO_REVOCATION_CHECK` 或 `unable to get local issuer certificate`。
可临时在单条命令里关闭证书校验（不写入配置）：

```bash
git -c http.sslVerify=false push origin main
git -c http.sslVerify=false push origin --tags
```

或者配好代理后正常推送（见上传步骤文档"网络问题"一节）。

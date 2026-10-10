# Git 版本管理说明

项目此前的 5 个「project - 副本」文件夹已导入为 Git 历史，现在可以随时回滚，无需再复制文件夹。

## 一、历史结构

```
f81165e  v1.0  chore: 初始化 Git 仓库并提交基线        ← 当前 HEAD（= 当前工作区）
cb50944  v0.5  导入历史版本 5   (10-10 20:04)
274e5fb  v0.4  导入历史版本 4   (10-10 19:36)
911fe09  v0.3  导入历史版本 3   (10-09 23:56)
c2cdff8  v0.2  导入历史版本 2   (10-09 23:32)
61b0bee  v0.1  导入历史版本 1   (10-09 22:47)
```

每条提交的文件数：v0.1=100、v0.2=101、v0.3=104、v0.4=123、v0.5=123、v1.0=127。
所有提交均不含 `node_modules`、`.next`、`.env`、`*.db`。

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

提交身份目前是占位值，建议改成自己的：

```bash
git config user.name "你的名字"
git config user.email "你的邮箱"
```

## 六、注意

- `.gitignore` 已忽略 `node_modules`、`.next`、`.env`、`*.db`、`*.tsbuildinfo`。
- `.git/info/exclude` 另有一份本地兜底忽略规则（不会提交到仓库）。
- 桌面上的 5 个副本文件夹与 2 个 zip 在导入确认无误后即可删除。

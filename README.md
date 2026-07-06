# EWT360 Helper (Fork 分发版)

> 本仓库是 [ZNink/EWT360-Helper](https://github.com/ZNink/EWT360-Helper) 的 fork，在原版基础上增加了 TypeScript 模块化架构和 React Fiber 自动连播等功能。

![ima](/image/ewt_image.png)

## 简介

- **名字**：EWT360 Helper
- **Fork 版本**: 3.0.1
- **原版作者**：[ZNink](https://github.com/ZNink) 、 [Lirzh](https://github.com/lirzh) 、[wesrin2000](https://github.com/wesrin2000)
- **内容概括**：自动连播、自动过认真度检查、自动跳过课程中的选择题、强制倍速
- **要求：** 此脚本仅供学习交流，严禁用于商业用途，若有请于24小时内删除，请不要售卖脚本，此脚本完全免费！！
- **协议**：GPL v2
- **最后更新**：2026.7.6

## 分发说明

本仓库为 [ZNink/EWT360-Helper](https://github.com/ZNink/EWT360-Helper) 的 **fork 版本**，`output` 分支为构建产物分发版本，由 GitHub Actions 自动构建并部署。

- **安装方式**：通过 Tampermonkey 安装 `output` 分支的 `main.user.js`
- **源码**：`main` 分支，基于 TypeScript + Vite 构建
- **自动更新**：脚本内置 `@updateURL` / `@downloadURL` 指向 `output` 分支，Tampermonkey 会自动检测更新
- **与原版差异**：本 fork 版采用 TypeScript 模块化架构，自动连播功能通过 React Fiber 直接操作组件状态实现（详见下方技术说明）

## 技术架构 (v3.x)

v3 版本完全重写，采用 TypeScript 模块化架构：

### 核心模块

| 模块 | 功能 | 技术方案 |
|------|------|----------|
| AutoPlay | 自动连播 | React Fiber dispatch 直接操作状态 |
| AutoSkip | 自动跳过选择题 | DOM 监听 + 按钮检测 |
| AutoCheckPass | 自动过认真度检查 | DOM 监听 + 按钮点击 |
| SpeedControl | 强制倍速 | MSTPlayer API |
| ProgressLock | 锁定进度条 | timeupdate 事件监听 |
| GUI | 控制面板 | DOM 注入 + localStorage 持久化 |

### 自动连播实现原理（React Fiber Dispatch）

EWT360 使用 React 16 构建，视频切换完全由 React 内部状态驱动，不走 URL 路由。所有传统的 click/URL 方式均因 Tampermonkey 沙箱隔离而失效。

**解决方案：通过 React Fiber 树遍历直接操作 useState 的 dispatch 函数。**

```
sidebar item → __reactInternalInstance fiber → 向上遍历 ~14 层
  → 找到包含以下 hooks 的组件：
    - Hook (Array + lessonId) = 视频列表 (videoList)
    - Hook (Object + lessonId + title + contentUrl + dispatch) = 当前选中视频
  → 调用 dispatch(下一个视频对象) 直接切换
```

关键发现：
- EWT360 的视频播放器页面（`homework-play-video`）使用纯 React 状态管理视频选择
- 视频列表存储在 `useState` hook 中（178 项数组）
- 当前选中视频存储在另一个 `useState` hook 中
- 切换视频 = 调用当前视频 hook 的 `dispatch(新视频对象)`
- `ended` 事件 + `checkProgress` 轮询双重触发机制

### 构建

```bash
npm install
npm run build    # 输出到 dist/main.user.js
```

## 使用教程

### PC 端（以 Edge 为例）

1. 在 Edge 插件商店安装 [Tampermonkey](https://microsoftedge.microsoft.com/addons/detail/%E7%AF%A1%E6%94%B9%E7%8C%B4/iikmkjmpaadaobahmlepeloendndfphd)
2. 访问 [脚本安装页](https://www.tampermonkey.net/script_installation.php#url=https://github.com/ZNink/EWT360-Helper/raw/refs/heads/output/main.user.js)
3. 在 Edge 管理插件页面打开**开发人员模式**
4. 在 Edge 油猴插件管理界面打开**允许用户脚本**
5. 访问升学e网通开始使用

### 手机端

1. 下载 Edge / Via / Chrome 等支持油猴的浏览器
2. 安装 Tampermonkey 扩展
3. 启用**开发人员模式**和**允许用户脚本**
4. 复制 `main.user.js` 内容到 Tampermonkey 新建脚本中保存
5. 使用浏览器访问升学e网通（点击"查看桌面网站"）

### 注意事项

- **锁定进度条**关闭时调整进度条会影响课程完成度
- 不要使用百度、UC、夸克等浏览器
- 不要使用升学e网通 App，使用网页版

## 版本列表

| 时间 | 版本号 | 描述 |
|------|--------|------|
| 2026.07.06 | 3.0.1 | TypeScript 重写，React Fiber dispatch 连播 |
| 2026.05.09 | 2.5.0 | 增加进度条锁定功能 |
| 2026.04.18 | 2.4.2 | 可切换进度条85%连播和看完连播 |
| 2026.02.27 | 2.4.1 | 更改为播放85%进度自动连播 |
| 2026.02.27 | 2.4.0 | 更新视频播放80%进度自动连播 |
| 2026.02.14 | 2.3.1 | 简化跳题模块代码，适配部分路径 |
| 2026.02.12 | 2.3.0 | 简化、清理部分代码，增加 GUI 保活机制 |
| 2026.02.11 | 2.2.0 | 自动保存配置、初次使用提示遮罩 |
| 2026.02.09 | 2.1.0 | 更新匹配模式，增加调试输出 |
| 2025.10.05 | 2.0.0 | 重构，适配新版E网通 |
| 2025.08.24 | 1.7.0 | 支持油猴脚本自动更新，小屏设备适配，UI优化 |
| 2025.08.05 | 1.6.0 | 新增提示音控制 |
| 2025.08.04 | 1.5.0 | 挂机模式支持修改自动跳过科目 |
| 2025.07.27 | 1.4.0 | 新增挂机模式 |
| 2025.07.23 | 1.3.0 | 倍速自动维持，新增模式切换功能 |
| 2025.07.23 | 1.2.0 | 去掉小贴士，增加1到16倍速播放 |
| 2025.07.22 | 1.1.0 | 增加跳过选择题、小贴士 |
| 2025.02.08 | 0.9.6 | 初代版本（过检、连播） |

## 鸣谢

[ZNink](https://github.com/ZNink) 、[Lirzh](https://github.com/lirzh)、[wesrin2000](https://github.com/wesrin2000)

[Kimi](https://www.kimi.com) 和 [豆包AI](https://doubao.com)

## 免责声明

您使用本脚本前，理解并同意：我们无法预测您的行为，因此您必须为您滥用脚本而违反相关法律法规的行为负有全部法律责任

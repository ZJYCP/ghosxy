# Ghosxy

**Ghosxy** 是一个现代化的、可高度定制的本地优先 **AI 流量拦截与转发器**。

它作为一个专门针对 LLM API 流量设计的中间人（MITM）代理工具，通过动态生成 SSL 证书并修改系统 Hosts 文件，Ghosxy 能够无缝拦截发往 `api.openai.com`（或其他任何 AI 服务商）的请求，并将其智能路由到你本地的模型（如 Ollama, LM Studio）或其他自定义的 API 渠道。

> **注意：** 本工具需要修改系统网络设置（Hosts 文件）并安装根证书。请务必阅读底部的 [免责声明](https://www.google.com/search?q=%23%E5%85%8D%E8%B4%A3%E5%A3%B0%E6%98%8E)。

---

## ✨ 核心特性

- **🔒 HTTPS 解密拦截**：内置基于 `node-forge` 的动态证书生成引擎，可解密并分析加密的 SSL 流量。
- **🔀 智能路由系统**：
  - **基于 SNI 的路由**：根据客户端请求的域名（Hostname）自动识别并分流。
  - **模型映射 (Model Mapping)**：支持实时修改请求体，例如将发往 `gpt-4` 的请求透明转换为 `llama3-70b`。
- **🛠 深度系统集成**：
  - **自动化 Hosts 管理**：自动注入/清理指向 `127.0.0.1` 的 Hosts 映射（完美支持 IPv4/IPv6 双栈）。
  - **根证书管理**：提供一键安装/卸载根证书（Root CA）到系统信任库的功能。
- **🔌 多渠道支持**：统一管理多个上游服务商（OpenAI, Anthropic, 自定义本地 LLM 等）。
- **📊 实时日志控制台**：内置终端风格的日志查看器，支持实时监控流量状态、错误信息及转发详情。
- **🎨 现代化 UI**：基于 React 19、Shadcn UI 和 Tailwind CSS 构建。完美支持 **深色/浅色 (Dark/Light)** 主题切换。
- **🌍 国际化支持**：原生支持 英文 (English) 和 简体中文。

---

## 📸 界面预览

![Dashboard Preview](docs/images/dashboard.png)

|    仪表盘 (Dashboard)    | 转发规则 (Forwarding Rules)  |
| :----------------------: | :--------------------------: |
|                          |                              |
| _系统状态概览与快捷开关_ | _配置流量拦截与模型映射逻辑_ |

| 服务提供商 (Providers) | 实时日志 (Real-time Logs) |
| :--------------------: | :-----------------------: |
|                        |                           |
|  _管理上游 API 渠道_   |     _流量调试与监控_      |

---

## 🛠 技术栈

- **运行时**: [Electron](https://www.electronjs.org/) (多进程架构)
- **前端**: React 19, [Shadcn UI](https://ui.shadcn.com/), Tailwind CSS, Lucide Icons
- **构建工具**: [Electron-Vite](https://electron-vite.org/)
- **核心库**:
  - `http-proxy`: 高性能流量转发。
  - `node-forge`: PKI 基础设施与 SSL 证书生成。
  - `sudo-prompt`: 提权执行系统级操作（Hosts/证书管理）。
  - `electron-store`: 本地数据持久化与配置管理。
  - `i18next`: 国际化方案。

---

## 🚀 快速开始

### 环境要求

- Node.js (推荐 v18 或更高版本)
- npm 或 pnpm
- **操作系统**: Windows 10/11 或 macOS (Linux 支持处于实验阶段)

### 安装步骤

1.  **克隆仓库**

    ```bash
    git clone https://github.com/your-username/ghosxy.git
    cd ghosxy
    ```

2.  **安装依赖**

    ```bash
    npm install
    ```

3.  **启动开发服务器**

    ```bash
    # 注意：在 Windows 上，建议以“管理员身份”运行终端，
    # 以便在开发过程中有权限修改 Hosts 文件。
    npm run dev
    ```

4.  **打包构建**

    ```bash
    npm run build
    # 构建产物将位于 `dist` 或 `release` 目录中
    ```

---

## 📖 使用指南

1.  **信任证书**:
    - 在 **仪表盘 (Dashboard)** 页面的“系统信任”卡片中。
    - 点击 **"安装到系统信任库" (Install to System Trust)**。这是让浏览器和客户端信任代理拦截的关键步骤。
2.  **添加服务渠道**:
    - 进入 **服务提供商 (Providers)** 页面。
    - 添加你的目标服务（例如本地的 Ollama 服务 `http://localhost:11434/v1`）。
3.  **配置转发规则**:
    - 进入 **转发规则 (Rules)** 页面。
    - 创建规则：源地址 `api.openai.com` -\> 目标渠道 `My Local Ollama`。
    - (可选) 添加模型映射：将请求中的 `gpt-3.5-turbo` 映射为 `mistral`。
4.  **启动拦截**:
    - 回到 **仪表盘**。
    - 打开 **总开关 (Master Switch)**。
    - Ghosxy 会自动修改 Hosts 文件，将 `api.openai.com` 指向 `127.0.0.1`。
5.  **测试验证**:
    - 打开终端尝试请求：`curl https://api.openai.com/v1/models`
    - 查看 Ghosxy 的 **运行日志 (Logs)** 标签页，观察请求是否被成功捕获并转发。

---

## 🏗 项目架构

Ghosxy 在 Electron 主进程中遵循面向服务（Service-Oriented）的架构设计，以保持代码的清晰和可维护性。

```text
src/
├── main/                 # 后端 (Node.js)
│   ├── index.ts          # 入口文件 & IPC 路由
│   └── services/
│       ├── ProxyService  # 支持 SNI 的 HTTPS 服务器 & 路由逻辑
│       ├── CertService   # CA 生成 & 域名证书动态签发
│       ├── HostsService  # 通过 sudo 修改 /etc/hosts
│       ├── StoreService  # 基于 JSON 的持久化存储 (CRUD)
│       └── LogService    # 文件日志 & 前端实时推送
├── renderer/             # 前端 (React)
│   ├── src/
│   │   ├── pages/        # 仪表盘, 规则, 日志等页面
│   │   ├── components/   # 可复用的 Shadcn 组件
│   │   └── api/          # IPC 通信封装
└── preload/              # 上下文桥接 (安全沙箱)
```

---

## 🤝 参与贡献

非常欢迎社区贡献！请遵循以下步骤：

1.  Fork 本项目。
2.  创建你的特性分支 (`git checkout -b feature/AmazingFeature`)。
3.  提交你的修改 (`git commit -m 'Add some AmazingFeature'`)。
4.  推送到分支 (`git push origin feature/AmazingFeature`)。
5.  开启一个 Pull Request。

---

## ⚠️ 免责声明

**在使用本工具前，请仔细阅读：**

1.  **安全性**：本工具会在你的系统中安装一个自签名的根证书颁发机构 (Root CA)。虽然私钥仅在本地生成且不会离开你的设备，但安装自定义根证书理论上会增加系统被中间人攻击的风险面。**建议在不使用时，通过仪表盘卸载该证书。**
2.  **系统文件**：本工具会修改系统的 `hosts` 文件。虽然程序包含自动清理逻辑，但意外崩溃可能导致残留记录。如果遇到网络问题，你可以手动检查并清理 `C:\Windows\System32\drivers\etc\hosts` (Windows) 或 `/etc/hosts` (macOS/Linux)。
3.  **使用用途**：本软件仅供**学习、研究和开发测试**使用。请勿用于拦截你不拥有或未获授权的网络流量。

---

## 📄 许可证

本项目基于 MIT 许可证分发。详情请参阅 `LICENSE` 文件。

# Ghosxy

> English Version | [中文版](./README.md)

**Ghosxy** is a modern, highly customizable, local-first **AI traffic interceptor and forwarder**.

As a specialized Man-in-the-Middle (MITM) proxy tool designed for LLM API traffic, Ghosxy seamlessly intercepts requests to `api.openai.com` (or any other AI service provider) and intelligently routes them to your local models (such as Ollama, LM Studio) or other custom API channels by dynamically generating SSL certificates and modifying the system Hosts file.

> **Warning:** This tool requires modifying system network settings (Hosts file) and installing a root certificate. Please read the [Disclaimer](#disclaimer) at the bottom carefully.

---

## ✨ Core Features

- **🔒 HTTPS Decryption & Interception**: Built-in dynamic certificate generation engine based on `node-forge` to decrypt and analyze encrypted SSL traffic
- **🔀 Intelligent Routing System**:
  - **SNI-based Routing**: Automatically identifies and routes traffic based on client-requested domain names (Hostname)
  - **Model Mapping**: Real-time request body modification, e.g., transparently converting `gpt-4` requests to `llama3-70b`
- **🛠 Deep System Integration**:
  - **Automated Hosts Management**: Automatically injects/cleans Hosts mappings pointing to `127.0.0.1` (supports IPv4/IPv6 dual stack)
  - **Root Certificate Management**: One-click install/uninstall of Root CA to system trust store (Windows/macOS/Linux)
- **🔌 Multi-Provider Support**: Unified management of multiple upstream service providers (OpenAI, Anthropic, custom local LLMs, etc.)
- **📊 Real-time Log Console**: Built-in terminal-style log viewer for real-time monitoring of traffic status, errors, and forwarding details
- **🎨 Modern UI**: Built with React 19, Shadcn UI, and Tailwind CSS 4. Perfect support for **Dark/Light** theme switching
- **🌍 Internationalization**: Native support for English and Simplified Chinese, powered by i18next

---

## 📸 Screenshots

![Dashboard Preview](docs/images/dashboard.png)

|       Dashboard       |     Forwarding Rules      |
| :-------------------: | :-----------------------: |
|                       |                           |
| _System Status & Controls_ | _Traffic Interception & Model Mapping_ |

|      Providers       |    Real-time Logs    |
| :------------------: | :------------------: |
|                      |                      |
| _Manage Upstream API Channels_ | _Traffic Debugging & Monitoring_ |

---

## 🛠 Tech Stack

### Core Framework
- **Runtime**: [Electron](https://www.electronjs.org/) 38.1.2 (Multi-process architecture)
- **Frontend**: React 19.2.0, TypeScript 5.9.2
- **UI Components**: [Shadcn UI](https://ui.shadcn.com/) + Radix UI
- **Styling**: Tailwind CSS 4.1.17, Lucide Icons, class-variance-authority
- **Build Tools**: [Electron-Vite](https://electron-vite.org/) 4.0.1, Vite 7.1.6

### Core Dependencies
- **Proxy Service**: `http-proxy` 1.18.1 - High-performance HTTP/HTTPS traffic forwarding
- **PKI Infrastructure**: `node-forge` 1.3.1 - SSL certificate generation and signing
- **System Integration**: `sudo-prompt` 9.2.1 - Elevated execution of system-level operations
- **Data Persistence**: `electron-store` 8.2.0 - Local configuration management
- **Logging System**: `electron-log` 5.4.3 - File logging and console output
- **Internationalization**: `i18next` 25.6.3 + `react-i18next` 16.3.5
- **Theme System**: `next-themes` 0.4.6 - Dark/Light mode switching

### Development Tools
- **Code Quality**: ESLint 9 + Prettier 3
- **Type Checking**: TypeScript (strict mode)
- **Packaging**: electron-builder 25.1.8

---

## 🚀 Quick Start

### Requirements

- **Node.js**: v18.0.0 or higher (LTS recommended)
- **Package Manager**: npm or pnpm
- **Operating System**: Windows 10/11, macOS 10.13+, Linux (experimental support)
- **Permissions**: Administrator/root privileges required for modifying Hosts file and installing certificates

### Installation Steps

1.  **Clone the repository**

    ```bash
    git clone https://github.com/your-username/ghosxy.git
    cd ghosxy
    ```

2.  **Install dependencies**

    ```bash
    npm install
    ```

3.  **Start development server**

    ```bash
    # Note: On Windows, it's recommended to run the terminal as Administrator
    # to have permissions to modify the Hosts file during development.
    npm run dev
    ```

4.  **Type checking**

    ```bash
    npm run typecheck
    ```

5.  **Code formatting**

    ```bash
    npm run format
    npm run lint
    ```

6.  **Build for production**

    ```bash
    npm run build
    ```

7.  **Package as executable**

    ```bash
    npm run build:win   # Windows (.exe)
    npm run build:mac   # macOS (.dmg)
    npm run build:linux # Linux (.AppImage)
    ```

---

## 📖 User Guide

### Initial Setup

1.  **Install and trust root certificate**:
    - Navigate to the **Dashboard** page and find the "System Trust" card
    - Click **"Install to System Trust"**
    - A permission request dialog will appear, click "Yes" to grant permission
    - This is a critical step to make browsers and clients trust the proxy interception

2.  **Add service providers**:
    - Go to the **Providers** page
    - Click the "Add Provider" button
    - Configuration example:
      - **Name**: My Local Ollama
      - **Type**: Custom
      - **Base URL**: `http://localhost:11434/v1`
      - **API Key**: (optional, usually not needed for local services)

3.  **Configure forwarding rules**:
    - Go to the **Rules** page
    - Click the "New Rule" button
    - Configuration example:
      - **Source Host**: `api.openai.com`
      - **Target Provider**: Select "My Local Ollama"
      - **Model Mapping** (optional):
        - Source Model: `gpt-3.5-turbo`
        - Target Model: `mistral:latest`
    - Enable the rule switch

4.  **Start proxy service**:
    - Return to the **Dashboard**
    - Toggle the **"Master Switch"** on
    - The system will automatically:
      - Start the HTTPS proxy server (port 443)
      - Modify the Hosts file to point `api.openai.com` to `127.0.0.1`
      - Display the running status indicator

### Testing & Verification

Run the following command in your terminal to test if interception is working:

```bash
# Test /v1/models endpoint
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer your-api-key"
```

Check the **Logs** tab, you should see:
- Request successfully intercepted
- Source domain and target provider information
- Model mapping conversion record (if configured)
- Final response status code

### Common Operations

- **Temporarily disable interception**: Turn off the master switch on the Dashboard, Hosts entries will be automatically cleaned
- **View real-time logs**: See all traffic records in the Logs page
- **Uninstall certificate**: Click the "Uninstall" button in the System Trust card
- **Export configuration**: Configuration file is located at `~/.config/ghosxy/config.json`

---

## 🏗 Project Architecture

Ghosxy adopts Electron's multi-process architecture and follows a Service-Oriented design pattern:

```text
src/
├── main/                     # Main Process (Node.js)
│   ├── index.ts              # App entry & IPC route registration
│   └── services/
│       ├── ProxyService.ts   # HTTPS proxy server & SNI routing
│       ├── CertService.ts    # CA generation & dynamic domain cert signing
│       ├── HostsService.ts   # Hosts file read/write (via sudo)
│       ├── StoreService.ts   # Data persistence (Providers, Rules)
│       ├── LogService.ts     # Log collection & IPC real-time push
│       └── SystemTrust.ts    # Certificate system trust management (cross-platform)
├── renderer/                 # Renderer Process (React)
│   ├── src/
│   │   ├── pages/            # Page components
│   │   │   ├── Home.tsx      # Dashboard
│   │   │   ├── Providers.tsx # Provider management
│   │   │   ├── Rules.tsx     # Rule configuration
│   │   │   ├── Settings.tsx  # App settings
│   │   │   └── Logs.tsx      # Log viewer
│   │   ├── components/       # UI components (Shadcn UI)
│   │   ├── locales/          # Internationalization resources
│   │   │   ├── en.json       # English translations
│   │   │   └── zh.json       # Chinese translations
│   │   └── lib/              # Utility functions
│   └── index.html            # HTML entry
├── preload/                  # Preload Scripts
│   └── index.ts              # IPC security bridge (contextBridge)
├── shared/                   # Cross-process shared code
│   └── types.ts              # TypeScript type definitions
└── resources/                # Packaging resources
    ├── icon.png              # App icon
    └── hosts-helper.js       # Hosts modification script
```

### Core Services

| Service | Responsibility | Key Technologies |
|---------|----------------|------------------|
| **ProxyService** | Start HTTPS server, parse SNI, route requests to target Provider | `http-proxy`, `https` |
| **CertService** | Generate self-signed CA, dynamically issue server certificates for each domain | `node-forge` |
| **HostsService** | Read, modify, restore system Hosts file | `sudo-prompt`, `fs` |
| **StoreService** | CRUD operations for managing Providers and Rules | `electron-store` |
| **LogService** | Collect logs and push to frontend via IPC | `electron-log` |
| **SystemTrust** | Cross-platform install/uninstall of root certificate to system trust store | `certutil`(Win), `security`(Mac) |

---

## 🔧 Developer Guide

### Project Scripts

```bash
npm run dev          # Start development mode (hot reload)
npm run build        # Compile production build
npm run typecheck    # TypeScript type checking
npm run lint         # ESLint code checking
npm run format       # Prettier code formatting
npm run build:win    # Package for Windows
npm run build:mac    # Package for macOS
npm run build:linux  # Package for Linux
```

### Adding New Features

1. **Add new provider types**:
   - Modify the `Provider` interface in `src/shared/types.ts`
   - Update validation logic in `StoreService`
   - Add UI form in the Providers page

2. **Extend model mapping rules**:
   - Add new fields to the `Rule` interface
   - Modify request processing logic in `ProxyService.handleRequest()`
   - Update form components in the Rules page

3. **Add new pages**:
   - Create new component in `src/renderer/src/pages/`
   - Register route in `App.tsx`
   - Add navigation link in the sidebar

4. **Multi-language translations**:
   - Edit `src/renderer/src/locales/en.json` and `zh.json`
   - Use the `useTranslation()` Hook in components

### Debugging Tips

- **Main process logs**: Check `electron-log` output file (can be opened from the Logs page)
- **Renderer process logs**: Open Chrome DevTools (Ctrl+Shift+I / Cmd+Option+I)
- **IPC communication debugging**: Add `log.info()` in IPC handlers in `src/main/index.ts`
- **Network request monitoring**: Use Wireshark or Charles to view actual traffic

---

## 🤝 Contributing

Community contributions are very welcome! Whether it's bug fixes, new feature suggestions, or documentation improvements.

### Contribution Workflow

1.  Fork this project to your GitHub account
2.  Create a feature branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your changes (`git commit -m 'feat: Add some AmazingFeature'`)
4.  Push to the branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

### Code Standards

- Follow ESLint and Prettier configuration
- Use Conventional Commits format for commit messages
- Add JSDoc comments for public APIs
- Run `npm run typecheck` and `npm run lint` before committing

---

## 📋 FAQ

### 1. Why are administrator privileges required?

Modifying the system Hosts file and installing root certificates requires system-level permissions. The app will request them via `sudo-prompt` popup, only when necessary.

### 2. How to fix "NET::ERR_CERT_AUTHORITY_INVALID" certificate error?

This indicates the root certificate is not trusted by the system:
- Click the "Install to System Trust" button on the Dashboard
- On Windows, ensure the certificate is imported to "Trusted Root Certification Authorities"
- On macOS, open "Keychain Access", find Ghosxy CA, and set to "Always Trust"
- Restart your browser or application for the certificate to take effect

### 3. How is macOS and Linux support implemented?

The current version includes cross-platform support:
- **Windows**: Uses `certutil.exe` to manage certificates
- **macOS**: Uses `security` command to manage certificates
- **Linux**: Uses `update-ca-certificates` (Debian/Ubuntu) or `update-ca-trust` (RHEL/Fedora)

If you encounter issues, please report your system version in GitHub Issues.

### 4. Where are log files saved?

Click the "Open Log Folder" button on the Logs page, or manually find:
- **Windows**: `%APPDATA%\ghosxy\logs\`
- **macOS**: `~/Library/Logs/ghosxy/`
- **Linux**: `~/.config/ghosxy/logs/`

### 5. How to debug IPC communication failures?

Add logging in the IPC handlers in the main process (`src/main/index.ts`):
```typescript
ipcMain.handle('your-channel', async (event, args) => {
  log.info('IPC called:', 'your-channel', args)
  // your logic
})
```

### 6. Can non-HTTPS traffic be intercepted?

The current version is primarily designed for HTTPS traffic. HTTP traffic can be supported by modifying `ProxyService` to add an HTTP server, but certificate management is not required.

---

## ⚠️ Disclaimer

**Please read carefully before using this tool:**

1.  **Security**: This tool will install a self-signed Root Certificate Authority (Root CA) in your system. Although the private key is generated locally and never leaves your device, installing a custom root certificate theoretically increases the risk surface for man-in-the-middle attacks. **It is strongly recommended to uninstall the certificate via the Dashboard when not in use.**

2.  **System Files**: This tool modifies the system `hosts` file. Although the program includes automatic cleanup logic, unexpected crashes may result in residual entries. If you encounter network issues, you can manually check and clean:
    - Windows: `C:\Windows\System32\drivers\etc\hosts`
    - macOS/Linux: `/etc/hosts`

3.  **Intended Use**: This software is for **learning, research, and development testing** purposes only. Do not use it to intercept network traffic you don't own or are not authorized to access. Any legal liability arising from using this tool is borne by the user.

4.  **Privacy Protection**: This tool does not collect, upload, or share any user data. All configuration and log files are stored locally.

---

## 📄 License

This project is distributed under the MIT License. See the [LICENSE](./LICENSE) file for details.

---

## 🔗 Resources

- [Electron Official Documentation](https://www.electronjs.org/docs)
- [Shadcn UI Component Library](https://ui.shadcn.com/)
- [node-forge PKI Documentation](https://github.com/digitalbazaar/forge)
- [http-proxy Guide](https://github.com/http-party/node-http-proxy)
- [i18next Internationalization Guide](https://www.i18next.com/)

---

## 💬 Get Help

- **Bug Reports**: [GitHub Issues](https://github.com/your-username/ghosxy/issues)
- **Feature Requests**: [GitHub Discussions](https://github.com/your-username/ghosxy/discussions)
- **Contribute Code**: See [Contributing Guide](#contributing)

---

**Happy Proxying! 🚀**

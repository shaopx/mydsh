# 桌面程序编译运行说明

这份说明给另一台电脑上的 agent 使用。目标是在 Mac 上编译并运行 Mac 桌面程序，在 Windows 上编译并运行 Windows 桌面程序。

仓库：`https://github.com/shaopx/mydsh`

产品安装包的文件名仍然带 `deepseek-harness`。仓库名是 `mydsh`，内部包名仍是 `@deepseek-ai/dsh-*`。

不能交叉编译。Mac 安装包只能在 Mac 上打，Windows 安装包只能在 Windows x64 上打。Linux 和 WSL 不能打出本说明里的桌面安装包。

打包过程不登录 DeepSeek 账号，也不调用在线模型。第一次打开程序时，如果还没有模型密钥，欢迎页会要求填写 API key。

## 先选一条路径

| 目的 | 命令 | 结果 |
|---|---|---|
| 改代码后马上看窗口 | `pnpm run dev:desktop` | 开发用 Electron 窗口，不产出安装包 |
| 产出可拷走的安装包 | 下面的 `package:desktop:*:unsigned` | Mac 得到 DMG，Windows 得到 EXE |

两条路径都从仓库根目录执行。先做安装包前的检查，检查通过后再做完整打包。

## 每台机器都要满足的条件

1. 安装 Node.js 24.9.0 或更新的 24，也可以用 25 或 26。官方安装包才带 Corepack。
2. 启用仓库锁定的 pnpm：

```sh
node -v
corepack enable
corepack prepare pnpm@11.28.5 --activate
pnpm -v
```

`pnpm -v` 必须打印 `11.28.5`。不要改用别的 pnpm 版本。

3. 安装 Git 2.26 或更新版本。
4. 能访问 `registry.npmjs.org`、GitHub Releases 和 `nodejs.org`。第一次打包会下载 Electron、Node 和 Python 运行时。公司网络需要代理时，在同一个终端里设置 `HTTPS_PROXY` 和 `HTTP_PROXY`，再执行后面的命令。
5. 源码、依赖和工具链放在本机文件系统。Windows 不要把仓库放在 WSL 的 Linux 目录里再从 Windows 编译。

克隆：

```sh
git clone https://github.com/shaopx/mydsh.git
cd mydsh
pnpm install --frozen-lockfile
```

`pnpm install` 会安装依赖并配置本仓库的 Git 钩子。不要删除 `pnpm-lock.yaml`。

## Mac

在终端确认芯片：

```sh
uname -m
node -v
pnpm -v
```

- `arm64`：使用 Apple 芯片命令。
- `x86_64`：使用 Intel 命令。Apple 芯片上打 Intel 包还需要已安装 Rosetta。

### 只检查，不打包

Apple 芯片：

```sh
pnpm run package:desktop:mac:arm64:unsigned -- --check
```

Intel：

```sh
pnpm run package:desktop:mac:x64:unsigned -- --check
```

这条命令不读 `apps/desktop/.env.macos`，不需要 Apple 账号、证书或更新服务器。退出码为 0 再继续。

### 打出 DMG

Apple 芯片：

```sh
pnpm run package:desktop:mac:arm64:unsigned
```

Intel：

```sh
pnpm run package:desktop:mac:x64:unsigned
```

成功时，命令在最后打印一行 `DMG:`，后面是 DMG 的绝对路径。文件也在：

```text
apps/desktop/.desktop-build/targets/mac-arm64/unsigned-artifacts/deepseek-harness-<版本>-mac-arm64-unsigned.dmg
apps/desktop/.desktop-build/targets/mac-x64/unsigned-artifacts/deepseek-harness-<版本>-mac-x64-unsigned.dmg
```

`<版本>` 来自仓库根目录 `package.json` 的 `version`。写这份说明时该字段是 `0.2.2-rc.3`。以命令打印的 `DMG:` 路径为准。

这个 DMG 没有 Apple 公证。应用标识是 `com.deepseek.harness`。Electron 只有本机临时签名。打开时如果系统拦截，到「系统设置 → 隐私与安全性」里允许打开，或在 Finder 里对应用按住 Control 再选择打开。不要用带公证的发布命令代替这条未签名命令。

未签名 Mac 包不包含 Computer Use 辅助程序。准备 Computer Use 时会报告缺少该程序。数据分析、写代码和本地文件不依赖它。

### 在 Mac 上直接运行开发窗口

不需要先打 DMG：

```sh
pnpm run dev:desktop
```

出现桌面窗口即表示开发运行成功。这个窗口使用仓库里的当前代码。它的会话和设置默认在：

```text
apps/desktop/.desktop-build/development/home
```

不写入用户日常的 `~/.dsh`。设置 `DSH_HOME` 只会换掉这个开发用的数据目录。

已经编译过、只想再打开窗口时：

```sh
pnpm run start:desktop
```

`start:desktop` 不会重新编译源码。

## Windows

必须是 Windows x64。在 PowerShell 里确认：

```powershell
node -v
pnpm -v
[Environment]::Is64BitOperatingSystem
```

第三行必须是 `True`。ARM Windows 不在本说明的打包范围内。

另外安装这些工具，并保证它们在执行打包的同一个终端里可用：

- Git
- PowerShell 7，命令名是 `pwsh`，不是 Windows PowerShell 5 的 `powershell`
- `tar`
- Python。如果 `python` 不在 `PATH` 里，设置环境变量 `PYTHON` 为 `python.exe` 的绝对路径
- Visual Studio 的「使用 C++ 的桌面开发」，其中包含组件 `Microsoft.VisualStudio.Component.VC.Tools.x86.x64`，以及 Windows SDK

打包前的工具检查会调用 `vswhere`，确认上述 C++ 组件存在，并实际用 `tar` 打一个小包。缺任意一项时，检查命令会失败并写出工具名。

### 写入 Windows 配置

在仓库里创建 `apps/desktop/.env.windows`。这个文件已被 Git 忽略，不要提交它。内容使用 UTF-8。最小内容：

```text
DSH_DESKTOP_APP_ID=com.mydsh.desktop
DSH_DESKTOP_AUTO_UPDATE_ENV=test
DSH_DESKTOP_MANDATORY_UPDATE_TEST_ORIGIN=https://updates.example.com
DSH_DESKTOP_MANDATORY_UPDATE_CONFIG={"allowedAuthOrigins":["https://login.example.com"]}
```

这四个字段是配置检查要读的。两个地址必须是 `https://` 开头、没有用户名、密码、路径、问号或井号的源。未签名安装包不会把更新上传到这两个地址。签名用的证书、SignTool 和 PIN 留空，未签名命令不会读取它们。

`DSH_DESKTOP_APP_ID` 必须是至少两段的反向域名。Mac 的未签名包不读这个文件，应用标识仍是 `com.deepseek.harness`。

### 只检查，不打包

在仓库根目录：

```powershell
pnpm run package:desktop:win:x64:unsigned -- --check
```

退出码为 0 再继续。失败时先看缺的是 Node、pnpm、`tar`、Visual C++ 工具，还是 `.env.windows` 的字段。

### 打出安装程序

```powershell
pnpm run package:desktop:win:x64:unsigned
```

成功后，安装程序在：

```text
apps\desktop\.desktop-build\targets\win-x64\unsigned-artifacts\deepseek-harness-<版本>-win-x64-unsigned.exe
```

阶段日志在 `apps\desktop\.desktop-build\packaging-runs\`。不要运行不带 `:unsigned` 的 `package:desktop:win:x64`，那条命令要求 Windows 硬件签名证书。

安装这个 EXE。Windows 可能显示 SmartScreen，因为文件没有正式签名。确认发行者提示后选择仍要运行。安装后从开始菜单打开程序。

### 在 Windows 上直接运行开发窗口

配置文件可以先不写。在仓库根目录：

```powershell
pnpm run dev:desktop
```

出现桌面窗口即表示开发运行成功。开发数据同样在 `apps\desktop\.desktop-build\development\home`，不写入用户日常的 Harness 主目录。

## 打包失败时

1. 看刚才那条命令的退出码和最后几十行。
2. 打开 `apps/desktop/.desktop-build/packaging-runs/` 里最新一次运行的 `stderr.log`。
3. 依赖下载失败时，确认这台机器能访问 npm、GitHub Releases 和 nodejs.org，或已经设置 `HTTPS_PROXY`。国内镜像只通过环境变量 `DSH_DESKTOP_NPM_REGISTRY` 指定，例如 `https://registry.npmmirror.com`。不要改锁文件来换源。
4. Mac 上如果打的是另一种芯片的包，换成本机 `uname -m` 对应的那条命令。
5. Windows 上如果提示找不到 Visual C++，安装上面的 VS 组件后重新打开终端，再跑 `--check`。

## 完成后回报这些事实

另一台机器上的 agent 做完后，只回报实际观察到的内容：

- 操作系统和 `uname -m` 或 Windows 架构
- `node -v` 和 `pnpm -v`
- 执行的完整命令和退出码
- `DMG:` 那一行，或 EXE 的完整路径
- 窗口是否打开
- 如果失败：命令的最后错误，以及 `packaging-runs` 里对应的原因

不要把 API key、`.env.windows` 以外的证书，或 Git 远程地址里的令牌写进回报。

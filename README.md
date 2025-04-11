# JSON处理工具

<div align="center">
  <img src="src-tauri/icons/128x128.png" alt="JSON处理工具图标" width="128" height="128">
</div>

一个基于 Tauri 2.0 构建的JSON编辑和处理工具，集成了vanilla-jsoneditor组件，支持JSON数据的编辑、格式化和编辑。

## 应用截图

<div align="center">
  <img src="screenshots/app.png" alt="应用截图" width="800">
</div>

## 功能特点

- ✨ 基于强大的vanilla-jsoneditor组件的JSON编辑器
- 📊 一键将JSON数据导出为Excel文件【规划中】
- 💪 基于Tauri 2.0，提供跨平台支持（Windows、macOS、Linux）
- 🚀 原生性能体验，轻量快速
- 🔍 直观的JSON数据可视化

## 技术栈

- **前端**：React、TypeScript、Ant Design
- **后端**：Rust（Tauri）
- **编辑器组件**：vanilla-jsoneditor (由svelte-jsoneditor提供)
- **Excel处理**：xlsxwriter (Rust) 【规划中】


## 安装和使用

### 从源码构建

1. 确保你已安装以下依赖：
   - Node.js (>= 16)
   - Rust (>= 1.70)
   - Tauri CLI

2. 克隆仓库并安装依赖：

```bash
git clone <repository-url>
cd develop-tool
npm install
```

3. 开发模式运行：

```bash
npm run tauri dev
```

4. 构建生产版本：

```bash
npm run tauri build
```

## 使用指南

1. **编辑JSON**：在编辑器区域直接编辑或粘贴JSON数据
2. **导出Excel**：点击工具栏中的"导出Excel"按钮，选择保存位置即可【规划中】

## 主要功能实现

### JSON编辑器

本应用使用vanilla-jsoneditor组件提供JSON编辑功能，支持以下特性：

- 树状视图和文本视图切换
- 语法高亮
- 自动格式化
- 错误验证

### JSON转Excel【规划中】

规划使用Rust的xlsxwriter库实现JSON到Excel的转换：

- 自动识别JSON数组中的键作为表头
- 将JSON数组数据映射为Excel表格行
- 支持各种数据类型转换

## 项目结构

```
develop-tool/
├── src/                      # 前端源码
│   ├── App.tsx               # 主应用组件
│   ├── VanillaJSONEditor.tsx # JSON编辑器组件封装
│   └── ...
├── src-tauri/                # Tauri/Rust后端代码
│   ├── src/
│   │   └── main.rs           # 主Rust代码（含JSON转Excel实现）
│   ├── icons/                # 应用图标资源
│   │   ├── 32x32.png         # 各种尺寸的应用图标
│   │   ├── 128x128.png
│   │   ├── icon.icns         # macOS图标
│   │   └── icon.ico          # Windows图标
│   ├── Cargo.toml            # Rust依赖管理
│   └── tauri.conf.json       # Tauri配置
├── screenshots/              # 应用截图（用于README展示）
└── package.json              # 前端依赖管理
```

## 应用图标

本应用使用了精美的图标资源，主要包括以下格式：

- **Windows**: icon.ico 和各种尺寸的 Square*.png
- **macOS**: icon.icns
- **Linux/通用**: 各种尺寸的PNG图标 (32x32.png, 128x128.png, 128x128@2x.png 等)

这些图标位于 `src-tauri/icons/` 目录中，可以根据需要进行自定义替换。

## 许可证

本项目采用 [MIT 许可证](LICENSE)。

MIT许可证是一种宽松的软件许可证，简单来说：

- ✅ 可以自由使用、复制、修改、合并、发布、分发、再许可及销售本软件的副本
- ✅ 可以用于商业用途
- ✅ 可以修改源代码并保持私有
- ⚠️ 唯一的限制是必须在所有副本中包含上述版权声明和许可声明

详细条款请查看 [LICENSE](LICENSE) 文件。

## 贡献指南

我们非常欢迎并感谢所有形式的贡献！如果您想为本项目做出贡献，请遵循以下步骤：

1. Fork 本仓库
2. 创建您的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交您的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开一个 Pull Request

### 贡献类型

您可以通过多种方式为项目做出贡献：

- 🐛 报告bug
- 💡 提出新功能或改进建议
- 🔍 审查代码
- 📝 改进文档
- 💻 提交代码

## 鸣谢

- [Tauri](https://tauri.app/) - 提供桌面应用程序框架
- [vanilla-jsoneditor](https://github.com/josdejong/svelte-jsoneditor) - 提供强大的JSON编辑功能
- [xlsxwriter](https://github.com/informationsea/xlsxwriter-rs) - 提供Excel文件创建功能

## 联系与支持

如果您在使用过程中遇到任何问题或有任何建议，请通过以下方式联系我们：

- 提交 [Issues](https://github.com/您的用户名/develop-tool/issues)
- 发送邮件至：[您的邮箱]
- 加入QQ群：[QQ群号]

我们会尽快回复您的问题和建议。

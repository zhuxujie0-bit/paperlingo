# PaperLingo Android（vivo）项目骨架

已用 Capacitor 生成原生 Android 工程：`android/`。

## 当前真实状态

- 可将现有 React 阅读界面同步进 Android WebView。
- 当前 Mac 没有 Java / Android SDK，因此**尚未生成 APK**。
- Kimi 密钥没有、也绝不会写进 APK。

## 重要边界

网页版本的 `/api/dictionary/lookup`、`/api/pronounce`、`/api/kimi/*` 目前依赖 Mac 上的本机 Express 服务。vivo 平板安装 APK 后不能访问 `127.0.0.1` 的 Mac 服务。

做成真正独立 APK 时需要：

1. 将完整 ECDICT 转成 Android 本地 SQLite；
2. 用 Android TextToSpeech 代替 macOS `say`；
3. Kimi 仅连到安全的远程后端（密钥留在后端），或在 Android 版隐藏 AI 功能。

## 之后生成 APK 的命令

先安装 JDK 17、Android SDK 与 Gradle/Android Studio，再在本目录执行：

```bash
npm run android:sync
npx cap open android
```

然后在 Android Studio 选择 Build > Build APK(s)。输出通常在：

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

## 本次未做

没有安装 Java、Android SDK 或 Android Studio；没有生成无法验证的 APK；没有把任何密钥写进 Android 项目。

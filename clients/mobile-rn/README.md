# 启蒙小笺 · App 客户端（React Native + Expo + TypeScript）

## 1. 本地真机调试（iPhone / Android Expo Go）

```bash
cd clients/mobile-rn
npm install
npx expo start
```

手机安装 **Expo Go** 扫描终端二维码即可直连生产后端 `https://mengxue-companion.vercel.app/api`。

## 2. 打包可安装 Android APK & iOS TestFlight

```bash
npm install -g eas-cli
eas login

# 打可直接在小米/安卓手机安装的 APK
eas build -p android --profile preview

# 使用个人 Apple Developer 账号打 iOS 包提交 TestFlight / App Store
eas build -p ios --profile production
```

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Pickly is an Expo-based React Native mobile application using file-based routing with expo-router. The project targets iOS, Android, and web platforms with support for both light and dark themes.

## Key Technologies

- **Expo SDK 54** with the new architecture enabled (`newArchEnabled: true`)
- **React 19.1.0** with React Compiler enabled (`reactCompiler: true`)
- **expo-router 6.x** with typed routes (`typedRoutes: true`)
- **React Native Reanimated** for animations
- **React Navigation** for bottom tabs navigation
- **TypeScript** with strict mode enabled

## Common Commands

### Development
```bash
# Install dependencies
npm install

# Start development server (choose platform interactively)
npm start
# or
npx expo start

# Start on specific platform
npm run android
npm run ios
npm run web
```

### Code Quality
```bash
# Run ESLint
npm run lint
```

### Project Reset
```bash
# Move starter code to app-example/ and create blank app/
npm run reset-project
```

## Project Architecture

### File-Based Routing Structure

The app uses Expo Router's file-based routing system:

- `app/_layout.tsx` - Root layout with theme provider and navigation setup
  - Sets `(tabs)` as the anchor route using `unstable_settings`
  - Provides `Stack` navigation with modal support
- `app/(tabs)/` - Tab-based navigation group
  - `_layout.tsx` - Tab navigator configuration with custom HapticTab component
  - `index.tsx` - Home tab screen
  - `explore.tsx` - Explore tab screen
- `app/modal.tsx` - Modal presentation screen

### Component Organization

#### Core Components (`components/`)
- `themed-text.tsx` - Text component with theme support and type variants (default, title, subtitle, link)
- `themed-view.tsx` - View component with automatic theme color application
- `parallax-scroll-view.tsx` - Scroll view with parallax header effect
- `haptic-tab.tsx` - Tab button with haptic feedback integration
- `hello-wave.tsx` - Animated wave component
- `external-link.tsx` - Opens URLs in browser

#### UI Components (`components/ui/`)
- `collapsible.tsx` - Collapsible section component
- `icon-symbol.tsx` - Cross-platform icon component using SF Symbols (iOS) and vector icons (Android/web)
- `icon-symbol.ios.tsx` - iOS-specific implementation using `expo-symbols`

### Theme System

The theme is centralized in `constants/theme.ts`:
- `Colors` object with `light` and `dark` mode definitions
- `Fonts` object with platform-specific font families (iOS system fonts, web fonts, etc.)

### Hooks (`hooks/`)
- `use-color-scheme.ts` - Re-exports React Native's `useColorScheme` for native
- `use-color-scheme.web.ts` - Custom implementation for web platform
- `use-theme-color.ts` - Hook to get theme-aware colors based on current color scheme

### Path Aliases

The project uses `@/` as an alias for the root directory, configured in `tsconfig.json`:
```typescript
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
```

## Important Patterns

### Theme-Aware Components

Components should use `useThemeColor` or `useColorScheme` hooks to adapt to light/dark mode:
```typescript
const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');
const colorScheme = useColorScheme();
const themeColors = Colors[colorScheme ?? 'light'];
```

### Platform-Specific Code

The project uses platform-specific file extensions (`.ios.tsx`, `.web.ts`) for platform-specific implementations, particularly for:
- Icon rendering (SF Symbols on iOS, vector icons elsewhere)
- Color scheme detection (native vs web)
- Font families

### React Compiler

The project has React Compiler enabled in `app.json`. Avoid patterns that break compiler optimizations:
- Don't mutate props or state directly
- Keep component logic pure where possible
- Avoid refs for values that should be state

## Notes for Development

- The new architecture is enabled, so prefer using Fabric components and TurboModules when available
- Typed routes are enabled - route parameters and navigation are type-safe
- Android has edge-to-edge display enabled with predictive back gesture disabled
- Web output is static (pre-rendered)
- Always test on multiple platforms (iOS, Android, web) when making cross-platform changes

---

## 要件定義書（AI入力用）

### 1. プロジェクト概要

本アプリは、プレゼント探し・旅行の宿比較などの「候補集め → 比較 → 決定」を直感的に行えるURL保存＆カード管理アプリである。

ユーザーは、WebページのURLやスクリーンショットを保存し、サムネイル付きカードとして整理・比較し、最終的に「決める」までをサポートされる。

### 2. 技術スタック

- フレームワーク：React Native
- 開発環境：Expo
- 実機テスト：Expo Go
- 言語：TypeScript
- 状態管理：Zustand または React Context
- 永続化：AsyncStorage（将来的に SQLite へ拡張可能）
- ナビゲーション：@react-navigation/native + stack
- 共有受信：Expo Linking / Intent / Share API

### 3. 主要コンセプト

- URL + サムネ + メモ をカード形式で保存
- Chromeブックマークの「フォルダ」に相当する**コレクション（グループ）**で整理
- 「比較」と「決定」に特化したUX

### 4. データモデル

```typescript
Collection {
  id: string
  name: string
  icon: string
  order: number
  createdAt: number
}

Card {
  id: string
  collectionId: string
  title: string
  url?: string
  thumbnail?: string
  memo: string
  priority: 1 | 2 | 3
  status: "thinking" | "decided" | "rejected"
  labels: string[]
  checklist: { id: string; text: string; checked: boolean }[]
  images: string[]
  createdAt: number
}
```

### 5. 機能要件

#### 5-1. コレクション（フォルダ）機能

- コレクション作成
- 名前編集
- アイコン（絵文字）設定
- 並び替え（ドラッグ）
- 削除
- コレクション一覧画面を持つ

#### 5-2. カード機能

- URL保存（共有から受信）
- URL貼り付け保存
- スクリーンショット保存
- サムネイル自動取得
- メモ入力（1行＋任意詳細）
- ステータス設定（thinking / decided / rejected）
- 優先度（1〜3）
- チェックリスト
- 複数画像添付

#### 5-3. 保存フロー

1. 他アプリで「共有」
2. 本アプリ選択
3. URL + タイトル + サムネ自動取得
4. コレクション選択（直前利用をデフォルト）
5. メモ入力
6. 保存完了

### 6. UI/UX要件

#### 6-1. 初回起動UX

- 3画面の軽いオンボーディング
- 最初の保存まで10秒以内で完了する導線

#### 6-2. 画面構成

- コレクション一覧画面
- コレクション内カード一覧画面（2列グリッド）
- カード詳細画面
- 新規保存モーダル

### 7. 操作性要件

- 直感的なカードUI
- タップ回数は最小限
- 主要操作は片手で可能
- 保存時に軽いハプティクスあり

### 8. 非機能要件

- 起動3秒以内
- ローカルで完結（オフライン可）
- 将来クラウド同期可能な設計

### 9. 拡張想定

- アカウント同期
- Web版
- 共有コラボレーション
- AIによる比較要約

### 10. 開発方針

- Expo Goで即実機確認できる構成
- コンポーネントは再利用性重視
- UIはカードベース設計

---

## Custom Skills

### /release

リリーススキル。バージョンを上げてタグを打ち、EASビルドを実行する。

手順:
1. ユーザーにバージョンの種類を確認する（patch / minor / major）
   - patch: 1.0.0 → 1.0.1（バグ修正）
   - minor: 1.0.0 → 1.1.0（機能追加）
   - major: 1.0.0 → 2.0.0（大きな変更）
2. `app.json` の `version` フィールドを更新する
3. 変更をコミットする（メッセージ: `chore: bump version to vX.X.X`）
4. `git tag vX.X.X` でタグを作成する
5. `git push origin main && git push origin vX.X.X` でリモートにpushする
6. `eas build --platform android --profile production` でAABビルドを実行する
7. ビルド開始を確認して完了を報告する

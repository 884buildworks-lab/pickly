# 001: プロジェクト基盤セットアップ

## 概要
アプリの基盤となる状態管理、永続化、型定義、ナビゲーション構造を構築する。

## 関連要件
- 技術スタック: Zustand, AsyncStorage
- データモデル: Collection, Card

## 実装内容

### 1. 型定義の作成
- [x] `types/collection.ts` - Collection型の定義
- [x] `types/card.ts` - Card型の定義
- [x] `types/index.ts` - 型のエクスポート

### 2. Zustandストアの作成
- [x] `npm install zustand`
- [x] `store/collection-store.ts` - コレクション管理ストア
- [x] `store/card-store.ts` - カード管理ストア
- [x] `store/index.ts` - ストアのエクスポート

### 3. AsyncStorage永続化
- [x] `npm install @react-native-async-storage/async-storage`
- [x] Zustand persistミドルウェアの設定
- [x] 永続化のテスト

### 4. ナビゲーション構造の変更
- [x] タブ構成を要件に合わせて変更
  - ホーム（コレクション一覧）
  - 設定
- [x] モーダルルートの追加
  - 新規保存モーダル
  - カード詳細モーダル

## 完了条件
- [x] 全ての型定義が作成されている
- [x] Zustandストアが動作する
- [x] AsyncStorageでデータが永続化される
- [x] ナビゲーション構造が要件通りに動作する

## 備考
- 将来的にSQLiteへ移行可能な設計を意識
- Expo Go互換を維持

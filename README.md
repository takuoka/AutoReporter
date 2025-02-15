# AutoReporter

東京電力の電気料金を自動で取得し、LINEに通知するスクリプトです。

## 機能

- TEPCOウェブサイトへの自動ログイン
- 最新の電気料金情報の取得
- LINE通知機能
  - 現在の確定料金
  - 当月の予測料金
- GitHub Actionsによる定期実行

## セットアップ手順

### 1. LINE通知の設定

1. [LINE Official Account Manager](https://manager.line.biz/)で公式アカウントを作成
2. Messaging APIを有効化してチャネルアクセストークンを発行
3. 表示されるQRコードから友だち追加

### 2. リポジトリのセットアップ

1. このリポジトリをフォークする

2. GitHub Secretsの設定:
   - リポジトリの Settings → Secrets and variables → Actions で以下を設定
     - `LINE_CHANNEL_TOKEN`: 上記で発行したチャネルアクセストークン
     - `TEPCO_USERNAME`: TEPCOのログインユーザー名
     - `TEPCO_PASSWORD`: TEPCOのログインパスワード

## 必要な環境変数

以下の環境変数をGitHub Secretsに設定してください：

```env
# LINE設定
LINE_CHANNEL_TOKEN=your_line_channel_token    # LINEのチャンネルアクセストークン

# TEPCO設定
TEPCO_USERNAME=your_tepco_username           # TEPCOのログインユーザー名
TEPCO_PASSWORD=your_tepco_password           # TEPCOのログインパスワード
```

## 動作タイミング

GitHub Actionsにより、以下のタイミングで自動実行されます：

- 毎日20:00（日本時間）
- リポジトリへのプッシュ時
- 手動実行時

## 手動実行方法

1. リポジトリの Actions タブを開く
2. 左側のワークフローから「電気料金通知」を選択
3. 「Run workflow」ボタンをクリック

## セキュリティについて

このスクリプトは以下のセキュリティ対策を実装しています：

1. 機密情報の保護
   - すべての認証情報はGitHub Secretsで管理
   - `.env`ファイルは`.gitignore`で除外

2. 個人情報の保護
   - 取得したデータ（HTML、スクリーンショット）は一時的なファイルとして保存
   - 実行終了時に一時ファイルは自動的に削除
   - リポジトリへのコミットやアーティファクトとしての保存は行わない

## 注意事項

- LINEのチャンネルアクセストークンには `Bearer` プレフィックスを含めないでください
- GitHub Actionsの実行時間は東京時間（JST）で設定されています
- Puppeteerを使用しているため、ヘッドレスブラウザでの実行となります
- このスクリプトは個人利用を目的としています。商用利用する場合は、各サービスの利用規約を確認してください 
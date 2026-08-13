# mercari-line-bot-v2

メルカリへの出品作業を楽にするための、個人利用向けLINE Botです。

商品の写真(最大20枚)と補足メモをLINEで送信し、「分析開始」と送るとOpenAI APIが画像と文章を分析し、
以下をLINEに返信します。

- AIが判定した商品情報(ブランド・商品名・型番・色・状態など)
- メルカリ出品用のタイトル
- メルカリ出品用の商品説明文
- AIによる参考価格(早く売りたい価格・おすすめ価格・高めスタート価格)
- 商品特定精度、AIの判定に関する注意事項

**Ver.1では、メルカリ上の同一・類似商品検索や実際の相場データ取得は行いません。**
価格はすべて「AIによる参考価格」であり、実際のメルカリの出品・売却相場を参照したものではありません。

## 使用技術

- Node.js / TypeScript
- [Hono](https://hono.dev/)(Webサーバーフレームワーク) + `@hono/node-server`
- LINE Messaging API(`@line/bot-sdk`)
- OpenAI API(`openai`、画像対応モデルを使用)
- Zod(OpenAIからのJSON応答の安全な検証)
- Railwayへのデプロイを想定

DB・Supabase・Redis等の永続ストレージは使用しません。セッションはメモリ上に保持し、画像は
OSの一時ディレクトリに保存後、分析完了・キャンセル・タイムアウトのいずれかのタイミングで必ず削除します。
履歴も保存しません。

## 必要な環境変数

`.env.example` を参考に `.env` を作成してください。

| 変数名 | 説明 | デフォルト |
| --- | --- | --- |
| `LINE_CHANNEL_SECRET` | LINE Developersのチャネルシークレット | (必須) |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Developersのチャネルアクセストークン(長期) | (必須) |
| `OPENAI_API_KEY` | OpenAIのAPIキー | (必須) |
| `PORT` | サーバーの待受ポート | `3000` |
| `SESSION_TIMEOUT_MINUTES` | 最終操作からセッションを自動削除するまでの分数 | `60` |
| `SEND_IMAGE_RECEIVED_MESSAGE` | 画像受信のたびに「画像を受け取りました」と返信するか(`true`/`false`) | `true` |

## ローカル起動方法

Node.js 20以上が必要です。

```bash
npm install
cp .env.example .env
# .env を編集して各キーを設定
npm run dev
```

`npm run dev` は `tsx watch` でホットリロード付き起動します。型チェックのみ行いたい場合は
`npm run typecheck`、テストは `npm test` で実行できます。

ローカルからLINEのWebhookを受け取るには [ngrok](https://ngrok.com/) 等でトンネルを張ってください。

```bash
ngrok http 3000
```

## LINE Developers側の設定方法

1. [LINE Developers Console](https://developers.line.biz/console/) でプロバイダーと
   Messaging APIチャネルを新規作成します。
2. 「Messaging API設定」タブで **チャネルアクセストークン(長期)** を発行し、
   `LINE_CHANNEL_ACCESS_TOKEN` に設定します。
3. 「チャネル基本設定」タブの **チャネルシークレット** を `LINE_CHANNEL_SECRET` に設定します。
4. 「Messaging API設定」タブで以下を設定します。
   - Webhookの利用: オン
   - 応答メッセージ: オフ(Botからの自動応答と重複させないため)
   - あいさつメッセージ: 任意

### Webhook URL設定方法

デプロイ後のURル(例: `https://your-app.up.railway.app`)に `/webhook` を付けたURLを
「Webhook URL」欄に設定し、「検証」ボタンで疎通確認してください。

```
https://your-app.up.railway.app/webhook
```

## OpenAI APIキー設定方法

[platform.openai.com](https://platform.openai.com/) でAPIキーを発行し、`OPENAI_API_KEY` に
設定してください。画像入力に対応したモデル(既定: `gpt-4o`)を利用する従量課金のAPI契約が
必要です。ChatGPT Plus等の個人向けサブスクリプションとは別契約です。

## Railwayへのデプロイ方法

1. [Railway](https://railway.app/) で新規プロジェクトを作成し、このリポジトリを接続します
   (Nixpacksが `package.json` を検出し、`npm install` → `npm run build` → `npm start` で
   自動的にビルド・起動します)。
2. Railwayの「Variables」に `.env.example` と同じキーで環境変数を設定します。
   (`PORT` はRailwayが自動設定するため、通常は設定不要です。)
3. デプロイ後に発行されるURL(例: `https://your-app.up.railway.app`)を確認し、
   LINE Developersの Webhook URL に `https://your-app.up.railway.app/webhook` を設定します。
4. セッションをメモリ上に保持する設計のため、**インスタンス数は必ず1つに固定**してください。
   複数インスタンスにスケールすると、同じユーザーの画像・備考が別インスタンスに分散し、
   正しく動作しません。

## リッチメニュー(ボタンメニュー)のセットアップ

「出品開始」「分析開始」「状態確認」「キャンセル」をテキスト入力の代わりにボタンで送れる
リッチメニューを用意しています。メニューの画像生成・登録はワンショットのスクリプトで行い、
Bot本体のコードには影響しません(ボタンは既存のテキストコマンドをそのまま送るだけです)。

```bash
npm run richmenu:generate   # assets/richmenu.png を生成
npm run richmenu:setup      # LINEにリッチメニューを登録し、全ユーザーのデフォルトに設定
```

`richmenu:setup` は `.env` の `LINE_CHANNEL_ACCESS_TOKEN` を使ってLINEのMessaging APIを直接呼び出します。
ボタンの文言・色・配置は [`scripts/richMenuLayout.ts`](scripts/richMenuLayout.ts) を編集し、
2つのコマンドを再実行すれば更新できます(同名の古いメニューは自動的に削除されます)。

## 操作方法

LINEでBotとのトーク画面から、以下のように操作します。テキストの代わりに、上記リッチメニューの
ボタンをタップしても同じ動作をします。

1. 「出品開始」と送信 → 新しい出品セッションが始まります。
2. 商品の写真を送信します(最大20枚)。LINEのアルバムから複数枚を選んでまとめて送信しても、
   1枚ずつ送っても構いません。
3. 傷・付属品・使用期間など、わかっている情報を文章で送信します(複数回送信可、内容は蓄積されます)。
4. 「状態確認」と送ると、現在の画像枚数・備考の有無を確認できます。
5. 「分析開始」と送ると、それまでの画像・備考をもとにOpenAI APIで分析し、結果を返信します。
   分析完了後、画像とセッション情報はすべて削除されます。
6. 送信中に間違えた場合は「キャンセル」と送ると、画像とセッションを削除してやり直せます。

最後の操作から `SESSION_TIMEOUT_MINUTES`(既定60分)が経過すると、セッションと画像は
自動的に削除されます。

## 現在未実装の機能(Ver.1)

- メルカリ上の同一・類似商品検索
- 類似商品URLの取得
- 実際のメルカリ相場データの取得

これらはVer.2以降で `src/marketplace/` 配下に `MarketplaceSearchProvider` の実装を追加する形で
対応予定です。詳細は [`src/marketplace/README.md`](src/marketplace/README.md) を参照してください。

## トラブルシューティング

- **Webhookの検証が失敗する**: `LINE_CHANNEL_SECRET` の設定値が正しいか、デプロイ先のURLが
  `https://.../webhook` になっているか確認してください。
- **画像を送っても反応がない**: 先に「出品開始」を送信してセッションを開始する必要があります。
  未開始の状態で画像・備考を送ると「先に『出品開始』と送ってください。」と返信されます。
- **「分析開始」してもエラーになる**: `OPENAI_API_KEY` が正しいか、OpenAI側のクレジット残高・
  レート制限を確認してください。エラー時は画像が保持されるため、そのまま「分析開始」を
  再送信すれば再試行できます(60分放置すると自動削除されます)。
- **21枚目の画像を送ると拒否される**: 仕様どおりの動作です。1商品につき最大20枚までです。
- **画像受信のたびに返信されるのが煩わしい**: `SEND_IMAGE_RECEIVED_MESSAGE=false` に設定すると、
  画像受信時の確認メッセージを送らなくなります。

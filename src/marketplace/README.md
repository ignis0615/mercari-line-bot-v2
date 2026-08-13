# marketplace モジュール

`MarketplaceSearchProvider` は、類似商品を検索して相場を取得するためのインターフェースです。

- `types.ts`: `MarketplaceItem` / `MarketplaceSearchProvider` の型定義
- `yahooAuctionSearchProvider.ts`: Ver.2で実装した実装クラス。ヤフオク!の「落札相場・落札価格」
  検索ページ(`closedsearch`)を取得し、`fetch` + `cheerio` でHTMLを解析します。詳細やToSに
  関する注意点はリポジトリルートの [README.md](../../README.md#相場検索ver2について) を参照してください。

`services/listingService.ts` は `MarketplaceSearchProvider` インターフェース越しにしか
このモジュールを利用しないため、別のデータソースに切り替える場合は実装を差し替えるだけで
済みます(メルカリの検索結果ページをPlaywrightで取得する実装も試しましたが、データセンターからの
自動アクセスが検知され安定しなかったため、現在はヤフオク!を使っています)。

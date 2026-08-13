# marketplace モジュール

`MarketplaceSearchProvider` は、メルカリ上の類似商品を検索して相場を取得するためのインターフェースです。

- `types.ts`: `MarketplaceItem` / `MarketplaceSearchProvider` の型定義
- `mercariSearchProvider.ts`: Ver.2で実装した実装クラス。Playwrightでメルカリの検索結果ページ
  (売り切れ・販売中)を取得します。詳細やToSに関する注意点はリポジトリルートの
  [README.md](../../README.md#相場検索ver2について) を参照してください。

`services/listingService.ts` は `MarketplaceSearchProvider` インターフェース越しにしか
このモジュールを利用しないため、将来別のデータソースに切り替える場合は実装を差し替えるだけで
済みます。

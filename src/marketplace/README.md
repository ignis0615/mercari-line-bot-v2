# marketplace モジュール(未実装)

`MarketplaceSearchProvider` は、メルカリ上の同一・類似商品を検索して相場を取得するための
将来のインターフェースです。

TODO: Ver.2でメルカリ類似商品検索・相場取得を実装予定

Ver.1では `types.ts` のインターフェース定義のみが存在し、どこからも呼び出されません。
Ver.2で実装する際は、この配下に実装クラス(例: `MercariSearchProvider`)を追加し、
`services/listingService.ts` から任意に呼び出せるようにする想定です。

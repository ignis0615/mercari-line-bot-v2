/**
 * Ver.2以降で実装予定のメルカリ類似商品検索インターフェース。
 * Ver.1では呼び出さない(実装もしない)。
 */
export interface MarketplaceItem {
  platform: "mercari";
  title: string;
  price: number;
  url: string;
  sold?: boolean;
}

export interface MarketplaceSearchProvider {
  search(query: string): Promise<MarketplaceItem[]>;
}

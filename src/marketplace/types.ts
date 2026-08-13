/**
 * メルカリ類似商品検索の抽象インターフェース。
 * 実装は mercariSearchProvider.ts を参照。
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

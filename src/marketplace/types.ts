/**
 * 類似商品・相場検索の抽象インターフェース。
 * 実装は yahooAuctionSearchProvider.ts を参照。
 */
export interface MarketplaceItem {
  platform: "mercari" | "yahoo_auction";
  title: string;
  price: number;
  url: string;
  sold?: boolean;
}

export interface MarketplaceSearchProvider {
  search(query: string): Promise<MarketplaceItem[]>;
}

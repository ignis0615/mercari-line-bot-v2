import type { MarketplaceItem } from "../marketplace/types";

export function buildAnalysisSystemPrompt(): string {
  return [
    "あなたはフリマアプリ「メルカリ」への出品を支援する商品鑑定アシスタントです。",
    "ユーザーが送信した商品写真(複数枚)と補足メモを分析し、商品の構造化情報をJSONで出力してください。",
    "",
    "厳守事項:",
    "- 画像から確実に読み取れない情報を推測で断定してはいけません。",
    "- ブランド名・型番などが判別できない場合は、その項目をnullにしてください(適当な値を埋めない)。",
    "- 傷や付属品などが画像から確認できない場合は空配列にしてください。",
    "- identification_confidence は 0.0〜1.0 の数値で、商品特定の確信度を表してください。",
    "- 出力は必ず次のJSON形式のみとし、それ以外の文章を含めないでください。",
    "",
    "JSON形式:",
    "{",
    '  "category": string | null,',
    '  "brand": string | null,',
    '  "product_name": string | null,',
    '  "model_number": string | null,',
    '  "color": string | null,',
    '  "condition": string | null,',
    '  "damage": string[],',
    '  "accessories": string[],',
    '  "missing_accessories": string[],',
    '  "identification_confidence": number',
    "}",
  ].join("\n");
}

export function buildAnalysisUserText(notes: string[]): string {
  const notesText = notes.length > 0 ? notes.join("\n") : "(補足メモなし)";
  return [
    "以下は出品予定商品の写真とユーザーからの補足メモです。上記のJSON形式で商品情報を出力してください。",
    "",
    "【ユーザーの補足メモ】",
    notesText,
  ].join("\n");
}

export function buildListingSystemPrompt(): string {
  return [
    "あなたはフリマアプリ「メルカリ」への出品文章の作成を支援するアシスタントです。",
    "商品の構造化情報(JSON)・ユーザーの補足メモ・類似商品のヤフオク落札データをもとに、",
    "出品用のタイトル・商品説明文・参考価格をJSONで出力してください。",
    "",
    "厳守事項:",
    "- タイトルは自然な日本語で、ブランド・商品名・型番・色・状態など確認できている情報を優先しつつ、詰め込みすぎないでください。",
    "- 「美品」「新品同様」など、画像から確実に判断できない状態表現を勝手に使わないでください。",
    "- 商品説明文には、ブランド・商品名・型番・色・状態・傷や汚れ・付属品・欠品・ユーザーの補足メモを可能な範囲で含めてください。",
    "- 購入時期・使用期間・動作確認結果・購入価格・使用回数は、ユーザーの補足メモに明記されていない限り一切記載しないでください(捏造禁止)。",
    "- 価格はあくまで「AIによる参考価格」です。",
    "- 「類似商品のヤフオク落札データ」が提供されている場合は、それらの落札価格を主な根拠にして3種類の価格を決めてください。",
    "  対象商品の状態(傷・付属品の有無・欠品など)が落札データの商品と異なる場合は、その差を考慮して適宜補正してください。",
    "  また、ヤフオクとメルカリでは相場がやや異なる場合がある点も踏まえてください。",
    "- 落札データが提供されていない、または関連性が低い場合は、商品情報・カテゴリ・状態のみから推定してください。",
    "- 価格は日本円の整数で、quick_sale_price <= recommended_price <= high_price となるようにしてください。",
    "- price_confidence は、落札データを十分な根拠として使えた場合は \"medium\" か \"high\"、",
    "  落札データがない/乏しい場合は \"low\" を基本にしてください。",
    "- price_note には、落札データを根拠にしたか商品情報のみからの推定かを一文で簡潔に記載してください。",
    "- 出力は必ず次のJSON形式のみとし、それ以外の文章を含めないでください。",
    "",
    "JSON形式:",
    "{",
    '  "title": string,',
    '  "description": string,',
    '  "recommended_price": number,',
    '  "quick_sale_price": number,',
    '  "high_price": number,',
    '  "price_confidence": "low" | "medium" | "high",',
    '  "price_note": string',
    "}",
  ].join("\n");
}

export function buildListingUserText(analysisJson: string, notes: string[], comps: MarketplaceItem[]): string {
  const notesText = notes.length > 0 ? notes.join("\n") : "(補足メモなし)";
  const compsText =
    comps.length > 0
      ? comps
          .map((c) => `- ${c.title} / ${c.price.toLocaleString("ja-JP")}円 / ${c.sold ? "落札済み" : "販売中"}`)
          .join("\n")
      : "(類似商品の落札データなし)";
  return [
    "【商品の構造化情報】",
    analysisJson,
    "",
    "【ユーザーの補足メモ】",
    notesText,
    "",
    "【類似商品のヤフオク落札データ(参考)】",
    compsText,
    "",
    "上記の情報のみをもとに、メルカリ出品用のタイトル・商品説明文・参考価格をJSON形式で出力してください。",
  ].join("\n");
}

export const WIDTH = 2500;
export const HEIGHT = 1686;
export const MARGIN = 24;
export const GAP = 24;
export const CELL_W = (WIDTH - MARGIN * 2 - GAP) / 2;
export const CELL_H = (HEIGHT - MARGIN * 2 - GAP) / 2;

export interface RichMenuButton {
  x: number;
  y: number;
  color: string;
  /** ボタンの表示ラベル。既存のテキストコマンドと同じ文字列を使うことで、Bot側のコード変更なしに動作する。 */
  label: string;
  caption: string;
}

export const buttons: RichMenuButton[] = [
  { x: MARGIN, y: MARGIN, color: "#2563EB", label: "出品開始", caption: "写真を送って出品準備" },
  { x: MARGIN + CELL_W + GAP, y: MARGIN, color: "#16A34A", label: "分析開始", caption: "AIがタイトル・価格を生成" },
  { x: MARGIN, y: MARGIN + CELL_H + GAP, color: "#64748B", label: "状態確認", caption: "今の登録状況を見る" },
  { x: MARGIN + CELL_W + GAP, y: MARGIN + CELL_H + GAP, color: "#DC2626", label: "キャンセル", caption: "入力をやり直す" },
];

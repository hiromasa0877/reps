# Reps

スマホで使う筋トレ管理 Web アプリ。メニューをタスクとして並べ、カードをフリックしてステータスを進めます。

- **右フリック**: 未着手 → 実施中 → 完了 ／ **左フリック**: ひとつ戻す（未着手なら削除・元に戻す可）
- **セット番号をタップ**: 進捗を記録。全セット完了で自動的に「完了」へ
- **部位から選ぶ**: 胸・背中・脚・肩・腕・腹の種目カタログ（27 種目）
- **前回の記録**: 種目ごとに直近の重量・回数・セットを記憶し、追加時に自動入力。カードに「前回」と増減を表示
- **フォーム図解**: 種目ごとのアニメーション（動作フェーズ・呼吸・狙う筋肉のハイライト）と要点
- **AI メニュー作成**: 部位と要望から Workers AI がメニューを生成（直近の記録を考慮）
- 記録画面: 連続日数・7 日間の完了数・部位別・4 週間ヒートマップ

## 技術スタックと選定理由

| 領域 | 採用 | 理由 |
| --- | --- | --- |
| 実行環境 | **Cloudflare Workers**（Static Assets 同居） | API と SPA を 1 つの Worker で配信。エッジ実行で国内から低レイテンシ、無料枠が広くサーバー管理不要。`run_worker_first: ["/api/*"]` で API 以外は静的配信のみ |
| DB | **Cloudflare D1** | Workers から同一ネットワークで呼べる SQLite。集計（日別・部位別・前回記録のサブクエリ）が SQL で素直に書ける。マイグレーションを wrangler で管理 |
| AI | **Workers AI**（`@cf/meta/llama-3.3-70b-instruct-fp8-fast`） | 追加の API キー不要で Worker のバインディングから呼べる。JSON Schema 指定の構造化出力に対応し、日本語でも安定。種目名はカタログから選ばせ、フォームの要点はキュレーション済みの文を使うことで品質を担保 |
| API | **Hono** | Workers 向けに最適化された軽量ルーター。型付きの `c.env` バインディング、Cookie ヘルパーが標準で揃う |
| 認証 | **Google Identity Services + jose** | Google 認証のみの要件に対し、ID トークンを Worker で Google の JWKS 検証するだけで完結（クライアントシークレット不要）。セッションは HttpOnly / Secure / SameSite=Lax Cookie、DB にはトークンの SHA-256 のみ保存 |
| フロント | **React 19 + Vite** | `@cloudflare/vite-plugin` で Worker・D1・AI を含めて `vite dev` 1 コマンドでローカル実行でき、本番と同じ workerd ランタイムで動く |
| アニメーション | **Motion**（旧 Framer Motion） | フリック（drag + しきい値 + 速度判定）、レイアウトアニメーション（ステータス変更でカードが滑らかに移動）、共有レイアウト（タブ/日付のインジケーター）、SVG 属性アニメ（フォーム図解）を 1 ライブラリで実現 |
| データ取得 | **TanStack Query** | 楽観的更新（フリック即時反映 → 失敗時ロールバック）、日付ごとのキャッシュ、フォーカス時再取得 |
| スタイル | 素の CSS（デザイントークン） | リキッドグラス（`backdrop-filter` + スペキュラーハイライト + 背景の色光）を細かく制御するため。ユーティリティ CSS の依存を持たない |
| アイコン | lucide-react | 使う分だけ tree-shaking される |

### UX 上の工夫

- 初回表示は `index.html` に埋め込んだ全画面スケルトン → React のスケルトンへ同じ形のまま引き継ぎ、ちらつきなし
- 日付切替・記録画面・AI 生成中もそれぞれ専用スケルトン
- フリックのしきい値を越えた瞬間に軽い振動（対応端末）と色・アイコンの拡大でフィードバック
- 誤操作対策としてステータス変更・削除はすべてトーストから「元に戻す」可能
- `prefers-reduced-motion` を尊重

## 開発

```bash
npm install
npm run db:migrate:local
npm run dev
```

ローカルでは `.dev.vars` に `DEV_LOGIN=true` を置くと開発用ログインが使えます（本番では無効）。Workers AI はローカル開発でもリモートで実行されます（`wrangler login` が必要）。

`/?forms`（開発時のみ）で全種目のフォームアニメーションを一覧確認できます。

## デプロイ

```bash
npx wrangler d1 create reps-db        # 初回のみ。出力された database_id を wrangler.jsonc に設定
npm run db:migrate                    # 本番 D1 にマイグレーション適用
npm run deploy
```

Google ログインには OAuth クライアント ID（ウェブアプリケーション）が必要です。承認済みの JavaScript 生成元にデプロイ先 URL を追加し、`wrangler.jsonc` の `vars.GOOGLE_CLIENT_ID` に設定して再デプロイしてください（クライアント ID は公開情報のため vars で問題ありません）。

## 構成

```
worker/index.ts        API（認証・タスク・集計・AI）
shared/catalog.ts      種目カタログ（部位・フォーム要点）。Worker とフロントで共有
migrations/            D1 スキーマ
src/components/        画面・カード・シート・フォーム図解
```

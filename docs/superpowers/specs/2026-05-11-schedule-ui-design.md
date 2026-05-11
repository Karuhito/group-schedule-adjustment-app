# Schedule UI 設計書

## 概要

グループ詳細ページにスケジュールタブを追加し、自分の空き時間を登録・管理できる入力フォームと、グループメンバー全員の空き時間をタイムラインで可視化する表示を実装する。

---

## 決定した UX

| 項目 | 選択 |
|------|------|
| 配置場所 | GroupDetailPage にタブ追加（メンバー / スケジュール） |
| 入力方式 | フォーム方式（日付 + 開始・終了時刻 → スロット追加 → 保存） |
| 可視化方式 | タイムライン（横バー）表示 + 重複区間の強調 |
| レイアウト | 1ページにまとめる（自分の入力 → 仕切り → グループタイムライン） |
| 日程表示 | 全未来日程を日付ごとに縦に並べる（日付選択なし） |

---

## ファイル構成

```
frontend/src/
├── types/index.ts                    ← ScheduleSlot, MemberSchedule 型を追加
├── components/schedule/
│   ├── ScheduleTab.tsx               ← スケジュールタブ全体のコンテナ
│   ├── SlotForm.tsx                  ← 自分のスロット入力フォーム
│   └── ScheduleTimeline.tsx          ← 全日程タイムライン表示
└── pages/
    └── GroupDetailPage.tsx           ← タブUI追加（既存ファイルを修正）
```

---

## 型定義

`frontend/src/types/index.ts` に追加する：

```typescript
export interface ScheduleSlot {
  start_time: string   // ISO 8601 with timezone
  end_time: string
}

export interface MemberSchedule {
  user_id: string
  username: string
  avatar_url: string | null
  slots: ScheduleSlot[]
}
```

---

## コンポーネント責務

### `ScheduleTab.tsx`（コンテナ）

- `groupId` は `GroupDetailPage` から props で受け取る（元々 useParams で取得済み）
- 現在ログイン中のユーザーの `user_id` は既存の認証コンテキスト（`useAuth`）から取得する
- マウント時に `GET /groups/{group_id}/schedules` を呼び出してメンバー全員のスロットを取得する
- GETレスポンスから自分の `user_id` に一致するエントリを探し、`mySlots` の初期値とする
- 自分のスロット一覧のローカル状態を管理する（追加・削除・保存）
- 保存時に `PUT /groups/{group_id}/schedules` を呼び出す
- 保存成功後に GET を再実行して最新データを反映する
- ネットワーク処理はすべてここに集中させ、子コンポーネントには props のみ渡す

### `SlotForm.tsx`（入力フォーム）

- 「日付」「開始時刻」「終了時刻」の3フィールド + 「追加」ボタン
- 日付フィールドの `min` 属性に今日の日付を設定し、過去日付を入力不可にする
- 追加するとローカルのスロットリストに積まれる（APIは呼ばない）
- 登録済みスロットをリストで表示し、✕ で削除できる
- バリデーション：開始 < 終了であること（開始 >= 終了なら「追加」ボタンを無効化）
- 「保存する」ボタンで親（ScheduleTab）の保存ハンドラを呼ぶ

### `ScheduleTimeline.tsx`（可視化）

- `MemberSchedule[]` を受け取り、日付ごとにグループ化して表示する
- 各日付ブロック：メンバー横バー + 重複バーを描画する
- 時間軸は各日付の最早開始〜最遅終了に合わせてスケールする
- 重複計算はこのコンポーネント内のユーティリティ関数で行う

---

## データフロー

```
GroupDetailPage
  └─ ScheduleTab（マウント時にAPIコール）
       ├─ GET /groups/:id/schedules → memberSchedules: MemberSchedule[]
       ├─ 自分のスロット: mySlots: ScheduleSlot[]（ローカル state）
       │    └─ GETレスポンスから自分の user_id でフィルタして初期化
       │
       ├─ SlotForm
       │    props: mySlots, onAdd(slot), onRemove(index), onSave()
       │    onSave → PUT /groups/:id/schedules → 成功後 GET を再実行
       │
       └─ ScheduleTimeline
            props: memberSchedules（全メンバー）
```

---

## 重複計算ロジック

1. その日付に1件でもスロットを持つメンバーのみを対象にする（未登録メンバーは除外）
2. 全メンバーのスロットを分単位の区間集合として扱う
3. 全メンバーの共通区間（AND）を算出する
4. 連続する共通区間を重複バーとして描画する
5. 重複区間がなければ重複バーは非表示にする

タイムバーの幅は `(slot_end - slot_start) / (day_max - day_min)` の比率でパーセント計算する。

---

## 過去データの扱い

- `GET /groups/{group_id}/schedules` は `end_time >= NOW()` の未来スロットのみ返す（バックエンド実装済み）
- タイムライン表示・SlotForm 初期値ともに未来スロットのみ対象になる
- PUT は full replace のため、DBの過去スロットは次回保存時に自動的に消えるが、GET で見えないためユーザーへの影響はない
- フロントエンド側では過去日付を特別に処理しない（日付フィールドの `min` 設定のみ）

---

## テスト戦略

Vitest + React Testing Library（既存プロジェクト設定に従う）

### `SlotForm.tsx`
- スロット追加時にリストに表示されること
- 開始 >= 終了の場合は「追加」ボタンが無効になること
- ✕ でスロットが削除されること
- 「保存する」ボタンで `onSave` が呼ばれること

### `ScheduleTimeline.tsx`
- 複数メンバーのスロットが日付ごとに正しくグループ化されること
- スロットなしのメンバーは重複計算から除外されること
- 重複区間が正しく計算されること（例：A が 10〜18 時、B が 14〜20 時 → 重複は 14〜18 時）
- 重複なしの場合は重複バーが非表示になること

### `ScheduleTab.tsx`
- マウント時に GET API が呼ばれること
- 保存成功後に GET が再実行されること（再フェッチ）
- API エラー時にエラーメッセージが表示されること

---

## バックエンド API（参照）

| メソッド | パス | 説明 |
|---------|------|------|
| `GET` | `/groups/{group_id}/schedules` | グループ全メンバーの未来スロット取得 |
| `PUT` | `/groups/{group_id}/schedules` | 自分のスロットを全件置換 |

リクエスト/レスポンスの詳細は `docs/superpowers/specs/2026-05-09-schedules-api-design.md` を参照。

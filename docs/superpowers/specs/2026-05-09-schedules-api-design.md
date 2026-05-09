# スケジュール API 設計

## 対象フェーズ

フェーズ1（MVP）のうち、スケジュール管理機能。

## 技術スタック

既存のバックエンド基盤（FastAPI + SQLAlchemy async + asyncpg + Supabase）をそのまま使用。新規モデル・マイグレーションは不要（schedules テーブルは既に存在）。

## ファイル構成

```
変更対象:
  backend/app/routers/schedules.py  ← 新規作成
  backend/app/schemas/schemas.py    ← スケジュール用スキーマを追記
  backend/app/main.py               ← schedules ルーターを登録
  backend/tests/test_schedules.py   ← 新規作成（テスト）
```

## エンドポイント一覧

| メソッド | パス | 説明 | 認証 | 権限 | レスポンス |
|---------|------|------|------|------|----------|
| PUT | `/groups/{group_id}/schedules` | 自分の空き時間を一括登録 | 必須 | メンバーのみ | `ScheduleResponse` (200) |
| GET | `/groups/{group_id}/schedules` | 全メンバーの空き時間を取得 | 必須 | メンバーのみ | `list[MemberScheduleResponse]` (200) |

## Pydantic スキーマ

### リクエスト

```python
class ScheduleSlot(BaseModel):
    start_time: datetime  # ISO 8601、タイムゾーン付き
    end_time: datetime    # ISO 8601、タイムゾーン付き

class ScheduleUpsert(BaseModel):
    slots: list[ScheduleSlot]  # 空配列 = 全スロット削除
```

### レスポンス

```python
class ScheduleResponse(BaseModel):
    slots: list[ScheduleSlot]

class MemberScheduleResponse(BaseModel):
    user_id: uuid.UUID
    username: str
    avatar_url: str | None  # null の場合はフロント側でデフォルト画像を表示
    slots: list[ScheduleSlot]
```

## PUT の動作フロー

```
[Pydantic] start_time < end_time のバリデーション → 違反は 422（ハンドラより先に実行）
1. group_id で Group を取得 → 存在しなければ 404
2. 自分が GroupMember か確認 → 非メンバーは 403
3. schedules WHERE group_id = {group_id} AND user_id = {current_user.id} を全件 DELETE
4. 新しいスロットを全件 INSERT
5. 登録済みスロットを ScheduleResponse で返す（200）
```

## GET の動作フロー

```
1. group_id で Group を取得 → 存在しなければ 404
2. 自分が GroupMember か確認 → 非メンバーは 403
3. schedules WHERE group_id = {group_id} AND end_time >= NOW() を取得
4. user_id でグループ化し、User 情報（username, avatar_url）を JOIN
5. MemberScheduleResponse のリストで返す（200）
```

## エラーハンドリング

| 状況 | HTTP ステータス |
|------|--------------|
| 存在しない `group_id` | 404 Not Found |
| グループのメンバーでない | 403 Forbidden |
| `start_time >= end_time` | 422 Unprocessable Entity |

## avatar_url の方針

`avatar_url` が `null` の場合、API はそのまま `null` を返す。デフォルト画像の表示はフロントエンド側で処理する。将来的に Discord 以外の認証プロバイダーへ拡張する可能性があるため、バックエンドに Discord 固有のフォールバックロジックを持たせない。

## レスポンス例

### PUT /groups/{group_id}/schedules

リクエスト:
```json
{
  "slots": [
    {"start_time": "2026-05-10T14:00:00+09:00", "end_time": "2026-05-10T18:00:00+09:00"},
    {"start_time": "2026-05-11T10:00:00+09:00", "end_time": "2026-05-11T12:00:00+09:00"}
  ]
}
```

レスポンス:
```json
{
  "slots": [
    {"start_time": "2026-05-10T14:00:00+09:00", "end_time": "2026-05-10T18:00:00+09:00"},
    {"start_time": "2026-05-11T10:00:00+09:00", "end_time": "2026-05-11T12:00:00+09:00"}
  ]
}
```

### GET /groups/{group_id}/schedules

```json
[
  {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "kazuto",
    "avatar_url": "https://cdn.discordapp.com/avatars/...",
    "slots": [
      {"start_time": "2026-05-10T14:00:00+09:00", "end_time": "2026-05-10T18:00:00+09:00"}
    ]
  },
  {
    "user_id": "661f9511-f3ac-52e5-b827-557766551111",
    "username": "taro",
    "avatar_url": null,
    "slots": [
      {"start_time": "2026-05-10T15:00:00+09:00", "end_time": "2026-05-10T17:00:00+09:00"}
    ]
  }
]
```

## CORS・認証

既存の設定をそのまま使用。

- 認証：HTTPOnly Cookie の JWT（`get_current_user` 依存を使用）
- CORS：`main.py` の既存設定（`FRONTEND_URL` を許可オリジンに設定済み）

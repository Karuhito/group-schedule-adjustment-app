# グループ API 設計

## 対象フェーズ

フェーズ1（MVP）のうち、グループ管理機能。

## 技術スタック

既存のバックエンド基盤（FastAPI + SQLAlchemy async + asyncpg + Supabase）をそのまま使用。新規モデル・マイグレーションは不要（Group, GroupMember テーブルは既に存在）。

## ファイル構成

```
変更対象:
  backend/app/routers/groups.py     ← 新規作成
  backend/app/schemas/schemas.py    ← グループ用スキーマを追記
  backend/app/main.py               ← groups ルーターを登録
  backend/tests/test_groups.py      ← 新規作成（テスト）
```

## エンドポイント一覧

| メソッド | パス | 説明 | 認証 | 権限 | レスポンス |
|---------|-----|------|------|------|----------|
| POST | `/groups` | グループ作成 | 必須 | 全員 | `GroupResponse` (201) |
| GET | `/groups` | 自分のグループ一覧 | 必須 | 全員 | `list[GroupResponse]` (200) |
| GET | `/groups/by-code/{invite_code}` | 招待コードでプレビュー | 必須 | 全員 | `GroupPreviewResponse` (200) |
| POST | `/groups/by-code/{invite_code}/join` | グループ参加 | 必須 | 全員 | `GroupResponse` (200) |
| GET | `/groups/{group_id}/members` | メンバー一覧 | 必須 | メンバーのみ | `list[MemberResponse]` (200) |
| DELETE | `/groups/{group_id}` | グループ削除 | 必須 | オーナーのみ | `204 No Content` |
| DELETE | `/groups/{group_id}/members/{user_id}` | メンバー追い出し | 必須 | オーナーのみ | `204 No Content` |

## 招待コード

- `secrets.token_urlsafe(6)` で8文字のURLセーフなランダム文字列を生成
- 有効期限なし（無期限）
- UNIQUE 制約に衝突した場合は最大3回リトライ

## 計算フィールド

`GroupResponse` と `GroupPreviewResponse` の一部フィールドは DB カラムではなく、クエリ時に計算する。

- `member_count`: `COUNT(group_members WHERE group_id = {id})` で取得
- `is_owner`: `group.created_by == current_user.id` で判定

## グループ作成時の動作

Group を INSERT した後、作成者を GroupMember にも自動で INSERT する（グループ作成者は必ずメンバーになる）。

## Pydantic スキーマ

### リクエスト

```python
class GroupCreate(BaseModel):
    name: str  # グループ名

# 参加・プレビューは invite_code をパスパラメータで渡すため不要
```

### レスポンス

```python
class GroupResponse(BaseModel):
    model_config = {"from_attributes": True}
    id: uuid.UUID
    name: str
    invite_code: str
    member_count: int
    is_owner: bool

class GroupPreviewResponse(BaseModel):
    id: uuid.UUID
    name: str
    member_count: int

class MemberResponse(BaseModel):
    model_config = {"from_attributes": True}
    user_id: uuid.UUID
    username: str
    avatar_url: str | None
    is_owner: bool
```

## エラーハンドリング

| 状況 | HTTPステータス |
|------|--------------|
| 存在しない `invite_code` | 404 Not Found |
| 既にメンバー（参加済み） | 409 Conflict |
| オーナー以外がグループ削除・メンバー削除 | 403 Forbidden |
| オーナー自身を追い出そうとする | 400 Bad Request |
| 存在しない `group_id` | 404 Not Found |
| メンバー以外がメンバー一覧を取得 | 403 Forbidden |

## 削除時のデータフロー

### グループ削除（`DELETE /groups/{group_id}`）

```
1. group_id で Group を取得 → 存在しなければ 404
2. created_by == current_user.id を確認 → 違えば 403
3. schedules WHERE group_id = {group_id} を全件 DELETE
4. group_members WHERE group_id = {group_id} を全件 DELETE
5. groups WHERE id = {group_id} を DELETE
6. 204 No Content を返す
```

### メンバー追い出し（`DELETE /groups/{group_id}/members/{user_id}`）

```
1. group_id で Group を取得 → 存在しなければ 404
2. created_by == current_user.id を確認 → 違えば 403
3. user_id == current_user.id なら 400（オーナーは自分を追い出せない）
4. schedules WHERE group_id = {group_id} AND user_id = {user_id} を DELETE
5. group_members WHERE group_id = {group_id} AND user_id = {user_id} を DELETE
6. 204 No Content を返す
```

## レスポンス例

### GET /groups

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "深夜ゲーム部",
    "invite_code": "abc12345",
    "member_count": 4,
    "is_owner": true
  }
]
```

### GET /groups/by-code/abc12345

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "深夜ゲーム部",
  "member_count": 4
}
```

### GET /groups/{group_id}/members

```json
[
  {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "kazuto",
    "avatar_url": "https://cdn.discordapp.com/avatars/...",
    "is_owner": true
  },
  {
    "user_id": "661f9511-f3ac-52e5-b827-557766551111",
    "username": "taro",
    "avatar_url": null,
    "is_owner": false
  }
]
```

## CORS・認証

既存の設定をそのまま使用。

- 認証：HTTPOnly Cookie の JWT（`get_current_user` 依存を使用）
- CORS：`main.py` の既存設定（`FRONTEND_URL` を許可オリジンに設定済み）
- 許可メソッド：既存の `["GET", "POST", "DELETE"]` で全エンドポイントをカバー済み

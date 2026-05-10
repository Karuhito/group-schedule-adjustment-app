import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('api client', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('GET リクエストで fetch を正しいオプションで呼ぶ', async () => {
    const { api } = await import('./client')
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ id: '1', username: 'Alice', avatar_url: null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    const result = await api.get('/auth/me')
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:8000/auth/me',
      expect.objectContaining({ credentials: 'include' }),
    )
    expect(result).toEqual({ id: '1', username: 'Alice', avatar_url: null })
  })

  it('POST リクエストで method と body を設定して fetch を呼ぶ', async () => {
    const { api } = await import('./client')
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 'g1' }), { status: 200 }),
    )
    await api.post('/groups', { name: 'テスト' })
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:8000/groups',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'テスト' }),
      }),
    )
  })

  it('401 レスポンスで Unauthorized エラーをスローする', async () => {
    const { api } = await import('./client')
    vi.mocked(fetch).mockResolvedValueOnce(new Response('', { status: 401 }))
    await expect(api.get('/auth/me')).rejects.toThrow('Unauthorized')
  })

  it('4xx/5xx レスポンスでレスポンスボディのエラーをスローする', async () => {
    const { api } = await import('./client')
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response('グループが見つかりません', { status: 404 }),
    )
    await expect(api.get('/groups/unknown')).rejects.toThrow('グループが見つかりません')
  })

  it('DELETE リクエスト（204）で undefined を返す', async () => {
    const { api } = await import('./client')
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 204 }))
    const result = await api.del('/groups/g1')
    expect(result).toBeUndefined()
  })
})

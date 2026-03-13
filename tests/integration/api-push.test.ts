import { beforeEach, describe, expect, test, vi } from 'vitest'

import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from '@/lib/security/csrf'
import { clearRateLimitState } from '@/lib/security/rate-limit'

const getBranchMock = vi.fn()
const getCommitMock = vi.fn()
const createTreeMock = vi.fn()
const createCommitMock = vi.fn()
const updateRefMock = vi.fn()

vi.mock('@octokit/rest', () => {
  class Octokit {
    repos = {
      getBranch: getBranchMock,
    }

    git = {
      getCommit: getCommitMock,
      createTree: createTreeMock,
      createCommit: createCommitMock,
      updateRef: updateRefMock,
    }
  }

  return { Octokit }
})

const { POST } = await import('@/app/api/push/route')

const VALID_ORIGIN = 'http://localhost:3000'
const VALID_TOKEN = 'test-csrf-token-xyz'

const makeRequest = (body: Record<string, unknown>) => {
  return new Request('http://localhost:3000/api/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: VALID_ORIGIN,
      [CSRF_HEADER_NAME]: VALID_TOKEN,
      Cookie: `${CSRF_COOKIE_NAME}=${VALID_TOKEN}`,
    },
    body: JSON.stringify(body),
  })
}

describe('POST /api/push', () => {
  beforeEach(() => {
    vi.useRealTimers()
    clearRateLimitState()
    getBranchMock.mockReset()
    getCommitMock.mockReset()
    createTreeMock.mockReset()
    createCommitMock.mockReset()
    updateRefMock.mockReset()

    getBranchMock.mockResolvedValue({ data: { name: 'main', commit: { sha: 'base-sha-1' } } })
    getCommitMock.mockResolvedValue({ data: { tree: { sha: 'base-tree-sha-1' } } })
    createTreeMock.mockResolvedValue({ data: { sha: 'new-tree-sha-1' } })
    createCommitMock.mockResolvedValue({ data: { sha: 'new-commit-sha-1' } })
    updateRefMock.mockResolvedValue({})
  })

  test('rejects invalid PAT', async () => {
    const request = makeRequest({
      owner: 'lumio',
      repo: 'app',
      appSlug: 'lumio-app',
      pat: '',
      contentByPath: {
        'README.md': '# Lumio',
      },
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error).toBe('Invalid PAT')
    expect(getBranchMock).not.toHaveBeenCalled()
    expect(createCommitMock).not.toHaveBeenCalled()
  })

  test('rejects unauthorized but well-formed PAT', async () => {
    getBranchMock.mockRejectedValueOnce({ status: 401 })

    const request = makeRequest({
      owner: 'lumio',
      repo: 'app',
      appSlug: 'lumio-app',
      branch: 'main',
      pat: 'github_pat_abcdefghijklmnopqrstuvwxyz123456',
      contentByPath: {
        'README.md': '# Lumio',
      },
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error).toBe('Invalid PAT')
  })

  test('falls back to main branch when requested branch does not exist', async () => {
    getBranchMock.mockImplementation(async ({ branch }: { branch: string }) => {
      if (branch === 'feature/missing') {
        throw { status: 404 }
      }

      if (branch === 'main') {
        return { data: { name: 'main', commit: { sha: 'main-head-sha' } } }
      }

      throw { status: 404 }
    })

    const request = makeRequest({
      owner: 'lumio',
      repo: 'app',
      appSlug: 'lumio-app',
      branch: 'feature/missing',
      pat: 'github_pat_abcdefghijklmnopqrstuvwxyz123456',
      contentByPath: {
        'README.md': '# Lumio',
      },
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.usedBranch).toBe('main')
    expect(updateRefMock).toHaveBeenCalledWith(
      expect.objectContaining({
        ref: 'heads/main',
      }),
    )
  })

  test('uses deterministic commit message format', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-13T12:34:56.000Z'))

    const request = makeRequest({
      owner: 'lumio',
      repo: 'app',
      appSlug: 'lumio-app',
      branch: 'main',
      pat: 'github_pat_abcdefghijklmnopqrstuvwxyz123456',
      contentByPath: {
        'README.md': '# Lumio',
      },
    })

    const response = await POST(request)

    expect(response.status).toBe(200)
    expect(createCommitMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'lumio-ai: generate lumio-app (2026-03-13T12:34:56.000Z)',
      }),
    )
  })
})

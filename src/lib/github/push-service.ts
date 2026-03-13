import { Octokit } from '@octokit/rest'

type FileManifest = Record<string, string>

export type PushToGitHubInput = {
  owner: string
  repo: string
  pat: string
  appSlug: string
  branch?: string
  contentByPath: FileManifest
  timestamp?: Date
}

export type PushToGitHubResult = {
  usedBranch: string
  commitSha: string
  commitMessage: string
}

const DEFAULT_BRANCH_FALLBACK = 'main'

const isNotFoundError = (error: unknown): boolean => {
  return typeof error === 'object' && error !== null && 'status' in error && (error as { status?: number }).status === 404
}

const resolveBranch = async (
  octokit: Octokit,
  owner: string,
  repo: string,
  preferredBranch: string,
): Promise<{ name: string; headCommitSha: string }> => {
  try {
    const response = await octokit.repos.getBranch({ owner, repo, branch: preferredBranch })
    return {
      name: preferredBranch,
      headCommitSha: response.data.commit.sha,
    }
  } catch (error) {
    if (!isNotFoundError(error)) {
      throw error
    }
  }

  // If main also doesn't exist, Octokit will throw and bubble up to the caller
  const fallback = await octokit.repos.getBranch({ owner, repo, branch: DEFAULT_BRANCH_FALLBACK })
  return {
    name: DEFAULT_BRANCH_FALLBACK,
    headCommitSha: fallback.data.commit.sha,
  }
}

const buildCommitMessage = (appSlug: string, timestamp: Date): string => {
  return `lumio-ai: generate ${appSlug} (${timestamp.toISOString()})`
}

const validatePat = (pat: string): boolean => {
  return /^(gh[pousr]_[A-Za-z0-9_-]{20,}|github_pat_[A-Za-z0-9_-]{20,})$/.test(pat)
}

export const pushToGitHub = async (input: PushToGitHubInput): Promise<PushToGitHubResult> => {
  if (!validatePat(input.pat)) {
    throw new Error('Invalid PAT')
  }

  const octokit = new Octokit({ auth: input.pat })
  const branchInfo = await resolveBranch(octokit, input.owner, input.repo, input.branch || DEFAULT_BRANCH_FALLBACK)
  const commitMessage = buildCommitMessage(input.appSlug, input.timestamp ?? new Date())

  const baseCommit = await octokit.git.getCommit({
    owner: input.owner,
    repo: input.repo,
    commit_sha: branchInfo.headCommitSha,
  })

  const entries = Object.entries(input.contentByPath).sort(([left], [right]) => left.localeCompare(right))

  const createdTree = await octokit.git.createTree({
    owner: input.owner,
    repo: input.repo,
    base_tree: baseCommit.data.tree.sha,
    tree: entries.map(([path, content]) => ({
      path,
      mode: '100644',
      type: 'blob',
      content,
    })),
  })

  const createdCommit = await octokit.git.createCommit({
    owner: input.owner,
    repo: input.repo,
    message: commitMessage,
    tree: createdTree.data.sha,
    parents: [branchInfo.headCommitSha],
  })

  await octokit.git.updateRef({
    owner: input.owner,
    repo: input.repo,
    ref: `heads/${branchInfo.name}`,
    sha: createdCommit.data.sha,
    force: false,
  })

  return {
    usedBranch: branchInfo.name,
    commitSha: createdCommit.data.sha,
    commitMessage,
  }
}

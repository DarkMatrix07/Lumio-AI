import { z } from 'zod'

import { validateCsrfToken } from '@/lib/security/csrf'
import { checkOrigin } from '@/lib/security/origin-check'
import { checkRateLimit } from '@/lib/security/rate-limit'

const DeployRequestSchema = z.object({
    projectName: z.string().min(1).regex(/^[a-z0-9-]+$/, 'Project name can only contain lowercase letters, numbers, and hyphens'),
    token: z.string().min(1),
    html: z.string(),
})

export async function POST(request: Request): Promise<Response> {
    const originResult = checkOrigin(request)
    if (!originResult.ok) {
        return Response.json({ error: originResult.reason }, { status: 403 })
    }

    const csrfResult = validateCsrfToken(request)
    if (!csrfResult.ok) {
        return Response.json({ error: csrfResult.reason }, { status: 403 })
    }

    const ipHeader = request.headers.get('x-forwarded-for')
    const rateLimitKey = ipHeader?.split(',')[0]?.trim() || request.headers.get('Origin') || 'anonymous'
    const rateLimit = checkRateLimit(rateLimitKey)
    if (!rateLimit.allowed) {
        return Response.json(
            { error: 'Rate limit exceeded', retryAfterSeconds: rateLimit.retryAfterSeconds },
            { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } },
        )
    }

    let rawBody: unknown
    try {
        rawBody = await request.json()
    } catch {
        return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const parsed = DeployRequestSchema.safeParse(rawBody)
    if (!parsed.success) {
        return Response.json({ error: 'Invalid request body', details: parsed.error.flatten() }, { status: 400 })
    }

    const { projectName, token, html } = parsed.data

    try {
        const vercelRes = await fetch('https://api.vercel.com/v13/deployments', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: projectName,
                target: 'production',
                files: [
                    {
                        file: 'index.html',
                        data: html,
                    },
                ],
                projectSettings: {
                    framework: null,
                },
            }),
        })

        const data = (await vercelRes.json()) as Record<string, unknown>

        if (!vercelRes.ok) {
            if (vercelRes.status === 401 || vercelRes.status === 403) {
                return Response.json({ error: 'Invalid Vercel Access Token' }, { status: 401 })
            }
            return Response.json({ error: typeof data.error === 'object' && data.error ? (data.error as any).message : 'Deployment failed on Vercel' }, { status: vercelRes.status })
        }

        return Response.json({ url: `https://${data.url}` })
    } catch (error) {
        console.error('Vercel Deploy API failed', { error: error instanceof Error ? error.message : String(error) })
        return Response.json({ error: 'Deployment failed' }, { status: 500 })
    }
}

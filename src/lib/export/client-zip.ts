import JSZip from 'jszip'

type FileManifest = Record<string, string>

const normalizeZipPath = (filePath: string): string => {
  const normalized = filePath.trim().replace(/\\/g, '/')
  const segments = normalized.split('/')

  if (!normalized || normalized.startsWith('/') || /^[a-zA-Z]:\//.test(normalized)) {
    throw new Error(`Invalid zip path: ${filePath}`)
  }

  if (segments.some((segment) => segment === '..' || segment === '')) {
    throw new Error(`Invalid zip path: ${filePath}`)
  }

  return normalized
}

export const buildExportFilename = (date: Date = new Date()): string => {
  const timestamp = date.toISOString().replace(/[:.]/g, '-')
  return `lumio-ai-${timestamp}.zip`
}

export const buildProjectZip = async (manifest: FileManifest): Promise<Blob> => {
  const zip = new JSZip()
  const entries = Object.entries(manifest).sort(([left], [right]) => left.localeCompare(right))

  for (const [filePath, content] of entries) {
    const normalizedPath = normalizeZipPath(filePath)
    zip.file(normalizedPath, content)
  }

  return zip.generateAsync({ type: 'blob' })
}

const allowedProtocols = new Set(['http:', 'https:', 'mailto:'])

export function isSafeDocxHref(rawHref: string | null): boolean {
  if (!rawHref || rawHref.trim().length === 0) return false
  try {
    return allowedProtocols.has(new URL(rawHref, 'https://paperlingo.local').protocol)
  } catch {
    return false
  }
}

export function sanitizeDocxLinks(container: ParentNode): void {
  container.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((link) => {
    if (!isSafeDocxHref(link.getAttribute('href'))) {
      link.removeAttribute('href')
      link.setAttribute('aria-disabled', 'true')
      return
    }
    link.setAttribute('rel', 'noopener noreferrer')
    link.setAttribute('target', '_blank')
  })
}

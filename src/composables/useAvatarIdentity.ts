/**
 * Identidad visual determinista para avatares: iniciales y tono derivados del nombre.
 * La comparten BaseAvatar y BaseWorkspaceAvatar para que un mismo cliente
 * se vea igual en toda la app aunque no tenga imagen.
 */

export function avatarInitials(name: string | null | undefined): string {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean)
  const first = parts[0]
  if (!first) return '?'
  if (parts.length === 1) return first.slice(0, 2).toUpperCase()
  const last = parts[parts.length - 1] ?? ''
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase()
}

export function avatarHue(name: string | null | undefined): number {
  const source = name || '?'
  let hash = 0
  for (let i = 0; i < source.length; i += 1) {
    hash = (hash << 5) - hash + source.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash) % 360
}

export function avatarTint(name: string | null | undefined): Record<string, string> {
  const hue = avatarHue(name)
  return {
    background: `linear-gradient(135deg, hsl(${hue} 62% 58%) 0%, hsl(${(hue + 38) % 360} 58% 45%) 100%)`,
  }
}

export function useAvatarIdentity() {
  return { avatarInitials, avatarHue, avatarTint }
}

import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'

export interface NavItem {
  name: string
  path: string
  title: string
  icon: string
}

const ORDER = [
  'Dashboard',
  'Collections',
  'Clients',
  'Payments',
  'Bank',
  'Churn',
  'Workspaces',
  'Users',
  'Settings',
]

const PRIMARY = ['Dashboard', 'Collections', 'Clients', 'Payments']

export function useNavItems() {
  const router = useRouter()
  const userStore = useUserStore()

  const items = computed<NavItem[]>(() => {
    const role = userStore.user?.role ?? null

    return router
      .getRoutes()
      .filter((route) => {
        const meta = route.meta as Record<string, unknown>
        if (!meta?.icon || meta?.hideInNav) return false
        const roles = meta.roles as string[] | undefined
        if (roles?.length) return !!role && roles.includes(role)
        return true
      })
      .map((route) => {
        const meta = route.meta as Record<string, unknown>
        return {
          name: String(route.name ?? route.path),
          path: route.path || '/',
          title: String(meta.title ?? route.name ?? ''),
          icon: String(meta.icon),
        }
      })
      .sort((a, b) => {
        const ia = ORDER.indexOf(a.name)
        const ib = ORDER.indexOf(b.name)
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
      })
  })

  const primaryItems = computed<NavItem[]>(() =>
    items.value.filter((item) => PRIMARY.includes(item.name)),
  )

  const secondaryItems = computed<NavItem[]>(() =>
    items.value.filter((item) => !PRIMARY.includes(item.name)),
  )

  return { items, primaryItems, secondaryItems }
}

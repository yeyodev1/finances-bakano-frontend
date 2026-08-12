import { useAppVersion } from '@/composables/useAppVersion'
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/LoginView'),
    meta: { title: 'Ingresar', public: true, layout: 'blank' },
  },
  {
    path: '/',
    component: () => import('@/layout/AppLayout'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'Dashboard',
        component: () => import('@/views/DashboardView'),
        meta: { title: 'Resumen', icon: 'fa-solid fa-chart-pie', requiresAuth: true },
      },
      {
        path: 'cobros',
        name: 'Collections',
        component: () => import('@/views/CollectionsView'),
        meta: { title: 'Cobros del mes', icon: 'fa-solid fa-file-invoice-dollar', requiresAuth: true },
      },
      {
        path: 'clientes',
        name: 'Clients',
        component: () => import('@/views/ClientsView'),
        meta: { title: 'Clientes', icon: 'fa-solid fa-users', requiresAuth: true },
      },
      {
        path: 'clientes/:id',
        name: 'ClientDetail',
        component: () => import('@/views/ClientDetailView'),
        meta: { title: 'Ficha del cliente', requiresAuth: true, hideInNav: true },
      },
      {
        path: 'bajas',
        name: 'Churn',
        component: () => import('@/views/ChurnView'),
        meta: { title: 'Bajas', icon: 'fa-solid fa-user-slash', requiresAuth: true },
      },
      {
        path: 'ventas',
        name: 'Sales',
        component: () => import('@/views/SalesView'),
        meta: { title: 'Ventas', icon: 'fa-solid fa-handshake', requiresAuth: true },
      },
      {
        path: 'pagos',
        name: 'Payments',
        component: () => import('@/views/PaymentsView'),
        meta: { title: 'Pagos', icon: 'fa-solid fa-receipt', requiresAuth: true },
      },
      {
        path: 'banco',
        name: 'Bank',
        component: () => import('@/views/BankView'),
        meta: {
          title: 'Banco',
          icon: 'fa-solid fa-building-columns',
          requiresAuth: true,
          roles: ['superadmin', 'admin'],
        },
      },
      {
        path: 'espacios',
        name: 'Workspaces',
        component: () => import('@/views/WorkspacesView'),
        meta: { title: 'Espacios', icon: 'fa-solid fa-layer-group', requiresAuth: true },
      },
      {
        path: 'usuarios',
        name: 'Users',
        component: () => import('@/views/UsersView'),
        meta: { title: 'Usuarios', icon: 'fa-solid fa-user-shield', requiresAuth: true, roles: ['superadmin'] },
      },
      {
        path: 'ajustes',
        name: 'Settings',
        component: () => import('@/views/SettingsView'),
        meta: { title: 'Ajustes', icon: 'fa-solid fa-gear', requiresAuth: true },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFoundView'),
    meta: { title: 'Página no encontrada', public: true, layout: 'blank' },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { left: 0, top: 0, behavior: 'smooth' }
  },
})

router.beforeEach((to, _from, next) => {
  const hasToken = !!localStorage.getItem('access_token')
  const requiresAuth = to.matched.some((record) => record.meta?.requiresAuth)

  document.title = to.meta?.title ? `${to.meta.title} · Bakano Finanzas` : 'Bakano Finanzas'

  if (requiresAuth && !hasToken) {
    return next({ path: '/login', replace: true })
  }

  if (to.path === '/login' && hasToken) {
    return next({ path: '/', replace: true })
  }

  next()
})

// Sonido al llegar a otra pantalla. `afterEach` y no `beforeEach`: solo suena si
// la navegación de verdad ocurrió, no cuando un guard la redirige.
router.afterEach((to, from) => {
  if (!from.name || to.fullPath === from.fullPath) return
  void import('@/composables/useSound').then(({ useSound }) => useSound().cue('navegar'))
})

/**
 * Un cliente con la pestaña vieja pide chunks que el despliegue nuevo ya borró,
 * y la navegación muere con "Failed to fetch dynamically imported module" sin
 * que el usuario entienda nada. Se marca la versión como caducada y se recarga
 * en la ruta pedida: al volver, el bundle ya es el nuevo.
 */
router.onError((error, to) => {
  const message = String((error as Error)?.message ?? '')
  const isStaleChunk =
    /dynamically imported module|Importing a module script failed|Failed to fetch/i.test(message)
  if (!isStaleChunk) return

  const { flagStale } = useAppVersion()
  flagStale()

  // Solo se recarga una vez por destino: si el fallo fuera otro, un reintento
  // en bucle dejaría la aplicación recargándose para siempre.
  const key = `reloaded:${to.fullPath}`
  if (sessionStorage.getItem(key)) return
  sessionStorage.setItem(key, '1')
  window.location.assign(to.fullPath)
})

export default router

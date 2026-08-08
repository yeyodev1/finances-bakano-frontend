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
        path: 'pagos',
        name: 'Payments',
        component: () => import('@/views/PaymentsView'),
        meta: { title: 'Pagos', icon: 'fa-solid fa-receipt', requiresAuth: true },
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

export default router

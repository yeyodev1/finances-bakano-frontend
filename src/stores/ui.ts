import { defineStore } from 'pinia'

const COLLAPSE_KEY = 'ui:sidebar-collapsed'

export interface UiState {
  sidebarCollapsed: boolean
  mobileDrawerOpen: boolean
  pageTitle: string
}

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === '1'
  } catch {
    return false
  }
}

export const useUiStore = defineStore('ui', {
  state: (): UiState => ({
    sidebarCollapsed: readCollapsed(),
    mobileDrawerOpen: false,
    pageTitle: 'Resumen',
  }),

  actions: {
    setSidebarCollapsed(value: boolean) {
      this.sidebarCollapsed = value
      try {
        localStorage.setItem(COLLAPSE_KEY, value ? '1' : '0')
      } catch {
        /* storage no disponible */
      }
    },

    toggleSidebar() {
      this.setSidebarCollapsed(!this.sidebarCollapsed)
    },

    openDrawer() {
      this.mobileDrawerOpen = true
    },

    closeDrawer() {
      this.mobileDrawerOpen = false
    },

    toggleDrawer() {
      this.mobileDrawerOpen = !this.mobileDrawerOpen
    },

    setPageTitle(title: string) {
      this.pageTitle = title
    },
  },
})

export default useUiStore

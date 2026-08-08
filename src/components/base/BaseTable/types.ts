export type TableAlign = 'left' | 'center' | 'right'

export interface TableColumn {
  key: string
  label: string
  /** 'left' | 'center' | 'right'. Se acepta `string` para facilitar columnas construidas dinámicamente. */
  align?: TableAlign | string
  width?: string
  sortable?: boolean
  /** Oculta la columna en la vista de tarjetas (móvil). */
  hideOnMobile?: boolean
}

export type SortDirection = 'asc' | 'desc'

export interface TableSort {
  key: string
  dir: SortDirection
}

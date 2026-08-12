/**
 * Barrel de la librería de componentes base.
 * Uso: `import { BaseButton, BaseModal } from '@/components/base'`
 */

export { BaseAvatar } from './BaseAvatar'
export { BaseBadge, BADGE_LABELS, BADGE_ICONS } from './BaseBadge'
export { BaseButton } from './BaseButton'
export { BaseCard } from './BaseCard'
export { BaseConfirmDialog, BaseConfirmHost } from './BaseConfirmDialog'
export { BaseCurrencyInput } from './BaseCurrencyInput'
export { BaseDatePicker, BaseDatePickerPanel } from './BaseDatePicker'
export { BaseDayPicker } from './BaseDayPicker'
export { BaseDrawer } from './BaseDrawer'
export { BaseEmptyState } from './BaseEmptyState'
export { BaseFileDropzone } from './BaseFileDropzone'
export { BaseInput } from './BaseInput'
export { BaseModal } from './BaseModal'
export { BaseMonthPicker } from './BaseMonthPicker'
export { BasePagination } from './BasePagination'
export { BaseSearchInput } from './BaseSearchInput'
export { BaseSelect, BaseSelectOption, BaseSelectPanel, BaseSelectTrigger } from './BaseSelect'
export { BaseSkeleton } from './BaseSkeleton'
export { BaseStatCard } from './BaseStatCard'
export { BaseSwitch } from './BaseSwitch'
export { BaseTable } from './BaseTable'
export { BaseTabs } from './BaseTabs'
export { BaseTextarea } from './BaseTextarea'
export { BaseToast, BaseToastItem } from './BaseToast'
export { BaseWorkspaceAvatar } from './BaseWorkspaceAvatar'

// ── Tipos públicos ───────────────────────────────────────────────
export type { BadgeVariant, BadgeStatus, BadgeTone, BadgeSize, BadgeProps } from './BaseBadge'
export type { ButtonVariant, ButtonSize, ButtonProps } from './BaseButton'
export type { TableColumn, TableSort, SortDirection, TableAlign } from './BaseTable'
export type { TabItem } from './BaseTabs'

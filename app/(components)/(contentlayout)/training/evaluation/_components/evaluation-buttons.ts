/** Shared button classes for Evaluation — 44px touch targets, focus rings, loading/disabled parity */

export const EVAL_BTN_BASE =
  'ti-btn inline-flex items-center justify-center gap-1.5 !text-sm min-h-[44px] transition-colors duration-150 motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed'

export const EVAL_BTN_PRIMARY = `${EVAL_BTN_BASE} ti-btn-primary-full !py-2 !px-4`
export const EVAL_BTN_OUTLINE_PRIMARY = `${EVAL_BTN_BASE} ti-btn-outline-primary !py-2 !px-4`
export const EVAL_BTN_OUTLINE_SECONDARY = `${EVAL_BTN_BASE} ti-btn-outline-secondary !py-2 !px-4`
export const EVAL_BTN_DANGER = `${EVAL_BTN_BASE} ti-btn-danger !py-2 !px-4`
export const EVAL_BTN_LIGHT = `${EVAL_BTN_BASE} ti-btn-light !py-2 !px-4`

export const EVAL_BTN_TAB_ACTIVE =
  `${EVAL_BTN_BASE} ti-btn-primary-full !rounded-lg !py-2 !px-4 !border-0 shadow-sm`
export const EVAL_BTN_TAB_INACTIVE =
  `${EVAL_BTN_BASE} ti-btn-light !rounded-lg !py-2 !px-4 !border-0 !bg-transparent text-defaulttextcolor/75 hover:text-defaulttextcolor hover:!bg-black/5 dark:hover:!bg-white/5`

export const EVAL_BTN_LINK =
  'inline-flex items-center text-primary font-semibold text-[0.9375rem] text-start hover:underline underline-offset-2 cursor-pointer rounded-md px-2 py-2 min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 transition-colors duration-150'

export const EVAL_BTN_TEXT =
  'inline-flex items-center gap-1.5 text-sm font-medium text-defaulttextcolor/80 hover:text-primary w-fit min-h-[44px] px-2 py-2 rounded-md cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:opacity-50 disabled:cursor-wait transition-colors duration-150'

export const EVAL_BTN_ICON_CLOSE =
  'ti-btn inline-flex items-center justify-center flex-shrink-0 min-h-[44px] min-w-[44px] rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-white/50 dark:hover:text-white/80 dark:hover:bg-black/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 transition-colors duration-150'

export const EVAL_PAGE_LINK =
  'page-link inline-flex items-center justify-center px-3 min-h-[44px] min-w-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-sm transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed'

export const EVAL_TH_SORTABLE =
  'cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40'

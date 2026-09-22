import './curriculum-modules-scroll.css'

/** Visible inner-list scrollbar; overrides global `::-webkit-scrollbar { width: 0 }`. */
export const MODULES_LIST_SCROLL_CLASS =
  'curriculum-modules-scroll overflow-y-auto overflow-x-hidden max-h-[calc(100vh-13.5rem)] pr-1 ' +
  '[scrollbar-gutter:stable] [scrollbar-width:thin] ' +
  '[scrollbar-color:rgba(0,0,0,0.32)_rgba(0,0,0,0.06)] ' +
  'dark:[scrollbar-color:rgba(255,255,255,0.42)_rgba(255,255,255,0.12)] ' +
  '[&::-webkit-scrollbar]:!w-2.5 [&::-webkit-scrollbar]:!h-2.5 ' +
  '[&::-webkit-scrollbar-track]:!bg-black/5 dark:[&::-webkit-scrollbar-track]:!bg-white/10 ' +
  '[&::-webkit-scrollbar-thumb]:!rounded-full [&::-webkit-scrollbar-thumb]:!bg-black/30 ' +
  'dark:[&::-webkit-scrollbar-thumb]:!bg-white/40'

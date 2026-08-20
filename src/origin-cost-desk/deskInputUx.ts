import type { KeyboardEvent as ReactKeyboardEvent } from 'react'

/** After click-focus, mouseup clears select(); call from onMouseUp when flagged. */
export function preserveSelectAllOnMouseUp(
  event: { preventDefault(): void; currentTarget: HTMLInputElement },
  shouldSelect: { current: boolean },
) {
  if (!shouldSelect.current) return
  event.preventDefault()
  event.currentTarget.select()
  shouldSelect.current = false
}

/** Move to another cell on ←/→ only when caret is at edge or all text is selected. */
export function shouldNavigateHorizontal(
  el: HTMLInputElement | HTMLSelectElement,
  key: 'ArrowLeft' | 'ArrowRight',
): boolean {
  if (!('value' in el) || typeof el.value !== 'string') return true
  if (!('selectionStart' in el) || el.selectionStart == null || el.selectionEnd == null) {
    return true
  }
  const start = el.selectionStart
  const end = el.selectionEnd
  const len = el.value.length
  if (start !== end) return start === 0 && end === len
  if (key === 'ArrowLeft') return start === 0
  return end === len
}

export function attachSelectAllHandlers(el: HTMLInputElement | null) {
  if (!el) return
  const onFocus = () => {
    el.dataset.selectAll = '1'
    el.select()
  }
  const onMouseUp = (event: MouseEvent) => {
    if (el.dataset.selectAll === '1') {
      event.preventDefault()
      el.select()
      delete el.dataset.selectAll
    }
  }
  const onBlur = () => {
    delete el.dataset.selectAll
  }
  el.addEventListener('focus', onFocus)
  el.addEventListener('mouseup', onMouseUp)
  el.addEventListener('blur', onBlur)
  return () => {
    el.removeEventListener('focus', onFocus)
    el.removeEventListener('mouseup', onMouseUp)
    el.removeEventListener('blur', onBlur)
  }
}

/** Props helpers for plain controlled inputs (cargo / 예외). */
export function selectAllFocusProps() {
  return {
    onFocus: (event: { currentTarget: HTMLInputElement }) => {
      event.currentTarget.dataset.selectAll = '1'
      event.currentTarget.select()
    },
    onMouseUp: (event: {
      preventDefault(): void
      currentTarget: HTMLInputElement
    }) => {
      if (event.currentTarget.dataset.selectAll === '1') {
        event.preventDefault()
        event.currentTarget.select()
        delete event.currentTarget.dataset.selectAll
      }
    },
    onBlur: (event: { currentTarget: HTMLInputElement }) => {
      delete event.currentTarget.dataset.selectAll
    },
  }
}

export function handleArrowNav(
  event: ReactKeyboardEvent<HTMLInputElement | HTMLSelectElement>,
  nav: {
    enter?: string
    up?: string
    down?: string
    left?: string
    right?: string
  },
  focusCell: (id: string) => void,
) {
  if (event.key === 'Enter') {
    event.preventDefault()
    if (nav.enter) focusCell(nav.enter)
    return
  }
  if (event.key === 'ArrowUp' && nav.up) {
    event.preventDefault()
    focusCell(nav.up)
    return
  }
  if (event.key === 'ArrowDown' && nav.down) {
    event.preventDefault()
    focusCell(nav.down)
    return
  }
  if (event.key === 'ArrowLeft' && nav.left) {
    if (!shouldNavigateHorizontal(event.currentTarget, 'ArrowLeft')) return
    event.preventDefault()
    focusCell(nav.left)
    return
  }
  if (event.key === 'ArrowRight' && nav.right) {
    if (!shouldNavigateHorizontal(event.currentTarget, 'ArrowRight')) return
    event.preventDefault()
    focusCell(nav.right)
  }
}

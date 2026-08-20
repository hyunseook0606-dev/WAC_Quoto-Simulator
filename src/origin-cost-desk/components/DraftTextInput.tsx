import {
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'

type Props = {
  value: string
  onCommit: (next: string) => void
  normalize?: (raw: string) => string
  onKeyDown?: (event: ReactKeyboardEvent<HTMLInputElement>) => void
  inputRef?: (el: HTMLInputElement | null) => void
  className?: string
  onFocus?: (event: FocusEvent<HTMLInputElement>) => void
  onBlur?: (event: FocusEvent<HTMLInputElement>) => void
  onClick?: (event: React.MouseEvent<HTMLInputElement>) => void
  placeholder?: string
  title?: string
}

/** Keeps local draft while focused so controlled parents do not reset cursor mid-typing. */
export function DraftTextInput({
  value,
  onCommit,
  normalize,
  onKeyDown,
  inputRef,
  className,
  onFocus,
  onBlur,
  onClick,
  placeholder,
  title,
}: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const draftRef = useRef('')
  const selectAllOnMouseUp = useRef(false)

  const shown = editing ? draft : value

  return (
    <input
      ref={inputRef}
      type="text"
      value={shown}
      placeholder={placeholder}
      title={title}
      className={className}
      onFocus={(event) => {
        const initial = value
        draftRef.current = initial
        setDraft(initial)
        setEditing(true)
        selectAllOnMouseUp.current = true
        event.currentTarget.select()
        onFocus?.(event)
      }}
      onMouseUp={(event) => {
        if (selectAllOnMouseUp.current) {
          event.preventDefault()
          event.currentTarget.select()
          selectAllOnMouseUp.current = false
        }
      }}
      onBlur={(event) => {
        setEditing(false)
        selectAllOnMouseUp.current = false
        const normalized = normalize ? normalize(draftRef.current) : draftRef.current
        if (normalized !== value) onCommit(normalized)
        onBlur?.(event)
      }}
      onChange={(event) => {
        draftRef.current = event.target.value
        setDraft(event.target.value)
      }}
      onClick={onClick}
      onKeyDown={onKeyDown}
    />
  )
}

export function parseRouteDraft(raw: string): { origin: string; destination: string } {
  const v = raw.toUpperCase().replace(/[^A-Z0-9-]/g, '')
  const dash = v.indexOf('-')
  if (dash < 0) {
    return { origin: v.slice(0, 8), destination: '' }
  }
  return {
    origin: v.slice(0, dash).slice(0, 8),
    destination: v.slice(dash + 1).replace(/-/g, '').slice(0, 8),
  }
}

export function formatRoute(origin: string, destination: string): string {
  return `${origin}${destination ? `-${destination}` : ''}`
}

import { useEffect, useRef } from 'react'

const COMMANDS = [
  { cmd: 'bold', label: 'B', title: 'Bold', style: { fontWeight: 700 } },
  { cmd: 'italic', label: 'I', title: 'Italic', style: { fontStyle: 'italic' } },
  { cmd: 'underline', label: 'U', title: 'Underline', style: { textDecoration: 'underline' } },
  { cmd: 'formatBlock', arg: 'h2', label: 'H2', title: 'Heading 2' },
  { cmd: 'formatBlock', arg: 'h3', label: 'H3', title: 'Heading 3' },
  { cmd: 'insertUnorderedList', label: '• List', title: 'Bullet list' },
  { cmd: 'insertOrderedList', label: '1. List', title: 'Numbered list' },
]

export default function RichEditor({ value, onChange, placeholder = 'Write content...' }) {
  const ref = useRef(null)

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== (value || '')) {
      ref.current.innerHTML = value || ''
    }
  }, [value])

  const exec = (cmd, arg) => {
    ref.current?.focus()
    document.execCommand(cmd, false, arg)
    onChange?.(ref.current.innerHTML)
  }

  const addLink = () => {
    const url = window.prompt('Enter URL')
    if (url) exec('createLink', url)
  }

  return (
    <div className="rich-editor">
      <div className="rich-toolbar">
        {COMMANDS.map((c) => (
          <button
            type="button"
            key={c.label}
            title={c.title}
            style={c.style}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => exec(c.cmd, c.arg)}
          >
            {c.label}
          </button>
        ))}
        <button
          type="button"
          title="Insert link"
          onMouseDown={(e) => e.preventDefault()}
          onClick={addLink}
        >
          Link
        </button>
        <button
          type="button"
          title="Clear formatting"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec('removeFormat')}
        >
          Clear
        </button>
      </div>
      <div
        ref={ref}
        className="rich-content"
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={(e) => onChange?.(e.currentTarget.innerHTML)}
      />
    </div>
  )
}

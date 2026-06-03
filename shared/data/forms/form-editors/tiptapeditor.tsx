"use client"
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import { TextStyle, FontSize, FontFamily, Color } from '@tiptap/extension-text-style'
import TextAlign from '@tiptap/extension-text-align'
import { useEffect, useRef, useState } from 'react'

/** Font-size choices for the toolbar dropdown (value is the CSS font-size). */
const FONT_SIZES: { label: string; value: string }[] = [
  { label: '10', value: '10px' },
  { label: '11', value: '11px' },
  { label: '12', value: '12px' },
  { label: '13', value: '13px' },
  { label: '14', value: '14px' },
  { label: '16', value: '16px' },
  { label: '18', value: '18px' },
  { label: '20', value: '20px' },
  { label: '24', value: '24px' },
  { label: '28', value: '28px' },
  { label: '32', value: '32px' },
  { label: '36', value: '36px' },
  { label: '48', value: '48px' },
  { label: '60', value: '60px' },
  { label: '72', value: '72px' },
]

/** Font-family choices for the toolbar dropdown. */
const FONT_FAMILIES: { label: string; value: string }[] = [
  { label: 'Inter', value: 'Inter, sans-serif' },
  { label: 'Poppins', value: 'Poppins, sans-serif' },
  { label: 'Montserrat', value: 'Montserrat, sans-serif' },
  { label: 'Roboto', value: 'Roboto, sans-serif' },
  { label: 'Open Sans', value: '"Open Sans", sans-serif' },
  { label: 'Lato', value: 'Lato, sans-serif' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Helvetica', value: 'Helvetica, Arial, sans-serif' },
  { label: 'Verdana', value: 'Verdana, sans-serif' },
  { label: 'Tahoma', value: 'Tahoma, sans-serif' },
  { label: 'Trebuchet MS', value: '"Trebuchet MS", sans-serif' },
  { label: 'Calibri', value: 'Calibri, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Garamond', value: 'Garamond, serif' },
  { label: 'Times New Roman', value: '"Times New Roman", serif' },
  { label: 'Courier New', value: '"Courier New", monospace' },
  { label: 'Consolas', value: 'Consolas, monospace' },
]

/**
 * Allow only safe link schemes (block javascript:/data:/vbscript: etc.).
 * Permits http, https, mailto, tel, and relative/anchor URLs.
 */
function isSafeLinkUrl(url: string): boolean {
  const trimmed = url.trim()
  if (!trimmed) return false
  // Protocol-relative URLs (//evil.com) navigate off-site — treat as absolute, not relative.
  if (/^\/\//.test(trimmed)) return false
  // Relative, root-relative, or anchor links are safe.
  if (/^(\/|\.|#|\?)/.test(trimmed)) return true
  try {
    const scheme = new URL(trimmed, 'https://base.invalid').protocol
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(scheme)
  } catch {
    return false
  }
}

/** Image src must be a fetchable http/https URL (file uploads use data: via setImage directly). */
function isSafeImageUrl(url: string): boolean {
  const trimmed = url.trim()
  if (!trimmed) return false
  try {
    const scheme = new URL(trimmed, 'https://base.invalid').protocol
    return ['http:', 'https:'].includes(scheme)
  } catch {
    return false
  }
}

interface TiptapEditorProps {
  content?: string
  placeholder?: string
  onChange?: (html: string) => void
  editable?: boolean
  className?: string
  toolbarClassName?: string
  contentClassName?: string
  /** Enable browser spellcheck (red underlines for typos in real time). Default true. */
  spellCheck?: boolean
}

const TiptapEditor: React.FC<TiptapEditorProps> = ({
  content = '',
  placeholder = 'Start typing...',
  onChange,
  editable = true,
  className = '',
  toolbarClassName = '',
  contentClassName = '',
  spellCheck = true,
}) => {
  const editor = useEditor({
    immediatelyRender: false,
    editorProps: {
      attributes: {
        spellcheck: spellCheck ? 'true' : 'false',
      },
    },
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      TextStyle,
      FontSize,
      FontFamily,
      Color,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      if (onChange) {
        onChange(editor.getHTML())
      }
    },
  })

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      // emitUpdate:false so this prop-sync does not re-fire onUpdate → parent
      // setState, which can cause edit-page form state to bounce / append duplicates.
      // (Tiptap v3 SetContentOptions shape — `false` boolean signature is v2-only.)
      editor.commands.setContent(content || '', { emitUpdate: false })
    }
  }, [content, editor])

  // Inline link/image insertion popover (replaces native window.prompt).
  const [popover, setPopover] = useState<null | 'link' | 'image'>(null)
  const [popoverValue, setPopoverValue] = useState('')
  const [popoverError, setPopoverError] = useState('')
  const popoverInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  /** Uploaded images embed as base64 data URIs so the saved HTML stays self-contained
   *  (no expiring presigned URLs). Cap size to avoid bloating the stored description. */
  const MAX_IMAGE_BYTES = 1.5 * 1024 * 1024

  useEffect(() => {
    if (popover && popoverInputRef.current) {
      popoverInputRef.current.focus()
      popoverInputRef.current.select()
    }
  }, [popover])

  const closePopover = () => {
    setPopover(null)
    setPopoverValue('')
    setPopoverError('')
  }

  const openLinkPopover = () => {
    if (!editor) return
    setPopoverValue(editor.getAttributes('link').href || '')
    setPopoverError('')
    setPopover('link')
  }

  const openImagePopover = () => {
    setPopoverValue('')
    setPopoverError('')
    setPopover('image')
  }

  const onImageFileSelected = (file?: File | null) => {
    if (!file || !editor) return
    if (!file.type.startsWith('image/')) {
      setPopoverError('Please choose an image file.')
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setPopoverError('Image is larger than 1.5 MB. Compress it or paste an image URL instead.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      editor.chain().focus().setImage({ src: String(reader.result) }).run()
      closePopover()
    }
    reader.onerror = () => setPopoverError('Could not read that file. Please try again.')
    reader.readAsDataURL(file)
  }

  const submitPopover = () => {
    if (!editor) return
    const url = popoverValue.trim()
    if (popover === 'link') {
      if (!url) {
        editor.chain().focus().extendMarkRange('link').unsetLink().run()
      } else if (!isSafeLinkUrl(url)) {
        setPopoverError('Enter a valid http(s), mailto, or tel link.')
        return
      } else if (editor.state.selection.empty) {
        // No selection: insert the URL itself as a clickable link.
        // Structured insert (not string HTML) so the URL can never be parsed as markup.
        editor.chain().focus().insertContent({
          type: 'text',
          text: url,
          marks: [{ type: 'link', attrs: { href: url } }],
        }).run()
      } else {
        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
      }
    } else if (popover === 'image' && url) {
      if (!isSafeImageUrl(url)) {
        setPopoverError('Enter a valid http(s) image URL.')
        return
      }
      editor.chain().focus().setImage({ src: url }).run()
    }
    closePopover()
  }

  const removeLink = () => {
    if (!editor) return
    editor.chain().focus().extendMarkRange('link').unsetLink().run()
    closePopover()
  }

  if (!editor) {
    return null
  }

  const linkActive = editor.isActive('link')

  return (
    <div className={`tiptap-editor ${className}`}>
      <div
        className={['tiptap-toolbar border-b dark:border-defaultborder/10 p-2 flex flex-wrap items-center gap-1', toolbarClassName].filter(Boolean).join(' ')}
      >
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!editor.can().chain().focus().toggleBold().run()}
          className={`ti-btn ti-btn-sm ti-btn-light ${editor.isActive('bold') ? '!bg-primary !text-white' : ''}`}
          title="Bold"
        >
          <i className="ri-bold"></i>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
          className={`ti-btn ti-btn-sm ti-btn-light ${editor.isActive('italic') ? '!bg-primary !text-white' : ''}`}
          title="Italic"
        >
          <i className="ri-italic"></i>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`ti-btn ti-btn-sm ti-btn-light ${editor.isActive('underline') ? '!bg-primary !text-white' : ''}`}
          title="Underline"
        >
          <i className="ri-underline"></i>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          disabled={!editor.can().chain().focus().toggleStrike().run()}
          className={`ti-btn ti-btn-sm ti-btn-light ${editor.isActive('strike') ? '!bg-primary !text-white' : ''}`}
          title="Strikethrough"
        >
          <i className="ri-strikethrough"></i>
        </button>
        <div className="border-l dark:border-defaultborder/10 mx-1"></div>
        <select
          value={editor.getAttributes('textStyle').fontFamily || ''}
          onChange={(e) => {
            const v = e.target.value
            if (v) editor.chain().focus().setFontFamily(v).run()
            else editor.chain().focus().unsetFontFamily().run()
          }}
          className="tiptap-select text-xs leading-tight rounded-md border border-gray-200 dark:border-defaultborder/10 bg-white dark:bg-bodybg2 text-defaulttextcolor min-w-[7rem] pl-2 pr-7 py-1.5 cursor-pointer focus:outline-none focus:border-primary"
          title="Font family"
        >
          <option value="">Font</option>
          {FONT_FAMILIES.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <select
          value={editor.getAttributes('textStyle').fontSize || ''}
          onChange={(e) => {
            const v = e.target.value
            if (v) editor.chain().focus().setFontSize(v).run()
            else editor.chain().focus().unsetFontSize().run()
          }}
          className="tiptap-select text-xs leading-tight rounded-md border border-gray-200 dark:border-defaultborder/10 bg-white dark:bg-bodybg2 text-defaulttextcolor min-w-[6.5rem] pl-2 pr-7 py-1.5 cursor-pointer focus:outline-none focus:border-primary"
          title="Font size"
        >
          <option value="">Size</option>
          {FONT_SIZES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <label
          className="ti-btn ti-btn-sm ti-btn-light !h-8 !px-2 cursor-pointer flex items-center gap-1"
          title="Text color"
        >
          <i className="ri-font-color"></i>
          <input
            type="color"
            value={editor.getAttributes('textStyle').color || '#000000'}
            onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
            className="w-4 h-4 border-0 bg-transparent p-0 cursor-pointer"
            aria-label="Text color"
          />
        </label>
        <button
          type="button"
          onClick={() => editor.chain().focus().unsetColor().run()}
          className="ti-btn ti-btn-sm ti-btn-light"
          title="Clear color"
        >
          <i className="ri-format-clear"></i>
        </button>
        <div className="border-l dark:border-defaultborder/10 mx-1"></div>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`ti-btn ti-btn-sm ti-btn-light ${editor.isActive('heading', { level: 1 }) ? '!bg-primary !text-white' : ''}`}
          title="Heading 1"
        >
          H1
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`ti-btn ti-btn-sm ti-btn-light ${editor.isActive('heading', { level: 2 }) ? '!bg-primary !text-white' : ''}`}
          title="Heading 2"
        >
          H2
        </button>
        <div className="border-l dark:border-defaultborder/10 mx-1"></div>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`ti-btn ti-btn-sm ti-btn-light ${editor.isActive('bulletList') ? '!bg-primary !text-white' : ''}`}
          title="Bullet List"
        >
          <i className="ri-list-unordered"></i>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`ti-btn ti-btn-sm ti-btn-light ${editor.isActive('orderedList') ? '!bg-primary !text-white' : ''}`}
          title="Numbered List"
        >
          <i className="ri-list-ordered"></i>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`ti-btn ti-btn-sm ti-btn-light ${editor.isActive('blockquote') ? '!bg-primary !text-white' : ''}`}
          title="Blockquote"
        >
          <i className="ri-double-quotes-l"></i>
        </button>
        <div className="border-l dark:border-defaultborder/10 mx-1"></div>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className={`ti-btn ti-btn-sm ti-btn-light ${
            editor.isActive({ textAlign: 'left' }) ||
            (!editor.isActive({ textAlign: 'center' }) &&
              !editor.isActive({ textAlign: 'right' }) &&
              !editor.isActive({ textAlign: 'justify' }))
              ? '!bg-primary !text-white'
              : ''
          }`}
          title="Align left"
        >
          <i className="ri-align-left"></i>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className={`ti-btn ti-btn-sm ti-btn-light ${editor.isActive({ textAlign: 'center' }) ? '!bg-primary !text-white' : ''}`}
          title="Align center"
        >
          <i className="ri-align-center"></i>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className={`ti-btn ti-btn-sm ti-btn-light ${editor.isActive({ textAlign: 'right' }) ? '!bg-primary !text-white' : ''}`}
          title="Align right"
        >
          <i className="ri-align-right"></i>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          className={`ti-btn ti-btn-sm ti-btn-light ${editor.isActive({ textAlign: 'justify' }) ? '!bg-primary !text-white' : ''}`}
          title="Justify"
        >
          <i className="ri-align-justify"></i>
        </button>
        <div className="border-l dark:border-defaultborder/10 mx-1"></div>
        <button
          type="button"
          onClick={() => (popover === 'link' ? closePopover() : openLinkPopover())}
          className={`ti-btn ti-btn-sm ti-btn-light ${linkActive || popover === 'link' ? '!bg-primary !text-white' : ''}`}
          title="Link"
          aria-haspopup="dialog"
          aria-expanded={popover === 'link'}
        >
          <i className="ri-links-line"></i>
        </button>
        <button
          type="button"
          onClick={() => (popover === 'image' ? closePopover() : openImagePopover())}
          className={`ti-btn ti-btn-sm ti-btn-light ${popover === 'image' ? '!bg-primary !text-white' : ''}`}
          title="Image"
          aria-haspopup="dialog"
          aria-expanded={popover === 'image'}
        >
          <i className="ri-image-line"></i>
        </button>
        <div className="border-l dark:border-defaultborder/10 mx-1"></div>
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().chain().focus().undo().run()}
          className="ti-btn ti-btn-sm ti-btn-light"
          title="Undo"
        >
          <i className="ri-arrow-go-back-line"></i>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().chain().focus().redo().run()}
          className="ti-btn ti-btn-sm ti-btn-light"
          title="Redo"
        >
          <i className="ri-arrow-go-forward-line"></i>
        </button>
      </div>
      {popover && (
        <div
          role="dialog"
          aria-label={popover === 'link' ? 'Insert link' : 'Insert image'}
          className="tiptap-popover flex flex-col gap-2 border-b dark:border-defaultborder/10 bg-gray-50 dark:bg-bodybg2/60 px-3 py-2.5"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.stopPropagation()
              closePopover()
              editor.chain().focus().run()
            }
          }}
        >
          <div className="w-full">
            <label
              htmlFor="tiptap-popover-input"
              className="block text-[0.7rem] font-medium text-textmuted mb-1"
            >
              {popover === 'link' ? 'Link URL' : 'Image URL'}
            </label>
            <div className="flex items-center gap-1.5 rounded-md border border-gray-200 dark:border-defaultborder/10 bg-white dark:bg-bodybg2 px-2 focus-within:border-primary">
              <i
                className={`${popover === 'link' ? 'ri-links-line' : 'ri-image-line'} text-textmuted text-sm`}
                aria-hidden="true"
              ></i>
              <input
                id="tiptap-popover-input"
                ref={popoverInputRef}
                type="url"
                inputMode="url"
                value={popoverValue}
                onChange={(e) => setPopoverValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    submitPopover()
                  }
                }}
                placeholder="https://example.com"
                className="flex-1 h-9 bg-transparent text-sm text-defaulttextcolor placeholder:text-textmuted/70 focus:outline-none"
              />
            </div>
          </div>
          {popoverError && (
            <p
              role="alert"
              aria-live="polite"
              className="text-[0.7rem] text-danger -mt-1"
            >
              {popoverError}
            </p>
          )}
          {popover === 'image' && (
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                onImageFileSelected(e.target.files?.[0])
                e.target.value = ''
              }}
            />
          )}
          <div className="flex items-center justify-end gap-1.5">
            {popover === 'image' && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="ti-btn ti-btn-sm ti-btn-light !h-9 !px-3 !mb-0 shrink-0 !min-w-max whitespace-nowrap mr-auto flex items-center gap-1.5"
              >
                <i className="ri-upload-2-line"></i>
                Upload from device
              </button>
            )}
            <button
              type="button"
              onClick={submitPopover}
              className="ti-btn ti-btn-sm ti-btn-primary !h-9 !px-4 !mb-0 shrink-0 !min-w-max whitespace-nowrap"
            >
              {popover === 'link' ? 'Add link' : 'Add image'}
            </button>
            {popover === 'link' && linkActive && (
              <button
                type="button"
                onClick={removeLink}
                className="ti-btn ti-btn-sm ti-btn-light !h-9 !px-3 !mb-0 shrink-0 text-danger"
                title="Remove link"
              >
                <i className="ri-link-unlink-m"></i>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                closePopover()
                editor.chain().focus().run()
              }}
              className="ti-btn ti-btn-sm ti-btn-light !h-9 !px-3 !mb-0 shrink-0 !min-w-max whitespace-nowrap"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      <div
        className={[
          'tiptap-content border dark:border-defaultborder/10 rounded-b-md p-4 min-h-[200px] prose dark:prose-invert max-w-none',
          contentClassName,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <EditorContent editor={editor} />
      </div>
      <style jsx global>{`
        .tiptap-editor .ProseMirror {
          outline: none;
          min-height: 200px;
        }
        .tiptap-editor .tiptap-select option {
          color: #1f2937;
          background: #ffffff;
        }
        .tiptap-editor .ProseMirror p {
          margin: 0.5rem 0;
        }
        .tiptap-editor .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #8c9097;
          pointer-events: none;
          height: 0;
        }
        .tiptap-editor .ProseMirror h1 {
          font-size: 2rem;
          font-weight: 700;
          margin: 1rem 0;
        }
        .tiptap-editor .ProseMirror h2 {
          font-size: 1.5rem;
          font-weight: 600;
          margin: 0.75rem 0;
        }
        .tiptap-editor .ProseMirror ul,
        .tiptap-editor .ProseMirror ol {
          padding-left: 1.5rem;
          margin: 0.5rem 0;
          list-style-position: outside;
        }
        .tiptap-editor .ProseMirror ul {
          list-style-type: disc;
        }
        .tiptap-editor .ProseMirror ol {
          list-style-type: decimal;
        }
        .tiptap-editor .ProseMirror li {
          margin: 0.25rem 0;
        }
        .tiptap-editor .ProseMirror li > p {
          margin: 0;
        }
        .tiptap-editor .ProseMirror blockquote {
          border-left: 3px solid #e5e7eb;
          padding-left: 1rem;
          margin: 0.5rem 0;
          font-style: italic;
        }
        .tiptap-editor .ProseMirror a {
          color: #3b82f6;
          text-decoration: underline;
        }
        .tiptap-editor .ProseMirror img {
          max-width: 100%;
          height: auto;
          margin: 1rem 0;
        }
      `}</style>
    </div>
  )
}

export default TiptapEditor





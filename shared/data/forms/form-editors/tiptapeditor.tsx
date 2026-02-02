"use client"
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import { useEffect } from 'react'

interface TiptapEditorProps {
  content?: string
  placeholder?: string
  onChange?: (html: string) => void
  editable?: boolean
  className?: string
}

const TiptapEditor: React.FC<TiptapEditorProps> = ({
  content = '',
  placeholder = 'Start typing...',
  onChange,
  editable = true,
  className = ''
}) => {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
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
      editor.commands.setContent(content)
    }
  }, [content, editor])

  if (!editor) {
    return null
  }

  return (
    <div className={`tiptap-editor ${className}`}>
      <div className="tiptap-toolbar border-b dark:border-defaultborder/10 p-2 flex flex-wrap gap-1">
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
          onClick={() => {
            const url = window.prompt('Enter URL:')
            if (url) {
              editor.chain().focus().setLink({ href: url }).run()
            }
          }}
          className={`ti-btn ti-btn-sm ti-btn-light ${editor.isActive('link') ? '!bg-primary !text-white' : ''}`}
          title="Link"
        >
          <i className="ri-links-line"></i>
        </button>
        <button
          type="button"
          onClick={() => {
            const url = window.prompt('Enter image URL:')
            if (url) {
              editor.chain().focus().setImage({ src: url }).run()
            }
          }}
          className="ti-btn ti-btn-sm ti-btn-light"
          title="Image"
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
      <div className="tiptap-content border dark:border-defaultborder/10 rounded-b-md p-4 min-h-[200px] prose dark:prose-invert max-w-none">
        <EditorContent editor={editor} />
      </div>
      <style jsx global>{`
        .tiptap-editor .ProseMirror {
          outline: none;
          min-height: 200px;
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





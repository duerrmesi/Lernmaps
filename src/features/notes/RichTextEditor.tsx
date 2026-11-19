import React, { useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import {
  Bold, Italic, Underline as UnderlineIcon, List, ListOrdered,
  Link2, Heading1, Heading2, Minus,
} from 'lucide-react';
import { cn } from '../../utils/cn';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  content,
  onChange,
  placeholder = 'Beginne zu schreiben…',
  className,
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({ placeholder }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: 'noopener noreferrer' },
      }),
      Underline,
    ],
    content: content || '',
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Sync external content changes (e.g., switching notes)
  React.useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || '', { emitUpdate: false });
    }
  }, [content]); // eslint-disable-line react-hooks/exhaustive-deps

  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href;
    const rawUrl = window.prompt('URL eingeben:', previousUrl);
    if (rawUrl === null) return;
    const url = rawUrl.trim();
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    // Sicherheitsprüfung: Blockiere unsichere Protokolle (z.B. javascript:, vbscript:, data:)
    if (/^(javascript|vbscript|data):/i.test(url)) {
      alert('Ungültige oder unsichere URL. Nur Web-Adressen (http/https) sind erlaubt.');
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  if (!editor) return null;

  return (
    <div className={cn('tiptap-editor flex flex-col', className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 pb-2 mb-3 border-b border-border flex-wrap">
        <ToolbarButton
          active={editor.isActive('heading', { level: 1 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          title="Überschrift 1"
        >
          <Heading1 size={14} />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          title="Überschrift 2"
        >
          <Heading2 size={14} />
        </ToolbarButton>

        <div className="w-px h-4 bg-border mx-1" />

        <ToolbarButton
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Fett (Strg+B)"
        >
          <Bold size={14} />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Kursiv (Strg+I)"
        >
          <Italic size={14} />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title="Unterstrichen"
        >
          <UnderlineIcon size={14} />
        </ToolbarButton>

        <div className="w-px h-4 bg-border mx-1" />

        <ToolbarButton
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Aufzählungsliste"
        >
          <List size={14} />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Nummerierte Liste"
        >
          <ListOrdered size={14} />
        </ToolbarButton>

        <div className="w-px h-4 bg-border mx-1" />

        <ToolbarButton
          active={editor.isActive('link')}
          onClick={setLink}
          title="Link"
        >
          <Link2 size={14} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Trennlinie"
        >
          <Minus size={14} />
        </ToolbarButton>
      </div>

      {/* Editor content */}
      <EditorContent editor={editor} className="flex-1" />
    </div>
  );
};

interface ToolbarButtonProps {
  active?: boolean;
  onClick: () => void;
  title?: string;
  children: React.ReactNode;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({ active, onClick, title, children }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    className={cn(
      'p-2 min-w-[32px] min-h-[32px] flex items-center justify-center rounded transition-colors touch-manipulation cursor-pointer',
      active
        ? 'bg-accent-light text-accent'
        : 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary'
    )}
  >
    {children}
  </button>
);

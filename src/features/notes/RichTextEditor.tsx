import React, { useCallback, useMemo, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Link2,
  Heading1,
  Heading2,
  Heading3,
  Minus,
  Quote,
  Lightbulb,
  AlertTriangle,
  Pin,
  HelpCircle,
  FileSpreadsheet,
  ChevronDown,
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
  const [showTemplates, setShowTemplates] = useState(false);

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

    // Sicherheitsprüfung: Blockiere unsichere Protokolle
    if (/^(javascript|vbscript|data):/i.test(url)) {
      alert('Ungültige oder unsichere URL. Nur Web-Adressen (http/https) sind erlaubt.');
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  // Insert Callout Box helper
  const insertCallout = useCallback(
    (type: 'tip' | 'warning' | 'example' | 'question') => {
      if (!editor) return;
      const templates = {
        tip: '<div class="callout-tip"><strong>💡 Merksatz / Tipp:</strong> Hier den wichtigen Merksatz festhalten.</div><p></p>',
        warning:
          '<div class="callout-warning"><strong>⚠️ Typische Klausurfalle:</strong> Häufiger Fehler bei diesem Thema...</div><p></p>',
        example:
          '<div class="callout-example"><strong>📌 Praxisbeispiel:</strong> Konkrete Anwendung oder Rechnung...</div><p></p>',
        question:
          '<div class="callout-question"><strong>❓ Mögliche Prüfungsfrage:</strong> Wie lautet die Definition von...?</div><p></p>',
      };
      editor.chain().focus().insertContent(templates[type]).run();
    },
    [editor]
  );

  // Insert Note Templates
  const insertTemplate = useCallback(
    (templateName: 'cornell' | 'summary') => {
      if (!editor) return;
      if (
        editor.getText().trim().length > 10 &&
        !window.confirm('Möchtest du die Vorlage an deine Notiz anfügen?')
      ) {
        return;
      }

      if (templateName === 'cornell') {
        const cornellHtml = `
          <h2>📝 Cornell-Notizen</h2>
          <div class="callout-tip">
            <strong>🎯 Kernfragen & Stichworte (Links):</strong>
            <ul>
              <li>Was ist die Kernidee?</li>
              <li>Welche Formeln/Begriffe sind zentral?</li>
            </ul>
          </div>
          <h3>📖 Ausführliche Vorlesungsnotizen:</h3>
          <p>Hier den Haupttext mitschreiben...</p>
          <hr />
          <div class="callout-example">
            <strong>🔍 Zusammenfassung (Unten):</strong>
            <p>In 2 bis 3 Sätzen das Wichtigste zusammenfassen...</p>
          </div>
          <p></p>
        `;
        editor.chain().focus().insertContent(cornellHtml).run();
      } else if (templateName === 'summary') {
        const summaryHtml = `
          <h2>🎯 Klausur-Zusammenfassung</h2>
          <div class="callout-tip"><strong>1. Definition & Kernbotschaft:</strong> Worum geht es genau?</div>
          <h3>2. Wichtigste Punkte:</h3>
          <ul>
            <li>Punkt 1: ...</li>
            <li>Punkt 2: ...</li>
          </ul>
          <div class="callout-warning"><strong>3. Klausurrelevant & Prüfungsfallen:</strong> Häufige Denkfehler beachten!</div>
          <p></p>
        `;
        editor.chain().focus().insertContent(summaryHtml).run();
      }
      setShowTemplates(false);
    },
    [editor]
  );

  // Calculate statistics (word count, reading time)
  const stats = useMemo(() => {
    if (!editor) return { words: 0, characters: 0, readTimeMin: 0 };
    const text = editor.getText();
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const characters = text.length;
    const readTimeMin = Math.max(1, Math.ceil(words / 200));
    return { words, characters, readTimeMin };
  }, [editor?.getText()]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!editor) return null;

  return (
    <div className={cn('tiptap-editor flex flex-col h-full', className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 pb-2 mb-3 border-b border-border flex-wrap bg-white/50 sticky top-0 z-10 backdrop-blur-xs">
        {/* Headings */}
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
        <ToolbarButton
          active={editor.isActive('heading', { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          title="Überschrift 3"
        >
          <Heading3 size={14} />
        </ToolbarButton>

        <div className="w-px h-4 bg-border mx-1" />

        {/* Text styling */}
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

        {/* Lists & Quotes */}
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
        <ToolbarButton
          active={editor.isActive('blockquote')}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          title="Zitat / Einzug"
        >
          <Quote size={13} />
        </ToolbarButton>

        <div className="w-px h-4 bg-border mx-1" />

        {/* Callout Infoboxes */}
        <ToolbarButton
          onClick={() => insertCallout('tip')}
          title="💡 Merksatz / Tipp einfügen"
          className="text-emerald-700 hover:bg-emerald-50"
        >
          <Lightbulb size={14} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => insertCallout('warning')}
          title="⚠️ Wichtig / Klausurfalle einfügen"
          className="text-amber-700 hover:bg-amber-50"
        >
          <AlertTriangle size={14} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => insertCallout('example')}
          title="📌 Beispiel einfügen"
          className="text-purple-700 hover:bg-purple-50"
        >
          <Pin size={14} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => insertCallout('question')}
          title="❓ Prüfungsfrage einfügen"
          className="text-blue-700 hover:bg-blue-50"
        >
          <HelpCircle size={14} />
        </ToolbarButton>

        <div className="w-px h-4 bg-border mx-1" />

        {/* Templates dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowTemplates(!showTemplates)}
            className="flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-bg-secondary text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
            title="Lern-Vorlagen einfügen"
          >
            <FileSpreadsheet size={13} />
            <span>Vorlagen</span>
            <ChevronDown size={11} />
          </button>

          {showTemplates && (
            <div className="absolute left-0 mt-1 w-52 bg-white border border-border rounded-lg shadow-dropdown p-1.5 z-30 space-y-1">
              <button
                type="button"
                onClick={() => insertTemplate('cornell')}
                className="w-full text-left px-2.5 py-1.5 text-xs rounded hover:bg-bg-secondary text-text-primary transition-colors cursor-pointer"
              >
                <div className="font-medium">📝 Cornell-Methode</div>
                <div className="text-[10px] text-text-disabled">
                  Stichworte, Notizen, Zusammenfassung
                </div>
              </button>
              <button
                type="button"
                onClick={() => insertTemplate('summary')}
                className="w-full text-left px-2.5 py-1.5 text-xs rounded hover:bg-bg-secondary text-text-primary transition-colors cursor-pointer"
              >
                <div className="font-medium">🎯 Klausur-Zusammenfassung</div>
                <div className="text-[10px] text-text-disabled">
                  Definition, Kernpunkte, Klausurfallen
                </div>
              </button>
            </div>
          )}
        </div>

        <div className="w-px h-4 bg-border mx-1" />

        {/* Links & Rules */}
        <ToolbarButton active={editor.isActive('link')} onClick={setLink} title="Link">
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

      {/* Stats footer bar */}
      <div className="pt-3 mt-4 border-t border-border flex items-center justify-between text-[11px] text-text-disabled select-none">
        <div className="flex items-center gap-3">
          <span>{stats.words} Wörter</span>
          <span>•</span>
          <span>{stats.characters} Zeichen</span>
          <span>•</span>
          <span>~{stats.readTimeMin} Min. Lesezeit</span>
        </div>
        <span className="text-[10px] opacity-75">Automatisches Speichern aktiv</span>
      </div>
    </div>
  );
};

interface ToolbarButtonProps {
  active?: boolean;
  onClick: () => void;
  title?: string;
  className?: string;
  children: React.ReactNode;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({
  active,
  onClick,
  title,
  className,
  children,
}) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    className={cn(
      'p-2 min-w-[30px] min-h-[30px] flex items-center justify-center rounded transition-colors touch-manipulation cursor-pointer',
      active
        ? 'bg-accent-light text-accent'
        : 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary',
      className
    )}
  >
    {children}
  </button>
);

import { useRef, useCallback, type KeyboardEvent } from 'react';
import { clsx } from 'clsx';
import type { NoteBlock, BlockType } from '../../types';

interface BlockEditorProps {
  blocks: NoteBlock[];
  onChange: (blocks: NoteBlock[]) => void;
  placeholder?: string;
}

function newBlock(type: BlockType = 'paragraph', order: number = 0): NoteBlock {
  return { id: crypto.randomUUID(), type, content: '', order };
}

export function BlockEditor({ blocks, onChange, placeholder = 'Escribe algo...' }: BlockEditorProps) {
  const sorted = [...blocks].sort((a, b) => a.order - b.order);
  const refs = useRef<Map<string, HTMLDivElement>>(new Map());

  const updateBlock = useCallback((id: string, content: string) => {
    onChange(blocks.map(b => b.id === id ? { ...b, content } : b));
  }, [blocks, onChange]);

  const addBlockAfter = useCallback((afterId: string, type: BlockType = 'paragraph') => {
    const idx = sorted.findIndex(b => b.id === afterId);
    const newOrder = idx >= 0 ? sorted[idx].order + 0.5 : sorted.length;
    const nb = newBlock(type, newOrder);
    const sortedUpdated = [...blocks, nb].sort((a, b) => a.order - b.order).map((b, i) => ({ ...b, order: i }));
    onChange(sortedUpdated);
    setTimeout(() => {
      const el = refs.current.get(nb.id);
      if (el) { el.focus(); }
    }, 20);
  }, [blocks, sorted, onChange]);

  const deleteBlock = useCallback((id: string) => {
    if (blocks.length <= 1) {
      onChange([{ ...blocks[0], content: '' }]);
      return;
    }
    const idx = sorted.findIndex(b => b.id === id);
    const updated = blocks.filter(b => b.id !== id).map((b, i) => ({ ...b, order: i }));
    onChange(updated);
    // Focus previous block
    const prevIdx = Math.max(0, idx - 1);
    if (sorted[prevIdx]) {
      setTimeout(() => {
        const el = refs.current.get(sorted[prevIdx].id);
        if (el) { el.focus(); placeCursorAtEnd(el); }
      }, 20);
    }
  }, [blocks, sorted, onChange]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>, block: NoteBlock) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      addBlockAfter(block.id);
    }
    if (e.key === 'Backspace' && block.content === '') {
      e.preventDefault();
      deleteBlock(block.id);
    }
  }, [addBlockAfter, deleteBlock]);

  if (blocks.length === 0) {
    return (
      <div className="min-h-[120px]">
        <div
          contentEditable
          suppressContentEditableWarning
          data-placeholder={placeholder}
          className="min-h-[1.5em] outline-none text-sm text-text-primary empty:before:text-text-muted empty:before:content-[attr(data-placeholder)]"
          onInput={e => {
            const content = (e.target as HTMLDivElement).innerText;
            const nb = newBlock('paragraph', 0);
            nb.content = content;
            onChange([nb]);
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-[120px] space-y-1">
      {sorted.map((block, i) => (
        <BlockRow
          key={block.id}
          block={block}
          placeholder={i === 0 ? placeholder : undefined}
          onRef={el => {
            if (el) refs.current.set(block.id, el);
            else refs.current.delete(block.id);
          }}
          onInput={content => updateBlock(block.id, content)}
          onKeyDown={e => handleKeyDown(e, block)}
        />
      ))}
    </div>
  );
}

interface BlockRowProps {
  block: NoteBlock;
  placeholder?: string;
  onRef: (el: HTMLDivElement | null) => void;
  onInput: (content: string) => void;
  onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => void;
}

function BlockRow({ block, placeholder, onRef, onInput, onKeyDown }: BlockRowProps) {
  const cls = clsx('outline-none w-full break-words', {
    'text-xl font-bold text-text-primary': block.type === 'heading1',
    'text-lg font-semibold text-text-primary': block.type === 'heading2',
    'text-sm text-text-primary': block.type === 'paragraph',
    'text-sm text-text-primary pl-4 before:content-["•"] before:absolute before:-left-0 relative': block.type === 'bullet',
  });

  if (block.type === 'divider') {
    return <hr className="border-border my-2" />;
  }

  return (
    <div
      ref={onRef}
      contentEditable
      suppressContentEditableWarning
      data-placeholder={placeholder}
      className={clsx(cls, 'empty:before:text-text-muted empty:before:content-[attr(data-placeholder)] min-h-[1.5em]')}
      onInput={e => onInput((e.target as HTMLDivElement).innerText)}
      onKeyDown={onKeyDown}
      dangerouslySetInnerHTML={block.content ? { __html: block.content } : undefined}
    />
  );
}

function placeCursorAtEnd(el: HTMLElement) {
  const range = document.createRange();
  const sel = window.getSelection();
  range.selectNodeContents(el);
  range.collapse(false);
  sel?.removeAllRanges();
  sel?.addRange(range);
}

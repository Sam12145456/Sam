import { memo, useMemo, useState, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { workbenchStore } from '~/lib/stores/workbench';
import type { FileMap } from '~/lib/stores/files';
import type { EditorDocument } from '~/components/editor/codemirror/CodeMirrorEditor';
import { diffLines, type Change } from 'diff';
import { getHighlighter } from 'shiki';
import Cookies from 'js-cookie';
import '~/styles/diff-view.css';

interface CodeComparisonProps {
  beforeCode: string;
  afterCode: string;
  language: string;
  filename: string;
  lightTheme: string;
  darkTheme: string;
}

interface DiffBlock {
  lineNumber: number;
  content: string;
  type: 'added' | 'removed' | 'unchanged';
  correspondingLine?: number;
}

const CodeComparison = memo(({ beforeCode, afterCode, filename, language }: CodeComparisonProps) => {
  const [highlighter, setHighlighter] = useState<any>(null);
  
  const { unifiedBlocks, hasChanges } = useMemo(() => {
    const normalizeText = (text: string) => text
      .replace(/\r\n/g, '\n')
      .split('\n')
      .map(line => line.trimEnd())
      .join('\n');

    const normalizedBefore = normalizeText(beforeCode);
    const normalizedAfter = normalizeText(afterCode);
    
    const differences = diffLines(normalizedBefore, normalizedAfter, {
      ignoreWhitespace: false,
      newlineIsToken: true
    });

    const blocks: DiffBlock[] = [];
    let lineNumber = 1;
    let hasModifications = false;

    differences.forEach((part: Change) => {
      const lines = part.value.split('\n').filter(line => line !== '');
      
      if (part.added || part.removed) {
        hasModifications = true;
      }

      lines.forEach(line => {
        blocks.push({
          lineNumber: lineNumber++,
          content: line,
          type: part.added ? 'added' : part.removed ? 'removed' : 'unchanged'
        });
      });
    });

    return { 
      unifiedBlocks: blocks,
      hasChanges: hasModifications 
    };
  }, [beforeCode, afterCode]);

  useEffect(() => {
    getHighlighter({
      themes: ['github-dark'],
      langs: ['typescript', 'javascript', 'json', 'html', 'css', 'jsx', 'tsx']
    }).then(setHighlighter);
  }, []);

  const renderDiffBlock = (block: DiffBlock) => {
    const bgColor = {
      added: 'bg-green-500/20 border-l-4 border-green-500',
      removed: 'bg-red-500/20 border-l-4 border-red-500',
      unchanged: ''
    }[block.type];

    const highlightedCode = highlighter ? 
      highlighter.codeToHtml(block.content, { lang: language, theme: 'github-dark' }) : 
      block.content;

    return (
      <div key={block.lineNumber} className="flex group min-w-fit">
        <div className="w-12 shrink-0 pl-2 py-0.5 text-left font-mono text-bolt-elements-textTertiary border-r border-bolt-elements-borderColor bg-bolt-elements-background-depth-1">
          {block.lineNumber}
        </div>
        <div className={`${bgColor} px-4 py-0.5 font-mono whitespace-pre flex-1 group-hover:bg-bolt-elements-background-depth-2 text-bolt-elements-textPrimary`}>
          <span className="mr-2 text-bolt-elements-textTertiary">
            {block.type === 'added' && '+'}
            {block.type === 'removed' && '-'}
            {block.type === 'unchanged' && ' '}
          </span>
          <span 
            dangerouslySetInnerHTML={{ 
              __html: highlightedCode.replace(/<\/?pre[^>]*>/g, '').replace(/<\/?code[^>]*>/g, '') 
            }} 
          />
        </div>
      </div>
    );
  };

  return (
    <div className="mx-auto w-full">
      <div className="relative w-full overflow-hidden rounded-xl border border-bolt-elements-borderColor bg-bolt-elements-background-depth-2">
        <div className="flex flex-col">
          <div className="flex items-center bg-bolt-elements-background-depth-1 p-2 text-sm text-bolt-elements-textPrimary shrink-0">
            <div className="i-ph:file mr-2 h-4 w-4 shrink-0" />
            <span className="truncate">{filename}</span>
            <span className="ml-auto shrink-0">
              {hasChanges ? (
                <span className="text-yellow-400">Modified</span>
              ) : (
                <span className="text-green-400">No Changes</span>
              )}
            </span>
          </div>
          <div className="flex-1 overflow-auto diff-panel-content">
            <div className="overflow-x-auto">
              {unifiedBlocks.map(renderDiffBlock)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

const getLanguageFromExtension = (ext: string) => {
  const map: Record<string, string> = {
    'js': 'javascript',
    'jsx': 'jsx',
    'ts': 'typescript',
    'tsx': 'tsx',
    'json': 'json',
    'html': 'html',
    'css': 'css'
  };
  return map[ext] || 'typescript';
};

interface FileHistory {
  originalContent: string;
  lastModified: number;
  changes: Change[];
  saveCount: number;
  versions: {
    timestamp: number;
    content: string;
  }[];
}

const saveFileHistory = (filePath: string, history: FileHistory) => {
  try {
    const key = `diff_history_${filePath.replace(/\//g, '_')}`;
    Cookies.set(key, JSON.stringify(history), { expires: 7 });
  } catch (e) {
    console.error('Error saving diff history:', e);
  }
};

const loadFileHistory = (filePath: string): FileHistory | null => {
  try {
    const key = `diff_history_${filePath.replace(/\//g, '_')}`;
    const saved = Cookies.get(key);
    return saved ? JSON.parse(saved) : null;
  } catch (e) {
    console.error('Error loading diff history:', e);
    return null;
  }
};

interface DiffViewProps {
  fileHistory: Record<string, FileHistory>;
  setFileHistory: React.Dispatch<React.SetStateAction<Record<string, FileHistory>>>;
}

export const DiffView = memo(({ fileHistory, setFileHistory }: DiffViewProps) => {
  const files = useStore(workbenchStore.files) as FileMap;
  const selectedFile = useStore(workbenchStore.selectedFile);
  const currentDocument = useStore(workbenchStore.currentDocument) as EditorDocument;
  const unsavedFiles = useStore(workbenchStore.unsavedFiles);

  useEffect(() => {
    if (selectedFile) {
      const history = loadFileHistory(selectedFile);
      if (history) {
        setFileHistory(prev => ({ ...prev, [selectedFile]: history }));
      }
    }
  }, [selectedFile, setFileHistory]);

  useEffect(() => {
    if (selectedFile && currentDocument) {
      const file = files[selectedFile];
      if (!file || !('content' in file)) return;

      const isUnsaved = unsavedFiles.has(selectedFile);
      if (!isUnsaved) {
        const existingHistory = fileHistory[selectedFile];
        const currentContent = currentDocument.value;
        
        const newHistory: FileHistory = {
          originalContent: existingHistory?.originalContent || file.content,
          lastModified: Date.now(),
          changes: existingHistory?.changes || [],
          saveCount: existingHistory ? existingHistory.saveCount + 1 : 1,
          versions: [
            ...(existingHistory?.versions || []),
            {
              timestamp: Date.now(),
              content: currentContent
            }
          ]
        };
        
        setFileHistory(prev => ({ ...prev, [selectedFile]: newHistory }));
        saveFileHistory(selectedFile, newHistory);
      }
    }
  }, [selectedFile, unsavedFiles, currentDocument?.value, files, setFileHistory]);

  if (!selectedFile || !currentDocument) {
    return (
      <div className="flex w-full h-full justify-center items-center bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary">
        Select a file to view differences
      </div>
    );
  }

  const file = files[selectedFile];
  const originalContent = file && 'content' in file ? file.content : '';
  const currentContent = currentDocument.value;

  const history = fileHistory[selectedFile];
  const effectiveOriginalContent = history?.originalContent || originalContent;

  return (
    <div className="h-full overflow-auto p-4">
      <CodeComparison
        beforeCode={effectiveOriginalContent}
        afterCode={currentContent}
        language={getLanguageFromExtension(selectedFile.split('.').pop() || '')}
        filename={selectedFile}
        lightTheme="github-light"
        darkTheme="github-dark"
      />
    </div>
  );
}); 
import { memo } from 'react';

interface CodeComparisonProps {
  beforeCode: string;
  afterCode: string;
  language: string;
  filename: string;
  lightTheme: string;
  darkTheme: string;
}

export const CodeComparison = memo(({
  beforeCode,
  afterCode,
  language,
  filename,
  lightTheme,
  darkTheme,
}: CodeComparisonProps) => {
  return (
    <div className="mx-auto w-full">
      <div className="relative w-full overflow-hidden rounded-xl border border-bolt-elements-borderColor">
        <div className="relative grid md:grid-cols-2 md:divide-x md:divide-bolt-elements-borderColor">
          <div>
            <div className="flex items-center bg-bolt-elements-background-depth-1 p-2 text-sm">
              <div className="i-ph:file mr-2 h-4 w-4" />
              {filename}
              <span className="ml-auto">Original</span>
            </div>
            <pre className="h-full overflow-auto break-all bg-bolt-elements-background-depth-1 p-4 font-mono text-xs">
              {beforeCode}
            </pre>
          </div>
          <div>
            <div className="flex items-center bg-bolt-elements-background-depth-1 p-2 text-sm">
              <div className="i-ph:file mr-2 h-4 w-4" />
              {filename}
              <span className="ml-auto">Modified</span>
            </div>
            <pre className="h-full overflow-auto break-all bg-bolt-elements-background-depth-1 p-4 font-mono text-xs">
              {afterCode}
            </pre>
          </div>
        </div>
        <div className="absolute left-1/2 top-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-md bg-bolt-elements-background-depth-2 text-xs">
          VS
        </div>
      </div>
    </div>
  );
});

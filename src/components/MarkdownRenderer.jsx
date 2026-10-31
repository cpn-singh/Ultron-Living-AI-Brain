import React, { useState } from 'react';
import { Copy, Check, Code, Play, Terminal, Eye, Loader2, X } from 'lucide-react';

export default function MarkdownRenderer({ content }) {
  if (!content) return null;

  // Split content by code blocks ```lang ... ```
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    const textBefore = content.substring(lastIndex, match.index);
    if (textBefore) {
      parts.push({ type: 'text', text: textBefore });
    }
    parts.push({
      type: 'codeblock',
      language: match[1] || 'code',
      code: match[2].trim(),
    });
    lastIndex = match.index + match[0].length;
  }

  const remainingText = content.substring(lastIndex);
  if (remainingText) {
    parts.push({ type: 'text', text: remainingText });
  }

  return (
    <div className="flex flex-col gap-2 font-sans text-rose-100">
      {parts.map((part, index) => {
        if (part.type === 'codeblock') {
          return <CodeBlockItem key={index} language={part.language} code={part.code} />;
        }
        return <FormattedTextPart key={index} text={part.text} />;
      })}
    </div>
  );
}

function CodeBlockItem({ language, code }) {
  const [copied, setCopied] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  const cleanLang = (language || 'code').toLowerCase().trim();
  const canRun = ['javascript', 'js', 'python', 'py'].includes(cleanLang);
  const isHtml = cleanLang === 'html';

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRunCode = async () => {
    setIsRunning(true);
    setOutput(null);

    if (cleanLang === 'javascript' || cleanLang === 'js') {
      const logs = [];
      const originalLog = console.log;
      const originalError = console.error;
      const originalWarn = console.warn;
      try {
        console.log = (...args) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' '));
        console.error = (...args) => logs.push('❌ ' + args.map(a => String(a)).join(' '));
        console.warn = (...args) => logs.push('⚠️ ' + args.map(a => String(a)).join(' '));

        const asyncFn = new Function(`return (async () => { ${code} })()`);
        const result = await asyncFn();
        if (result !== undefined) {
          logs.push('=> ' + (typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result)));
        }
        setOutput(logs.join('\n') || 'Program completed cleanly with 0 exit code (no stdout).');
      } catch (err) {
        setOutput(`Runtime Error: ${err.message}`);
      } finally {
        console.log = originalLog;
        console.error = originalError;
        console.warn = originalWarn;
        setIsRunning(false);
      }
    } else if (cleanLang === 'python' || cleanLang === 'py') {
      try {
        const res = await fetch('http://127.0.0.1:8000/api/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, language: 'python' })
        });
        if (res.ok) {
          const data = await res.json();
          setOutput(data.output || (data.success ? 'Program executed cleanly.' : data.error));
        } else {
          setOutput(`[Python Sandbox Engine Offline]\nStart backend with 'python server/app.py' to run locally on your PC.`);
        }
      } catch (err) {
        setOutput(`[Python Sandbox Engine Offline]\nStart backend with 'python server/app.py' to execute directly.`);
      } finally {
        setIsRunning(false);
      }
    }
  };

  return (
    <div className="my-2 rounded-xl bg-[#090d16] border border-rose-900/50 overflow-hidden font-mono text-xs shadow-lg">
      {/* Code Header Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-black/60 border-b border-rose-900/40 text-[11px]">
        <span className="text-rose-400 font-semibold flex items-center gap-1.5 uppercase tracking-wider">
          <Code className="w-3.5 h-3.5 text-rose-500" /> {language}
        </span>
        <div className="flex items-center gap-2">
          {/* Live Run Button */}
          {canRun && (
            <button
              onClick={handleRunCode}
              disabled={isRunning}
              className="flex items-center gap-1 text-cyan-300 hover:text-cyan-200 px-2 py-0.5 rounded bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-800/40 transition-colors disabled:opacity-50"
              title="Run code in local sandbox"
            >
              {isRunning ? <Loader2 className="w-3 h-3 animate-spin text-cyan-400" /> : <Play className="w-3 h-3 text-cyan-400 fill-cyan-400" />}
              <span>{isRunning ? 'Running...' : 'Run'}</span>
            </button>
          )}

          {/* HTML Preview Button */}
          {isHtml && (
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-1 text-purple-300 hover:text-purple-200 px-2 py-0.5 rounded bg-purple-950/40 hover:bg-purple-900/50 border border-purple-800/40 transition-colors"
              title="Toggle Live HTML Preview"
            >
              <Eye className="w-3 h-3 text-purple-400" />
              <span>{showPreview ? 'Hide' : 'Preview'}</span>
            </button>
          )}

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-rose-300/70 hover:text-rose-200 px-2 py-0.5 rounded hover:bg-rose-900/40 transition-colors"
          >
            {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Code Content */}
      <pre className="p-3 overflow-x-auto text-rose-200/90 leading-relaxed text-[11px] font-mono">
        <code>{code}</code>
      </pre>

      {/* Interactive Terminal Output Drawer */}
      {output !== null && (
        <div className="border-t border-cyan-900/40 bg-black/90 p-3 flex flex-col gap-1 text-[11px]">
          <div className="flex items-center justify-between text-cyan-400 font-mono text-[10px] pb-1 border-b border-cyan-950">
            <span className="flex items-center gap-1.5 font-bold">
              <Terminal className="w-3 h-3 text-cyan-400" /> SANDBOX TERMINAL OUTPUT
            </span>
            <button
              onClick={() => setOutput(null)}
              className="text-white/40 hover:text-white p-0.5"
              title="Close Output"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <pre className="font-mono text-cyan-200/90 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
            {output}
          </pre>
        </div>
      )}

      {/* Live HTML Preview Frame */}
      {showPreview && isHtml && (
        <div className="border-t border-purple-900/40 bg-white p-2">
          <div className="flex items-center justify-between text-slate-800 font-sans text-[10px] pb-1 border-b border-slate-200 mb-1">
            <span className="font-bold flex items-center gap-1">
              <Eye className="w-3 h-3 text-purple-600" /> Live HTML Component Sandbox
            </span>
            <button onClick={() => setShowPreview(false)} className="text-slate-400 hover:text-slate-800">
              <X className="w-3 h-3" />
            </button>
          </div>
          <iframe
            srcDoc={code}
            title="HTML Preview"
            className="w-full h-48 border border-slate-200 rounded bg-white"
            sandbox="allow-scripts"
          />
        </div>
      )}
    </div>
  );
}

function FormattedTextPart({ text }) {
  const lines = text.split('\n');

  return (
    <div className="flex flex-col gap-1 leading-relaxed">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-1" />;

        // Headings
        if (line.startsWith('### ')) {
          return (
            <h3 key={idx} className="text-sm font-bold text-rose-400 mt-2 mb-0.5 border-b border-rose-900/30 pb-0.5">
              {parseInlineFormatting(line.slice(4))}
            </h3>
          );
        }
        if (line.startsWith('## ')) {
          return (
            <h2 key={idx} className="text-base font-bold text-rose-300 mt-2 mb-1">
              {parseInlineFormatting(line.slice(3))}
            </h2>
          );
        }
        if (line.startsWith('# ')) {
          return (
            <h1 key={idx} className="text-lg font-bold text-rose-200 mt-2 mb-1">
              {parseInlineFormatting(line.slice(2))}
            </h1>
          );
        }

        // Bullet Lists
        if (line.startsWith('- ') || line.startsWith('* ')) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-2 my-0.5 text-xs text-rose-200/90">
              <span className="text-rose-500 font-bold mt-0.5">•</span>
              <span>{parseInlineFormatting(line.slice(2))}</span>
            </div>
          );
        }

        // Numbered Lists
        const numMatch = line.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-2 my-0.5 text-xs text-rose-200/90">
              <span className="text-rose-400 font-mono text-[11px] font-bold">{numMatch[1]}.</span>
              <span>{parseInlineFormatting(numMatch[2])}</span>
            </div>
          );
        }

        // Standard Paragraph
        return (
          <p key={idx} className="text-xs sm:text-sm text-rose-100/90 leading-relaxed">
            {parseInlineFormatting(line)}
          </p>
        );
      })}
    </div>
  );
}

function parseInlineFormatting(text) {
  // Replace bold **text**, italic *text*, inline `code`, and links [title](url)
  const regex = /(\*\*.*?\*\*|\*.*?\*|`.*?`|\[.*?\]\(.*?\))/g;
  const parts = text.split(regex);

  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-bold text-rose-200">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={i} className="italic text-rose-300/90">{part.slice(1, -1)}</em>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="bg-black/60 text-rose-300 font-mono text-[11px] px-1.5 py-0.5 rounded border border-rose-900/40">
          {part.slice(1, -1)}
        </code>
      );
    }
    const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
    if (linkMatch) {
      const [, linkText, linkUrl] = linkMatch;
      return (
        <a
          key={i}
          href={linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => {
            if (window.electronAPI && typeof window.electronAPI.openExternal === 'function') {
              e.preventDefault();
              window.electronAPI.openExternal(linkUrl);
            }
          }}
          className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 transition-colors inline-flex items-center gap-0.5 font-medium cursor-pointer"
        >
          {linkText}
        </a>
      );
    }
    return part;
  });
}

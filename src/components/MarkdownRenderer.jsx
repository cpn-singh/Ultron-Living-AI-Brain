import React, { useState } from 'react';
import { Copy, Check, Code, Play, Terminal, Eye, Loader2, X, ExternalLink } from 'lucide-react';

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
    <div className="flex flex-col gap-2 font-sans text-slate-100">
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

  // Specialized Interactive Media Blocks
  if (cleanLang === 'youtube') {
    return <YouTubeEmbedBlock query={code} />;
  }

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
        console.error = (...args) => logs.push('ERROR: ' + args.map(a => String(a)).join(' '));
        console.warn = (...args) => logs.push('WARN: ' + args.map(a => String(a)).join(' '));

        const asyncFn = new Function(`return (async () => { ${code} })()`);
        const result = await asyncFn();
        if (result !== undefined) {
          logs.push('=> ' + (typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result)));
        }
        setOutput(logs.join('\n') || 'Program completed with no output.');
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
          setOutput(`Python Sandbox Engine Offline. Run 'python server/app.py' to execute directly.`);
        }
      } catch (err) {
        setOutput(`Python Sandbox Engine Offline. Run 'python server/app.py' to execute directly.`);
      } finally {
        setIsRunning(false);
      }
    }
  };

  return (
    <div className="my-2 rounded-xl bg-[#040814] border border-cyan-900/50 overflow-hidden font-mono text-xs shadow-lg">
      {/* Code Header Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-950/90 border-b border-cyan-900/40 text-[11px]">
        <span className="text-cyan-300 font-semibold flex items-center gap-1.5 uppercase tracking-wider">
          <Code className="w-3.5 h-3.5 text-cyan-400" /> {language}
        </span>
        <div className="flex items-center gap-2">
          {/* Live Run Button */}
          {canRun && (
            <button
              onClick={handleRunCode}
              disabled={isRunning}
              className="flex items-center gap-1 text-cyan-300 hover:text-cyan-200 px-2 py-0.5 rounded bg-cyan-950/50 hover:bg-cyan-900/60 border border-cyan-800/50 transition-colors disabled:opacity-50"
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
              className="flex items-center gap-1 text-sky-300 hover:text-sky-200 px-2 py-0.5 rounded bg-sky-950/50 hover:bg-sky-900/60 border border-sky-800/50 transition-colors"
              title="Toggle Live HTML Preview"
            >
              <Eye className="w-3 h-3 text-sky-400" />
              <span>{showPreview ? 'Hide' : 'Preview'}</span>
            </button>
          )}

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-slate-400 hover:text-slate-200 px-2 py-0.5 rounded hover:bg-white/10 transition-colors"
          >
            {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Code Content */}
      <pre className="p-3 overflow-x-auto text-slate-100 leading-relaxed text-[11px] font-mono">
        <code>{code}</code>
      </pre>

      {/* Interactive Terminal Output Drawer */}
      {output !== null && (
        <div className="border-t border-cyan-900/40 bg-black/95 p-3 flex flex-col gap-1 text-[11px]">
          <div className="flex items-center justify-between text-cyan-400 font-mono text-[10px] pb-1 border-b border-cyan-950">
            <span className="flex items-center gap-1.5 font-bold">
              <Terminal className="w-3 h-3 text-cyan-400" /> Sandbox Output
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
        <div className="border-t border-cyan-900/40 bg-white p-2">
          <div className="flex items-center justify-between text-slate-800 font-sans text-[10px] pb-1 border-b border-slate-200 mb-1">
            <span className="font-bold flex items-center gap-1">
              <Eye className="w-3 h-3 text-sky-600" /> Live HTML Preview
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

function YouTubeEmbedBlock({ query }) {
  const cleanQuery = (query || '').trim();
  const ytSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanQuery)}`;
  const embedUrl = `https://www.youtube-nocookie.com/embed?listType=search&list=${encodeURIComponent(cleanQuery)}&autoplay=1`;

  const handleOpenExternal = () => {
    if (window.electronAPI && typeof window.electronAPI.openExternal === 'function') {
      window.electronAPI.openExternal(ytSearchUrl);
      return;
    }
    // Attempt local python host launch (launches in default browser without popup blocker)
    fetch('http://127.0.0.1:8000/api/open-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: ytSearchUrl })
    }).catch(() => {});

    // Direct browser window open
    try {
      window.open(ytSearchUrl, '_blank', 'noopener,noreferrer');
    } catch (e) {}
  };

  return (
    <div className="my-2.5 rounded-xl border border-cyan-500/40 bg-gradient-to-b from-slate-900/95 via-slate-950/90 to-black p-3.5 shadow-2xl backdrop-blur-md flex flex-col gap-3">
      <div className="flex items-center justify-between border-b border-cyan-900/40 pb-2">
        <div className="flex items-center gap-2 text-cyan-300 font-semibold text-xs tracking-wide">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-black text-white shadow-md shadow-red-500/30">
            ▶
          </span>
          <span>YouTube Music & Video Player</span>
        </div>
        <button
          onClick={handleOpenExternal}
          className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-cyan-300 hover:text-white bg-cyan-950/70 hover:bg-cyan-800/60 border border-cyan-600/40 rounded-lg transition-all duration-200 cursor-pointer shadow-sm"
          title="Open in new browser tab"
        >
          <ExternalLink className="w-3 h-3 text-cyan-400" />
          <span>Open Full Tab</span>
        </button>
      </div>

      <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-cyan-950 bg-black shadow-inner">
        <iframe
          src={embedUrl}
          title={`YouTube Player - ${cleanQuery}`}
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1 text-[11px] text-slate-300">
        <span className="truncate max-w-[240px] font-mono text-cyan-200/90 text-xs">
          Now playing: <strong className="text-white font-semibold">"{cleanQuery}"</strong>
        </span>
        <button
          onClick={handleOpenExternal}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-semibold text-xs shadow-lg shadow-red-900/40 transition-transform active:scale-95 cursor-pointer"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Launch on YouTube</span>
        </button>
      </div>
    </div>
  );
}

function FormattedTextPart({ text }) {
  // Strip decorative emoji symbols from text display as requested
  const cleanText = text.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').replace(/[ \t]{2,}/g, ' ');
  const lines = cleanText.split('\n');

  return (
    <div className="flex flex-col gap-1.5 leading-relaxed">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-1" />;

        // Horizontal Separator
        if (trimmed === '---' || trimmed === '***') {
          return <div key={idx} className="w-full h-[1px] bg-white/10 my-1" />;
        }

        // Headings - Clean Cyan & Sky High-Contrast Colors
        if (line.startsWith('### ')) {
          return (
            <h3 key={idx} className="text-sm font-bold text-cyan-300 mt-2 mb-0.5 border-b border-cyan-900/30 pb-0.5">
              {parseInlineFormatting(line.slice(4))}
            </h3>
          );
        }
        if (line.startsWith('## ')) {
          return (
            <h2 key={idx} className="text-base font-bold text-sky-300 mt-2.5 mb-1">
              {parseInlineFormatting(line.slice(3))}
            </h2>
          );
        }
        if (line.startsWith('# ')) {
          return (
            <h1 key={idx} className="text-lg font-bold text-cyan-200 mt-3 mb-1">
              {parseInlineFormatting(line.slice(2))}
            </h1>
          );
        }

        // Bullet Lists
        if (line.startsWith('- ') || line.startsWith('* ')) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-2 my-0.5 text-xs text-slate-100 leading-relaxed">
              <span className="text-cyan-400 font-bold mt-0.5">•</span>
              <span>{parseInlineFormatting(line.slice(2))}</span>
            </div>
          );
        }

        // Numbered Lists
        const numMatch = line.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-2 my-0.5 text-xs text-slate-100 leading-relaxed">
              <span className="text-cyan-400 font-mono text-[11px] font-bold">{numMatch[1]}.</span>
              <span>{parseInlineFormatting(numMatch[2])}</span>
            </div>
          );
        }

        // Standard Paragraph - Soft White / Light Slate (Crisp & Readable)
        return (
          <p key={idx} className="text-xs sm:text-sm text-slate-100 leading-relaxed font-normal">
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
      return <strong key={i} className="font-bold text-white tracking-wide">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={i} className="italic text-cyan-200/90 font-medium">{part.slice(1, -1)}</em>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="bg-slate-900/90 text-cyan-300 font-mono text-[11px] px-1.5 py-0.5 rounded border border-cyan-800/40">
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
          className="text-cyan-400 hover:text-cyan-200 underline underline-offset-2 transition-colors inline-flex items-center gap-0.5 font-semibold cursor-pointer"
        >
          {linkText}
        </a>
      );
    }
    return part;
  });
}

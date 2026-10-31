import React, { useState, useEffect, useCallback } from 'react';
import { Folder, File, RefreshCw, ChevronRight, ChevronLeft, Home, FolderOpen, ShieldCheck } from 'lucide-react';
import { listDirectory, openFile, createFile, createFolder } from '../services/fileSystemService';
import { Capacitor } from '@capacitor/core';

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function FileManagerPanel() {
  const [currentPath, setCurrentPath] = useState('');
  const [entries, setEntries] = useState([]);
  const [pathDisplay, setPathDisplay] = useState('Downloads/Ultron/');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [pathStack, setPathStack] = useState([]);
  const [showCreate, setShowCreate] = useState(null); // 'file' | 'folder' | null
  const [newName, setNewName] = useState('');
  const isAndroid = Capacitor.isNativePlatform();

  const loadDirectory = useCallback(async (relativePath = '') => {
    setLoading(true);
    setStatus('');
    const result = await listDirectory(relativePath);
    setLoading(false);
    if (result.success) {
      setEntries(result.entries || []);
      setPathDisplay(result.path || 'Downloads/Ultron/');
    } else {
      setStatus(result.message || 'Could not load directory');
      setEntries([]);
    }
  }, []);

  useEffect(() => {
    loadDirectory('');
  }, [loadDirectory]);

  const handleEntryClick = async (entry) => {
    if (entry.isDirectory) {
      setPathStack(prev => [...prev, currentPath]);
      setCurrentPath(entry.path);
      await loadDirectory(entry.path);
    } else {
      setStatus('Opening file safely...');
      const result = await openFile(entry.path);
      setStatus(result.success ? `Opened: ${entry.name}` : `Error: ${result.message}`);
      setTimeout(() => setStatus(''), 3000);
    }
  };

  const handleBack = async () => {
    if (pathStack.length === 0) return;
    const prev = pathStack[pathStack.length - 1];
    setPathStack(p => p.slice(0, -1));
    setCurrentPath(prev);
    await loadDirectory(prev);
  };

  const handleHome = async () => {
    setPathStack([]);
    setCurrentPath('');
    await loadDirectory('');
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setStatus('Creating in Downloads/Ultron/...');
    let result;
    if (showCreate === 'file') {
      result = await createFile(newName.trim(), currentPath);
    } else {
      result = await createFolder(newName.trim(), currentPath);
    }
    setStatus(result.message || (result.success ? 'Created!' : 'Failed'));
    setShowCreate(null);
    setNewName('');
    setTimeout(() => setStatus(''), 3000);
    await loadDirectory(currentPath);
  };

  return (
    <div className="h-full flex flex-col glass-panel rounded-2xl p-4 gap-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-rose-900/40 pb-2">
        <div className="flex items-center gap-2">
          <FolderOpen className="w-4 h-4 text-rose-400" />
          <span className="text-rose-400 font-bold text-sm">ULTRON Storage Manager</span>
          <span className="text-[10px] text-green-400 bg-green-950/40 border border-green-800/40 px-2 py-0.5 rounded-full">
            Protected Mode
          </span>
        </div>
        <button
          onClick={() => loadDirectory(currentPath)}
          className="p-1.5 text-rose-400/60 hover:text-rose-300 rounded-lg border border-rose-900/30"
          title="Refresh"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Breadcrumb nav */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={handleHome}
          disabled={pathStack.length === 0}
          className="p-1.5 rounded-lg border border-rose-900/30 text-rose-400/70 hover:text-rose-200 disabled:opacity-30"
          title="Home"
        >
          <Home className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleBack}
          disabled={pathStack.length === 0}
          className="p-1.5 rounded-lg border border-rose-900/30 text-rose-400/70 hover:text-rose-200 disabled:opacity-30"
          title="Back"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <span className="text-xs text-rose-400/50 truncate flex-1 font-mono">
          Downloads/Ultron/{currentPath ? currentPath.split('/').filter(Boolean).pop() + '/' : ''}
        </span>
      </div>

      {/* Status bar */}
      {status && (
        <div className="text-xs text-rose-300 bg-rose-900/20 px-3 py-1.5 rounded-lg border border-rose-900/30">
          {status}
        </div>
      )}

      {/* Create input */}
      {showCreate && (
        <div className="flex items-center gap-2 bg-zinc-900/60 rounded-xl p-2 border border-rose-900/40">
          <input
            autoFocus
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setShowCreate(null); }}
            placeholder={showCreate === 'file' ? 'filename.txt' : 'FolderName'}
            className="flex-1 bg-transparent text-sm text-rose-100 placeholder-rose-400/40 focus:outline-none"
          />
          <button onClick={handleCreate} className="text-xs text-green-400 hover:text-green-300 px-2 py-1 border border-green-800/40 rounded-lg">Create</button>
          <button onClick={() => setShowCreate(null)} className="text-xs text-rose-400/60 hover:text-rose-300 px-2 py-1">✕</button>
        </div>
      )}

      {/* File list */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-1">
        {loading && (
          <div className="flex items-center justify-center h-24 text-rose-400/50 text-sm">
            <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Loading storage...
          </div>
        )}

        {!loading && entries.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 gap-2 text-rose-400/40">
            <Folder className="w-10 h-10" />
            <p className="text-sm">Empty Ultron directory</p>
            <p className="text-xs">Say "create file notes.txt" or tap buttons below</p>
          </div>
        )}

        {!loading && entries.map((entry, i) => (
          <button
            key={i}
            onClick={() => handleEntryClick(entry)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-rose-900/20 border border-transparent hover:border-rose-900/30 transition-all group"
          >
            {entry.isDirectory
              ? <Folder className="w-4 h-4 text-rose-400 flex-shrink-0" />
              : <File className="w-4 h-4 text-rose-400/60 flex-shrink-0" />}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-rose-100 truncate">{entry.name}</p>
              {!entry.isDirectory && (
                <p className="text-xs text-rose-400/50">{formatBytes(entry.size)} · {entry.modified}</p>
              )}
            </div>
            {entry.isDirectory && (
              <ChevronRight className="w-3.5 h-3.5 text-rose-400/40 group-hover:text-rose-300" />
            )}
          </button>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 pt-2 border-t border-rose-900/30">
        <button
          onClick={() => { setShowCreate('file'); setNewName(''); }}
          className="flex-1 py-2 text-xs text-rose-300 border border-rose-900/40 rounded-xl hover:bg-rose-900/20 flex items-center justify-center gap-1.5"
        >
          <File className="w-3.5 h-3.5" /> New File
        </button>
        <button
          onClick={() => { setShowCreate('folder'); setNewName(''); }}
          className="flex-1 py-2 text-xs text-rose-300 border border-rose-900/40 rounded-xl hover:bg-rose-900/20 flex items-center justify-center gap-1.5"
        >
          <Folder className="w-3.5 h-3.5" /> New Folder
        </button>
      </div>
    </div>
  );
}

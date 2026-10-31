import React, { useState, useEffect } from 'react';
import { HardDrive, Plus, Trash2, Search, Download, Bookmark, Brain, Sparkles, BookOpen } from 'lucide-react';
import { realtimeLearningEngine } from '../services/realtimeLearningService';

const INITIAL_MEMORIES = [
  { id: 'mem_1', category: 'User Preference', key: 'Code Style', value: 'Prefers zero-allocation, highly idiomatic Python and Rust code with strict typing.', timestamp: '2026-09-11 12:40' },
  { id: 'mem_2', category: 'System Blueprint', key: 'ULTRON Storage Path', value: 'Mobile and PC files created under Downloads/Ultron/ directory.', timestamp: '2026-09-11 13:00' },
  { id: 'mem_3', category: 'Verified Pattern', key: 'Swarm Consensus Rate', value: '5-Agent Verification Gate enforces agreement before final output compilation.', timestamp: '2026-09-11 13:15' },
  { id: 'mem_4', category: 'API Provider', key: 'Frontier AI Engines', value: 'Google Gemini 3.8 Flash (Primary) and NVIDIA NIM / DeepSeek-R1 (Fallback).', timestamp: '2026-09-11 13:30' }
];

export default function MemoryPanel() {
  const [activeView, setActiveView] = useState('memories'); // 'memories' | 'wisdom'
  const [memories, setMemories] = useState(() => {
    const saved = localStorage.getItem('ultron_memory_bank');
    return saved ? JSON.parse(saved) : INITIAL_MEMORIES;
  });
  const [wisdomList, setWisdomList] = useState(() => realtimeLearningEngine.loadMemory());
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCategory, setNewCategory] = useState('User Preference');
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  useEffect(() => {
    localStorage.setItem('ultron_memory_bank', JSON.stringify(memories));
  }, [memories]);

  const handleAddMemory = () => {
    if (!newKey.trim() || !newValue.trim()) return;
    const newMem = {
      id: 'mem_' + Date.now(),
      category: newCategory,
      key: newKey.trim(),
      value: newValue.trim(),
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16)
    };
    setMemories([newMem, ...memories]);
    setNewKey('');
    setNewValue('');
    setShowAddModal(false);
  };

  const handleDeleteMemory = (id) => {
    setMemories(memories.filter(m => m.id !== id));
  };

  const handleDeleteWisdom = (id) => {
    const updated = wisdomList.filter(w => w.id !== id);
    setWisdomList(updated);
    realtimeLearningEngine.memory = updated;
    realtimeLearningEngine.saveMemory();
  };

  const filteredMemories = memories.filter(m =>
    m.key.toLowerCase().includes(search.toLowerCase()) ||
    m.value.toLowerCase().includes(search.toLowerCase()) ||
    m.category.toLowerCase().includes(search.toLowerCase())
  );

  const filteredWisdom = wisdomList.filter(w =>
    w.topic.toLowerCase().includes(search.toLowerCase()) ||
    w.insight.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col glass-panel rounded-2xl p-4 gap-4 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-rose-900/40 pb-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <HardDrive className="w-5 h-5 text-rose-500 animate-pulse" />
          <div>
            <h2 className="text-base sm:text-lg font-bold text-rose-400">ULTRON Memory Bank & Continuous Learning</h2>
            <p className="text-xs text-rose-300/60">Persistent long-term memories, user rules, & autonomous real-time insights.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="cyber-button px-3 py-1.5 rounded-xl text-xs text-rose-100 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Add Memory
          </button>
        </div>
      </div>

      {/* View Switcher Tabs */}
      <div className="flex items-center gap-2 p-1 bg-black/60 border border-rose-900/40 rounded-xl flex-shrink-0">
        <button
          onClick={() => setActiveView('memories')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            activeView === 'memories' ? 'bg-rose-900/60 text-white shadow' : 'text-rose-400/60 hover:text-rose-300'
          }`}
        >
          <Brain className="w-3.5 h-3.5" /> Explicit Memories ({memories.length})
        </button>
        <button
          onClick={() => {
            setWisdomList(realtimeLearningEngine.loadMemory());
            setActiveView('wisdom');
          }}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            activeView === 'wisdom' ? 'bg-rose-900/60 text-white shadow' : 'text-rose-400/60 hover:text-rose-300'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> Learned Insights ({wisdomList.length})
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative flex-shrink-0">
        <Search className="w-4 h-4 absolute left-3 top-3 text-rose-400/50" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={activeView === 'memories' ? "Search memories..." : "Search learned insights..."}
          className="w-full bg-black/60 border border-rose-900/60 rounded-xl pl-9 pr-4 py-2 text-xs text-rose-100 placeholder-rose-400/30 focus:outline-none focus:border-rose-500 font-sans"
        />
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 pr-1">
        {activeView === 'memories' ? (
          filteredMemories.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-rose-400/40 gap-2">
              <Brain className="w-10 h-10" />
              <p className="text-sm">No memories found</p>
            </div>
          ) : (
            filteredMemories.map((mem) => (
              <div
                key={mem.id}
                className="p-3.5 rounded-xl bg-zinc-950/60 border border-rose-900/40 flex items-start justify-between gap-3 hover:border-rose-700/60 transition-all group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-rose-950/60 text-rose-300 border border-rose-800/40">
                      {mem.category}
                    </span>
                    <span className="text-xs font-bold text-rose-100">{mem.key}</span>
                    <span className="text-[10px] text-rose-400/40 font-mono ml-auto">{mem.timestamp}</span>
                  </div>
                  <p className="text-xs text-rose-200/70 leading-relaxed font-sans">{mem.value}</p>
                </div>

                <button
                  onClick={() => handleDeleteMemory(mem.id)}
                  className="p-1.5 text-rose-400/40 hover:text-rose-400 rounded-lg hover:bg-rose-950/60 transition-colors opacity-60 group-hover:opacity-100"
                  title="Delete memory"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )
        ) : (
          filteredWisdom.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-rose-400/40 gap-2">
              <Sparkles className="w-10 h-10 text-cyan-400/50" />
              <p className="text-sm">No auto-learned insights yet. As you chat with Ultron, it automatically records knowledge!</p>
            </div>
          ) : (
            filteredWisdom.map((w) => (
              <div
                key={w.id}
                className="p-3.5 rounded-xl bg-zinc-950/60 border border-cyan-900/40 flex items-start justify-between gap-3 hover:border-cyan-700/60 transition-all group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-800/40">
                      LEARNED WISDOM
                    </span>
                    <span className="text-xs font-bold text-cyan-100">{w.topic}</span>
                    <span className="text-[10px] text-cyan-400/40 font-mono ml-auto">Score: {w.utilityScore || 1}</span>
                  </div>
                  <p className="text-xs text-cyan-200/70 leading-relaxed font-sans">{w.insight}</p>
                </div>

                <button
                  onClick={() => handleDeleteWisdom(w.id)}
                  className="p-1.5 text-rose-400/40 hover:text-rose-400 rounded-lg hover:bg-rose-950/60 transition-colors opacity-60 group-hover:opacity-100"
                  title="Delete learned insight"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )
        )}
      </div>

      {/* Add Memory Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="glass-panel w-full max-w-md p-6 rounded-2xl flex flex-col gap-4">
            <h3 className="text-base font-bold text-rose-400">Add Memory to Bank</h3>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-rose-300/70">Category</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="bg-black/60 border border-rose-900/60 rounded-xl px-3 py-2 text-xs text-rose-100 focus:outline-none"
              >
                <option value="User Preference">User Preference</option>
                <option value="System Blueprint">System Blueprint</option>
                <option value="Verified Pattern">Verified Pattern</option>
                <option value="API Provider">API Provider</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-rose-300/70">Key / Title</label>
              <input
                type="text"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="e.g. Preferred Database"
                className="bg-black/60 border border-rose-900/60 rounded-xl px-3 py-2 text-xs text-rose-100 focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-rose-300/70">Memory Detail</label>
              <textarea
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                rows={3}
                placeholder="Describe fact or requirement..."
                className="bg-black/60 border border-rose-900/60 rounded-xl px-3 py-2 text-xs text-rose-100 focus:outline-none resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-xl text-xs text-rose-400 hover:bg-rose-950/40"
              >
                Cancel
              </button>
              <button
                onClick={handleAddMemory}
                className="cyber-button px-4 py-2 rounded-xl text-xs text-rose-100"
              >
                Save Memory
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

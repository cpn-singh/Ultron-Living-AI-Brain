import React, { useState } from 'react';
import { 
  Target, BrainCircuit, Code2, Boxes, Brain, TestTube2, 
  BookOpen, Cloud, Cpu, Workflow, FolderGit2, Search, Sparkles
} from 'lucide-react';
import { BOTS, BOT_CATEGORIES } from '../data/botsData';

const ICON_MAP = {
  Target,
  BrainCircuit,
  Code2,
  Boxes,
  Brain,
  TestTube2,
  BookOpen,
  Cloud,
  Cpu,
  Workflow,
  FolderGit2
};

export default function AgentSelector({ activeAgent, setActiveAgent }) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const filteredBots = BOTS.filter((bot) => {
    const matchesSearch = 
      bot.name.toLowerCase().includes(search.toLowerCase()) ||
      bot.shortName.toLowerCase().includes(search.toLowerCase()) ||
      bot.description.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCategory === 'All' || bot.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const activeBotObj = BOTS.find(b => b.id === activeAgent) || BOTS[0];

  return (
    <div className="flex flex-col h-full gap-3 overflow-hidden">
      {/* Header & Title */}
      <div className="flex items-center justify-between border-b border-rose-900/40 pb-2 flex-shrink-0">
        <div>
          <h2 className="text-xs font-bold tracking-widest text-rose-400 uppercase flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
            11-Bot Fleet Selector
          </h2>
          <p className="text-[10px] text-rose-300/50">Select specialist AI bot engine</p>
        </div>
        <span className="text-[10px] bg-rose-950/60 border border-rose-800/50 text-rose-300 px-2 py-0.5 rounded-full font-mono">
          11 ONLINE
        </span>
      </div>

      {/* Search Input */}
      <div className="relative flex-shrink-0">
        <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-rose-400/50" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter bot fleet..."
          className="w-full bg-black/60 border border-rose-950 rounded-xl pl-8 pr-3 py-1.5 text-xs text-rose-100 placeholder-rose-400/30 focus:outline-none focus:border-rose-500/60"
        />
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 flex-shrink-0 no-scrollbar">
        <button
          onClick={() => setSelectedCategory('All')}
          className={`px-2 py-1 rounded-lg text-[10px] font-medium transition-all whitespace-nowrap ${
            selectedCategory === 'All'
              ? 'bg-rose-600/30 text-rose-200 border border-rose-500/50'
              : 'text-rose-300/50 hover:text-rose-200 hover:bg-rose-950/40'
          }`}
        >
          All (11)
        </button>
        {BOT_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-2 py-1 rounded-lg text-[10px] font-medium transition-all whitespace-nowrap ${
              selectedCategory === cat
                ? 'bg-rose-600/30 text-rose-200 border border-rose-500/50'
                : 'text-rose-300/50 hover:text-rose-200 hover:bg-rose-950/40'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Bot Fleet List */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-1.5 pr-1">
        {filteredBots.map((bot) => {
          const IconComp = ICON_MAP[bot.icon] || Target;
          const isSelected = activeAgent === bot.id;
          return (
            <button
              key={bot.id}
              onClick={() => setActiveAgent(bot.id)}
              className={`flex items-start gap-2.5 p-2.5 rounded-xl text-left transition-all border group ${
                isSelected
                  ? 'bg-rose-900/40 border-rose-500/70 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
                  : 'bg-zinc-950/40 border-rose-950/40 hover:bg-rose-950/30 hover:border-rose-900/50'
              }`}
            >
              <div className={`p-1.5 rounded-lg border mt-0.5 flex-shrink-0 ${
                isSelected ? 'bg-rose-600/20 border-rose-500/60 text-rose-300' : 'bg-black/40 border-rose-900/30 text-rose-400/60 group-hover:text-rose-300'
              }`}>
                <IconComp className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-semibold text-rose-100 truncate">{bot.name}</span>
                  <span className="text-[9px] font-mono text-rose-400/40 bg-black/40 px-1.5 py-0.2 rounded border border-rose-900/30">
                    {bot.shortName}
                  </span>
                </div>
                <p className="text-[10px] text-rose-300/50 line-clamp-2 mt-0.5 leading-tight">{bot.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Bot Footer Detail */}
      {activeBotObj && (
        <div className="p-2.5 rounded-xl bg-black/50 border border-rose-900/40 text-[10px] flex flex-col gap-1 flex-shrink-0">
          <div className="flex items-center justify-between text-rose-400 font-medium">
            <span>ACTIVE BOT DIRECTIVE</span>
            <span className="text-rose-500 font-mono">{activeBotObj.category}</span>
          </div>
          <p className="text-rose-200/60 line-clamp-2">{activeBotObj.description}</p>
        </div>
      )}
    </div>
  );
}

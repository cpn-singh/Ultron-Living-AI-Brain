import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { BOTS, BOT_CATEGORIES } from '../data/botsData';

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
    <div className="flex flex-col h-full gap-3 overflow-hidden select-none">
      {/* Header & Title */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2.5 flex-shrink-0">
        <div>
          <h2 className="text-sm font-bold tracking-tight text-white">
            Specialist Models
          </h2>
          <p className="text-xs text-slate-300">Select model engine</p>
        </div>
        <span className="text-xs font-mono font-bold bg-slate-800 border border-slate-700 text-white px-2.5 py-0.5 rounded-md shadow-sm">
          11 active
        </span>
      </div>

      {/* Search Input */}
      <div className="relative flex-shrink-0">
        <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter models..."
          className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-slate-500 transition-colors"
        />
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 flex-shrink-0 no-scrollbar">
        <button
          onClick={() => setSelectedCategory('All')}
          className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
            selectedCategory === 'All'
              ? 'bg-white text-slate-950 shadow-sm'
              : 'text-slate-200 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700'
          }`}
        >
          All
        </button>
        {BOT_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
              selectedCategory === cat
                ? 'bg-white text-slate-950 shadow-sm'
                : 'text-slate-200 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Bot Fleet List */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1">
        {filteredBots.map((bot) => {
          const isSelected = activeAgent === bot.id;
          return (
            <button
              key={bot.id}
              onClick={() => setActiveAgent(bot.id)}
              className={`flex flex-col gap-1.5 p-3 rounded-xl text-left transition-colors border cursor-pointer ${
                isSelected
                  ? 'bg-slate-800 border-slate-600 shadow-md ring-1 ring-slate-500/40'
                  : 'bg-slate-900/80 border-slate-800 hover:bg-slate-850 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-white tracking-wide truncate">{bot.name}</span>
                {/* Highlighted text in square box */}
                <span className={`text-[11px] font-mono px-2 py-0.5 rounded-md border transition-colors whitespace-nowrap ${
                  isSelected
                    ? 'bg-slate-700 text-white border-slate-400 font-bold shadow-sm'
                    : 'bg-slate-800 text-slate-100 border-slate-600 font-semibold shadow-sm'
                }`}>
                  {bot.shortName}
                </span>
              </div>
              <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">{bot.description}</p>
            </button>
          );
        })}
      </div>

      {/* Active Bot Footer Detail */}
      {activeBotObj && (
        <div className="p-3 rounded-xl bg-slate-900 border border-slate-750 text-xs flex flex-col gap-1.5 flex-shrink-0">
          <div className="flex items-center justify-between text-white font-medium">
            <span className="text-xs font-bold text-slate-200">ACTIVE DIRECTIVE</span>
            <span className="text-[11px] font-mono text-white bg-slate-800 px-2 py-0.5 rounded-md border border-slate-600 font-bold shadow-sm">
              {activeBotObj.category}
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">{activeBotObj.description}</p>
        </div>
      )}
    </div>
  );
}

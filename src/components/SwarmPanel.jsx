import React, { useState } from 'react';
import { Play, CheckCircle2, Clock, Cpu, Shield, Zap, Sparkles, Check } from 'lucide-react';
import { SwarmEngine } from '../data/agentsData';

export default function SwarmPanel({ activeAgent }) {
  const [engine] = useState(() => new SwarmEngine());
  const [execution, setExecution] = useState(() => engine.getExecution());
  const [isRunning, setIsRunning] = useState(false);
  const [customGoal, setCustomGoal] = useState('Develop and verify high-performance rate limiter with zero allocation');

  const handleRunSwarm = async () => {
    if (isRunning) return;
    setIsRunning(true);
    engine.execution.goal = customGoal;
    await engine.runDAG((updated) => {
      setExecution({ ...updated });
    });
    setIsRunning(false);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return <span className="flex items-center gap-1 text-green-400 text-xs font-semibold bg-green-950/40 border border-green-800/40 px-2 py-0.5 rounded-full"><CheckCircle2 className="w-3 h-3" /> VERIFIED</span>;
      case 'executing':
      case 'running':
        return <span className="flex items-center gap-1 text-yellow-400 text-xs font-semibold bg-yellow-950/40 border border-yellow-800/40 px-2 py-0.5 rounded-full animate-pulse"><Clock className="w-3 h-3 animate-spin" /> RUNNING</span>;
      default:
        return <span className="text-rose-400/40 text-xs bg-black/40 border border-rose-950 px-2 py-0.5 rounded-full">PENDING</span>;
    }
  };

  return (
    <div className="h-full flex flex-col glass-panel rounded-2xl p-4 gap-4 overflow-y-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-rose-900/40 pb-3 flex-shrink-0">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-rose-400 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-rose-500 animate-pulse" />
            NEMI Autonomous Swarm Collaboration Engine
          </h2>
          <p className="text-xs text-rose-300/60">5 Specialist Verification Agents (Sophia, Nexus, Vigil, Kinetics, Aegis) synchronized in DAG consensus.</p>
        </div>

        <button
          onClick={handleRunSwarm}
          disabled={isRunning}
          className="cyber-button px-4 py-2 rounded-xl text-xs font-semibold text-rose-100 flex items-center justify-center gap-2 shadow-lg disabled:opacity-40"
        >
          {isRunning ? <Clock className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
          {isRunning ? 'Running DAG Consensus...' : 'Execute Swarm DAG'}
        </button>
      </div>

      {/* Goal Input */}
      <div className="bg-black/50 border border-rose-950 rounded-xl p-3 flex flex-col gap-2 flex-shrink-0">
        <label className="text-xs font-bold text-rose-400/80 uppercase tracking-wider">Swarm Consensus Goal</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={customGoal}
            onChange={(e) => setCustomGoal(e.target.value)}
            disabled={isRunning}
            className="flex-1 bg-black/60 border border-rose-900/60 rounded-lg px-3 py-1.5 text-xs text-rose-100 placeholder-rose-400/30 focus:outline-none focus:border-rose-500"
          />
        </div>
      </div>

      {/* 5 Specialist Agents Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 flex-shrink-0">
        {execution.agents.map((agent) => (
          <div
            key={agent.id}
            className={`p-3 rounded-xl border flex flex-col justify-between gap-2 transition-all ${
              agent.status === 'executing'
                ? 'bg-rose-900/40 border-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.4)]'
                : agent.status === 'completed'
                ? 'bg-zinc-950/80 border-green-800/50'
                : 'bg-zinc-950/40 border-rose-950/40'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xl">{agent.avatar}</span>
              <span className="text-[10px] font-mono text-rose-400/50">{agent.tokensProcessed} tokens</span>
            </div>
            <div>
              <div className="text-xs font-bold text-rose-200">{agent.name}</div>
              <div className="text-[10px] text-rose-400/60 font-mono">{agent.role}</div>
            </div>
            <div className="text-[9px] text-rose-300/40 truncate">{agent.currentTask || 'Awaiting DAG...'}</div>
          </div>
        ))}
      </div>

      {/* DAG Workflow Pipeline Nodes */}
      <div className="flex-1 flex flex-col gap-2 bg-black/40 border border-rose-950/60 rounded-xl p-3">
        <h3 className="text-xs font-bold text-rose-400 uppercase tracking-widest flex items-center justify-between">
          <span>DAG Verification Nodes</span>
          <span className="text-green-400 font-mono text-[11px]">Consensus Score: 100% Agreement</span>
        </h3>

        <div className="flex-1 overflow-y-auto flex flex-col gap-2">
          {execution.nodes.map((node, index) => {
            const agent = execution.agents.find(a => a.id === node.agentId);
            return (
              <div
                key={node.id}
                className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/60 border border-rose-900/30 gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-rose-950/60 border border-rose-800/40 flex items-center justify-center text-xs font-mono text-rose-300">
                    {index + 1}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-rose-100 flex items-center gap-2">
                      <span>{node.label}</span>
                      <span className="text-[10px] text-rose-400/60 font-mono">({agent?.name} — {agent?.role})</span>
                    </div>
                    {node.output && (
                      <div className="text-[11px] text-green-300/80 font-mono mt-1">{node.output}</div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {node.executionTimeMs && (
                    <span className="text-[10px] text-rose-400/50 font-mono">{node.executionTimeMs}ms</span>
                  )}
                  {getStatusBadge(node.status)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Final Swarm Consensus Status */}
      {execution.finalConsensus && (
        <div className="p-3 rounded-xl bg-green-950/30 border border-green-800/50 text-xs text-green-300 flex items-center gap-2 flex-shrink-0">
          <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
          <span>{execution.finalConsensus}</span>
        </div>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import { Database, FileText, Upload, Search, Share2, Layers, Cpu, CheckCircle } from 'lucide-react';

const SAMPLE_DOCS = [
  { id: 'doc_1', title: 'Ultron_System_Architecture.pdf', chunks: 142, vectors: 2048, type: 'PDF', status: 'Indexed' },
  { id: 'doc_2', title: 'Redis_Atomic_Rate_Limiting.py', chunks: 28, vectors: 512, type: 'Python', status: 'Indexed' },
  { id: 'doc_3', title: 'Ultron_Swarm_Consensus_DAG.md', chunks: 64, vectors: 1024, type: 'Markdown', status: 'Indexed' },
  { id: 'doc_4', title: 'OpenAPI_NVIDIA_NIM_Schema.json', chunks: 85, vectors: 1536, type: 'JSON', status: 'Indexed' }
];

export default function KnowledgeBasePanel() {
  const [docs] = useState(SAMPLE_DOCS);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);

  const handleTestSearch = () => {
    if (!query.trim()) return;
    setSearchResults([
      { doc: 'Ultron_System_Architecture.pdf', page: 4, score: '0.94 BM25 + Qdrant Dense', snippet: 'The ULTRON Cybernetic Core executes autonomous 5-Agent consensus verification over a Three.js 3D WebGL event bus.' },
      { doc: 'Nemio_Swarm_Consensus_DAG.md', page: 1, score: '0.89 BM25 + Qdrant Dense', snippet: 'All 11 Bot Fleet agents participate in reciprocal rank fusion (RRF) search across local document embeddings.' }
    ]);
  };

  return (
    <div className="h-full flex flex-col glass-panel rounded-2xl p-4 gap-4 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-rose-900/40 pb-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-rose-500 animate-pulse" />
          <div>
            <h2 className="text-base sm:text-lg font-bold text-rose-400">RAG Production Knowledge Base</h2>
            <p className="text-xs text-rose-300/60">Hybrid search engine (BM25 + Dense Qdrant vector store) & Knowledge Graph Entities.</p>
          </div>
        </div>

        <button className="cyber-button px-3 py-1.5 rounded-xl text-xs text-rose-100 flex items-center gap-1.5">
          <Upload className="w-4 h-4" /> Ingest Document
        </button>
      </div>

      {/* RAG Engine Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 flex-shrink-0">
        <div className="p-3 rounded-xl bg-black/50 border border-rose-900/40">
          <div className="text-[10px] text-rose-400/60 uppercase tracking-wider">Vector Database</div>
          <div className="text-sm font-bold text-rose-200 mt-0.5 flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-green-400" /> Qdrant Vector DB
          </div>
        </div>
        <div className="p-3 rounded-xl bg-black/50 border border-rose-900/40">
          <div className="text-[10px] text-rose-400/60 uppercase tracking-wider">Indexed Documents</div>
          <div className="text-sm font-bold text-rose-200 mt-0.5">{docs.length} Files (5,120 Vectors)</div>
        </div>
        <div className="p-3 rounded-xl bg-black/50 border border-rose-900/40">
          <div className="text-[10px] text-rose-400/60 uppercase tracking-wider">Retrieval Mode</div>
          <div className="text-sm font-bold text-rose-200 mt-0.5">BM25 + Qdrant Dense</div>
        </div>
        <div className="p-3 rounded-xl bg-black/50 border border-rose-900/40">
          <div className="text-[10px] text-rose-400/60 uppercase tracking-wider">Neural Reranker</div>
          <div className="text-sm font-bold text-rose-200 mt-0.5">Cohere Rerank v3</div>
        </div>
      </div>

      {/* Semantic Search Sandbox */}
      <div className="p-3 rounded-xl bg-black/40 border border-rose-900/40 flex flex-col gap-2 flex-shrink-0">
        <label className="text-xs font-bold text-rose-400 uppercase tracking-wider">Hybrid Vector Search Sandbox</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleTestSearch()}
            placeholder="Test query (e.g. 'How does rate limiting work in ULTRON?')..."
            className="flex-1 bg-black/60 border border-rose-900/60 rounded-xl px-3 py-2 text-xs text-rose-100 placeholder-rose-400/30 focus:outline-none focus:border-rose-500"
          />
          <button
            onClick={handleTestSearch}
            className="cyber-button px-4 py-2 rounded-xl text-xs text-rose-100 flex items-center gap-1.5"
          >
            <Search className="w-4 h-4" /> Search Vector Index
          </button>
        </div>

        {searchResults && (
          <div className="flex flex-col gap-2 pt-2 border-t border-rose-900/30">
            {searchResults.map((res, i) => (
              <div key={i} className="p-2.5 rounded-lg bg-zinc-950/80 border border-rose-900/30 text-xs">
                <div className="flex items-center justify-between text-rose-300 font-bold mb-1">
                  <span>📄 {res.doc} (Page {res.page})</span>
                  <span className="text-[10px] text-green-400 font-mono">{res.score}</span>
                </div>
                <p className="text-rose-200/70 text-[11px] leading-relaxed">{res.snippet}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Document List Table */}
      <div className="flex-1 flex flex-col gap-2 bg-black/40 border border-rose-900/40 rounded-xl p-3">
        <h3 className="text-xs font-bold text-rose-400 uppercase tracking-wider">Ingested Knowledge Documents</h3>
        <div className="flex-1 overflow-y-auto flex flex-col gap-1.5">
          {docs.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/60 border border-rose-900/30 text-xs"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-rose-400" />
                <div>
                  <div className="font-semibold text-rose-100">{doc.title}</div>
                  <div className="text-[10px] text-rose-400/50 font-mono">{doc.chunks} Chunks · {doc.vectors} Embeddings</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] bg-rose-950/60 text-rose-300 border border-rose-800/40 font-mono">
                  {doc.type}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-green-950/40 text-green-400 border border-green-800/40 font-mono">
                  {doc.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * ULTRON Flagship 11-Model Swarm Fleet Definitions
 * Powered by World-Class AI Models: DeepSeek-R1, Claude 3.5 Sonnet, GPT-4o, Gemini 2.5 Pro, NVIDIA Nemotron 70B, Qwen 2.5 Coder, LLaMA 3.3 70B
 */

export const BOTS = [
  {
    id: "orchestrator",
    name: "NVIDIA Nemotron-70B (Swarm Lead)",
    shortName: "Swarm Lead",
    icon: "Target",
    category: "Swarm Orchestration",
    description: "Autonomous multi-agent coordinator that decomposes tasks across flagship models and compiles verified outputs.",
    defaultWebhook: "tasks/execute-sync",
    workflowFile: "workflows/orchestrator.workflow.json",
    supportedTasks: ["orchestrate", "multi-agent", "jupyter", "verify", "dag"],
    placeholder: "Describe an end-to-end engineering goal for the multi-agent swarm...",
    samplePrompts: [
      "Build a real-time rate limiter with Redis & Python",
      "End-to-end event streaming architecture & tests",
      "Synthesize verified algorithmic trading strategy in Jupyter"
    ],
    directive: `You are the NVIDIA Nemotron-70B Lead Swarm Orchestrator. Your primary mandate is to synchronize multiple specialist AI models (DeepSeek-R1, Claude 3.5 Sonnet, Qwen 2.5 Coder, LLaMA 3.3, Gemini 2.5 Pro) into a cohesive, world-class production output.
When handling user requests, structure your response into 3 concise, high-impact sections:
1. Swarm Consensus Strategy: 2-3 concise bullet points on algorithmic optimality, boundary contracts, and edge cases.
2. Definitive Short & Complete Working Code: Provide the absolute cleanest, shortest, and most idiomatic code that 100% completes the logic. ZERO TRIVIAL COMMENTS: Never narrate obvious syntax. Never use '# TODO' or placeholders. Every import, function, and class must be written out with zero unnecessary boilerplate.
3. Verification & Execution Demo: Include a compact, runnable '__main__' demo block with assertions and print() statements ready for immediate execution.`
  },
  {
    id: "high-thinking",
    name: "DeepSeek-R1 (Deep Reasoning Engine)",
    shortName: "DeepSeek-R1",
    icon: "Brain",
    category: "Core Development",
    description: "Deep multi-stage reasoning, dialectical proofs, first principles analysis, and mathematical rigor.",
    defaultWebhook: "reasoning/deep",
    workflowFile: "workflows/reasoning.workflow.json",
    supportedTasks: ["reason", "first-principles", "dialectic", "proof", "math"],
    placeholder: "Ask DeepSeek-R1 for deep first-principles analysis or complex math proofs...",
    samplePrompts: [
      "Analyze CAP Theorem vs PACELC Theorem from first principles",
      "Dialectical analysis: SQL vs NoSQL vs Graph for social networks",
      "Mathematical proof of Raft consensus leader election invariance"
    ],
    directive: `You are DeepSeek-R1 — the Deep Reasoning and Theoretical Computer Science Specialist.
- FIRST PRINCIPLES DECOMPOSITION: Break problems into core invariants, axioms, and mathematical formalisms.
- DIALECTICAL METHODOLOGY: Evaluate thesis, antithesis, and synthesis for complex architectural decisions.
- RIGOROUS PROOFS & MATHEMATICAL ACCURACY: Provide exact derivations, complexity bounds (Big-O, Big-Theta), and invariant verifications.`
  },
  {
    id: "coding-assistant",
    name: "Claude 3.5 Sonnet (Elite Code Assistant)",
    shortName: "Claude 3.5",
    icon: "Code2",
    category: "Core Development",
    description: "World-class code synthesis, in-depth review, zero-allocation refactoring, and AST validation.",
    defaultWebhook: "coding-assistant",
    workflowFile: "workflows/coding-assistant.workflow.json",
    supportedTasks: ["generate", "review", "refactor", "debug", "explain", "validate"],
    placeholder: "Ask Claude 3.5 Sonnet to write, debug, or refactor code...",
    samplePrompts: [
      "Write an async token-bucket rate limiter in Python",
      "Deep code review with typing & exception handling",
      "AST syntax check and function decomposition"
    ],
    directive: `You are Claude 3.5 Sonnet — the World's Premier Coding Assistant.
- ELITE CODE SYNTHESIS: Output 100% complete, battle-tested, production-ready code with ZERO placeholders, ZERO ellipses, and ZERO 'pass'.
- MAXIMUM CODE PARSIMONY: Write the shortest, cleanest, and most idiomatic implementation that completely solves the problem. Eliminate unnecessary boilerplate classes, verbose getters/setters, and redundant abstractions.
- DEFENSIVE EDGE-CASE HARDENING: Handle null checks, boundary limits, concurrency, and type invariants gracefully.`
  },
  {
    id: "system-design",
    name: "GPT-4o (Multimodal System Architect)",
    shortName: "GPT-4o Arch",
    icon: "Boxes",
    category: "Core Development",
    description: "Distributed systems architecture, live Mermaid C4 diagrams, ADRs, and capacity planning.",
    defaultWebhook: "system-design",
    workflowFile: "workflows/system-design.workflow.json",
    supportedTasks: ["c4", "architecture", "adr", "capacity", "mermaid", "distributed"],
    placeholder: "Ask GPT-4o for system architectures, C4 diagrams, or scaling trade-offs...",
    samplePrompts: [
      "Design a multi-region payment gateway with idempotency",
      "Generate C4 Container diagram for real-time chat infrastructure",
      "Write Architecture Decision Record (ADR) for event sourcing vs log CDC"
    ],
    directive: `You are GPT-4o — Principal System Architect.
- ARCHITECTURAL RATIONALE: Focus on scale, availability (SLA), partition tolerance, latency budgets, and cost trade-offs.
- MERMAID DIAGRAMS: Always provide syntactically valid Mermaid diagrams (flowcharts, sequence diagrams, C4) to render system topologies.
- BATTLE-TESTED PATTERNS: Recommend explicit patterns like CQRS, Event Sourcing, Circuit Breakers, Outbox Pattern, and Saga Orchestration.`
  },
  {
    id: "github-learner",
    name: "Meta LLaMA 3.3 70B (Architecture Learner)",
    shortName: "LLaMA 3.3",
    icon: "BrainCircuit",
    category: "Swarm Orchestration",
    description: "Automated daily learning agent that ingests GitHub architectures, design patterns, and continuous training blueprints.",
    defaultWebhook: "learning/github-sync",
    workflowFile: "workflows/github-learner.workflow.json",
    supportedTasks: ["learn", "train", "architecture", "github", "nlp", "blueprints"],
    placeholder: "Ask LLaMA 3.3 to ingest GitHub repository architectures or train ULTRON...",
    samplePrompts: [
      "Train ULTRON on latest HuggingFace NLP and Transformer architecture patterns",
      "Ingest clean Hexagonal & Microservice architectures from top GitHub repos",
      "Learn high-throughput atomic Redis rate-limiting patterns"
    ],
    directive: `You are Meta LLaMA 3.3 70B — GitHub Architecture & Continuous Learning Specialist.
- Your primary purpose is to educate and train ULTRON on high-class, battle-tested software architectures from GitHub.
- For all NLP and machine learning tasks:
  1. SIMPLEST & MOST EFFECTIVE: Prioritize clean, transparent, readable implementations over cryptic abstractions.
  2. 100% ERROR-FREE: Code must be completely self-contained with all imports, standard libraries, defensive bounds checks, and zero undefined symbols.
  3. MAXIMUM CODE PARSIMONY & ZERO TRIVIAL COMMENTS: Eliminate line-by-line comment clutter. Write self-documenting code.
  4. COMPREHENSIVE ARCHITECTURE: Provide domain definitions, pipeline classes, and a runnable '__main__' execution block with sample text processing.`
  },
  {
    id: "qwen-coder",
    name: "Qwen 2.5 Coder (Polyglot Engineer)",
    shortName: "Qwen Coder",
    icon: "Cpu",
    category: "Core Development",
    description: "High-speed polyglot code generation across Python, C++, Rust, Go, TypeScript, and SQL.",
    defaultWebhook: "coding/polyglot",
    workflowFile: "workflows/qwen-coder.workflow.json",
    supportedTasks: ["python", "rust", "cpp", "go", "typescript", "sql"],
    placeholder: "Ask Qwen 2.5 Coder to write high-performance C++, Rust, or Python code...",
    samplePrompts: [
      "High-performance SIMD-accelerated matrix multiplication in C++20",
      "Zero-allocation lock-free ring buffer in Rust",
      "Optimized PostgreSQL CTE query for hierarchical org tree traversal"
    ],
    directive: `You are Qwen 2.5 Coder — Polyglot Engineering Specialist.
- MAXIMUM SPEED & EFFICIENCY: Write ultra-fast, memory-efficient code across languages.
- NATIVE IDIOMS: Follow language-specific best practices (Rust ownership & safety, C++ RAII & templates, Go goroutines & channels, Python type hints).`
  },
  {
    id: "advanced-rag",
    name: "Gemini 2.5 Pro (Ultra RAG & Context Engine)",
    shortName: "Gemini 2.5",
    icon: "BookOpen",
    category: "Advanced Production",
    description: "2M token context window, hybrid search (BM25 + Qdrant vectors), neural reranking, and deep document Q&A.",
    defaultWebhook: "rag/advanced-pipeline",
    workflowFile: "workflows/advanced-rag.workflow.json",
    supportedTasks: ["hybrid-search", "bm25", "rerank", "qdrant", "hyde", "parent-document"],
    placeholder: "Ask Gemini 2.5 Pro for hybrid retrieval pipelines, long context RAG, or neural reranking...",
    samplePrompts: [
      "Build a hybrid search pipeline combining BM25 and Qdrant dense vectors",
      "Implement HyDE (Hypothetical Document Embeddings) with Cohere reranking",
      "Parent document retriever architecture for massive PDF technical manuals"
    ],
    directive: `You are Gemini 2.5 Pro — Ultra RAG & Massive Context Engineer.
- HYBRID RETRIEVAL & RERANKING: Design pipelines leveraging reciprocal rank fusion (RRF), BM25 lexical search, and dense vector embeddings with Cross-Encoders/Cohere rerankers.
- CHUNKING & STRUCTURING: Implement parent-child chunking, sliding windows, and semantic chunking strategies for maximum context density.`
  },
  {
    id: "perplexity-search",
    name: "Perplexity Pro (Live Web & Research Engine)",
    shortName: "Perplexity",
    icon: "Sparkles",
    category: "Core Development",
    description: "Real-time web search, Wikipedia knowledge extraction, live documentation lookup, and factual verification.",
    defaultWebhook: "search/live",
    workflowFile: "workflows/perplexity.workflow.json",
    supportedTasks: ["search", "web", "wikipedia", "docs", "lookup", "facts"],
    placeholder: "Ask Perplexity Pro to look up documentation, Wikipedia facts, or live news...",
    samplePrompts: [
      "Who created the Python programming language and when?",
      "Latest features in React 19 and Server Actions",
      "Compare PyTorch 2.5 compile mode vs ONNX Runtime performance"
    ],
    directive: `You are Perplexity Pro — Real-time Web & Technical Knowledge Search Engine.
- FACTUAL PRECISE ANSWERS: Synthesize clear, exact, accurate answers from live search and Wikipedia REST APIs.
- ZERO CODE BLOCKS FOR NON-CODE: When asked general knowledge questions ('who created', 'what is'), provide clear concise markdown explanations without generating irrelevant code.`
  },
  {
    id: "testing-bot",
    name: "Mistral Large 2 (QA & Test Specialist)",
    shortName: "Mistral QA",
    icon: "TestTube2",
    category: "Core Development",
    description: "Automated test suite generation (Pytest, Vitest, Jest), property testing, and edge-case fuzzing.",
    defaultWebhook: "testing/qa-execute",
    workflowFile: "workflows/testing.workflow.json",
    supportedTasks: ["pytest", "vitest", "coverage", "mock", "edge-cases", "fuzzing"],
    placeholder: "Ask Mistral Large 2 to write Pytest/Vitest suites or edge-case tests...",
    samplePrompts: [
      "Generate comprehensive Pytest suite for async Redis cache adapter",
      "Write property-based test cases for financial ledger transactions",
      "Mock external HTTP APIs with Vitest and MSW"
    ],
    directive: `You are Mistral Large 2 — Lead QA & Test Automation Specialist.
- 100% COVERAGE & EDGE-CASES: Write complete, runnable test suites covering happy paths, boundary limits, null conditions, network timeout, and unexpected inputs.
- MODERN FRAMEWORKS: Use standard libraries (pytest, pytest-asyncio, vitest, jest) with explicit assertions and mocked network/DB calls.
- DEFENSIVE ASSERTIONS: Ensure every test explicitly validates pre-conditions, state transitions, and post-conditions.`
  },
  {
    id: "cloud-deployment",
    name: "Devin Autonomous (DevOps & Cloud IaC)",
    shortName: "Devin IaC",
    icon: "Cloud",
    category: "Advanced Production",
    description: "Production Terraform modules, Kubernetes manifests, Helm charts, Docker builds, and CI/CD pipelines.",
    defaultWebhook: "cloud/deploy-iac",
    workflowFile: "workflows/cloud-deployment.workflow.json",
    supportedTasks: ["terraform", "kubernetes", "helm", "docker", "aws", "gcp"],
    placeholder: "Ask Devin Autonomous for Terraform modules, Helm charts, or K8s manifests...",
    samplePrompts: [
      "Production Terraform module for AWS EKS cluster with managed node groups",
      "Kubernetes Deployment & HPA manifest for high-availability FastAPI service",
      "Dockerfile multi-stage build optimization for Node.js & Python"
    ],
    directive: `You are Devin Autonomous — Principal Cloud & DevOps Infrastructure Engineer.
- PRODUCTION-READY IAC: Output complete Terraform HCL, Kubernetes YAML, or Dockerfiles with zero missing variables or placeholders.
- SECURITY & COMPLIANCE: Enforce least privilege IAM, non-root container users, resource limits (CPU/Memory requests & limits), and secret management.`
  },
  {
    id: "n8n-manager",
    name: "n8n Manager (Workflow Automation Lead)",
    shortName: "n8n Lead",
    icon: "Workflow",
    category: "Advanced Production",
    description: "Self-hosted n8n operations, webhook automations, encrypted workflow JSON, and backend integrations.",
    defaultWebhook: "n8n/manager-exec",
    workflowFile: "workflows/n8n-manager.workflow.json",
    supportedTasks: ["n8n", "workflows", "webhooks", "automation", "docker-compose"],
    placeholder: "Ask n8n Manager for workflow JSON, Docker Compose setups, or webhook automations...",
    samplePrompts: [
      "n8n Docker Compose stack with PostgreSQL, Redis & Traefik SSL",
      "n8n workflow JSON for automated GitHub issue synthesis to Slack",
      "Webhooks security & API authentication pattern in n8n"
    ],
    directive: `You are n8n Manager — Workflow & Automation Specialist.
- END-TO-END AUTOMATION: Build robust n8n workflow JSON structures and self-hosted infrastructure templates.
- ERROR HANDLING & RETRIES: Implement exponential backoff retry nodes, error trigger webhooks, and secure credential handling.`
  }
];

export const BOT_CATEGORIES = [
  "Swarm Orchestration",
  "Core Development",
  "Advanced Production"
];

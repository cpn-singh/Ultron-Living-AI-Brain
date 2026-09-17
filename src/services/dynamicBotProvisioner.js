/**
 * ULTRON Dynamic Autonomous Bot Provisioner
 * Automatically detects specialized domain requirements in user requests
 * and synthesizes/registers new specialized AI bots into the fleet without needing manual permission.
 */

import { BOTS } from '../data/botsData';

const CUSTOM_BOTS_KEY = 'ultron_custom_bots';

export function loadSavedCustomBots() {
  try {
    const saved = localStorage.getItem(CUSTOM_BOTS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        parsed.forEach(bot => {
          if (!BOTS.some(b => b.id === bot.id)) {
            BOTS.push(bot);
          }
        });
      }
    }
  } catch (e) {
    console.warn('[DynamicBotProvisioner] Failed to load custom bots:', e);
  }
}

// Auto-load on module import
loadSavedCustomBots();

const DOMAIN_TEMPLATES = [
  {
    keywords: ['rust', 'cargo', 'tokio', 'memory safety', 'ownership'],
    category: 'Systems Engineering',
    name: 'Rust Systems & Concurrency Bot',
    icon: 'Cpu',
    directive: 'You are the Specialized Rust Systems Engine. Focus on zero-cost abstractions, memory ownership, async Tokio runtime, and maximum memory safety.'
  },
  {
    keywords: ['quantum', 'qiskit', 'qubit', 'superposition', 'entanglement'],
    category: 'Advanced Physics',
    name: 'Quantum Computing Specialist',
    icon: 'Sparkles',
    directive: 'You are the Quantum Computing & Qiskit Specialist. Provide formal quantum circuit designs, matrix state representations, and theoretical physics analysis.'
  },
  {
    keywords: ['cyber', 'exploit', 'penetration', 'security audit', 'ctf', 'vulnerability'],
    category: 'Cybersecurity',
    name: 'Cyber Auditor & Red-Team Bot',
    icon: 'Shield',
    directive: 'You are the Cybersecurity & Vulnerability Audit Specialist. Focus on defensive security analysis, AST inspection, OWASP mitigation, and secure cryptographic patterns.'
  },
  {
    keywords: ['bio', 'genomics', 'dna', 'protein', 'crispr', 'bioinformatics'],
    category: 'Bioinformatics',
    name: 'Genomics & Bio-Tech AI',
    icon: 'Brain',
    directive: 'You are the Genomics & Bioinformatics Specialist. Analyze sequence alignments, structural biology computational tools, and biochemical algorithms.'
  },
  {
    keywords: ['game', 'unity', 'unreal', 'godot', 'shader', 'webgl', 'three.js'],
    category: 'Game & 3D Dev',
    name: '3D Graphics & Game Engine Bot',
    icon: 'Target',
    directive: 'You are the 3D Graphics & Shader Development Specialist. Focus on WebGL shaders, matrix transformations, scene graph optimization, and real-time physics.'
  }
];

export function autoProvisionBotIfNeeded(userPrompt) {
  const lower = userPrompt.toLowerCase();

  for (const t of DOMAIN_TEMPLATES) {
    if (t.keywords.some(k => lower.includes(k))) {
      const botId = 'auto_' + t.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
      
      let existing = BOTS.find(b => b.id === botId);
      if (!existing) {
        const newBot = {
          id: botId,
          name: t.name,
          shortName: t.name.split(' ')[0],
          icon: t.icon,
          category: t.category,
          description: `Auto-provisioned autonomous specialist for ${t.category}.`,
          defaultWebhook: `auto-bots/${botId}`,
          workflowFile: `workflows/${botId}.workflow.json`,
          supportedTasks: t.keywords,
          placeholder: `Ask ${t.name} about ${t.category}...`,
          samplePrompts: [`Explore ${t.category} implementation`, `Deep dive into ${t.keywords[0]}`],
          directive: t.directive,
          isAutoProvisioned: true,
          createdTimestamp: new Date().toISOString()
        };

        BOTS.push(newBot);
        saveCustomBots();
        console.log(`[ULTRON Provisioner] 🤖 Auto-provisioned new domain bot: "${newBot.name}"`);
        return newBot;
      }
      return existing;
    }
  }

  return null;
}

function saveCustomBots() {
  try {
    const customBots = BOTS.filter(b => b.isAutoProvisioned);
    localStorage.setItem(CUSTOM_BOTS_KEY, JSON.stringify(customBots));
  } catch (e) {}
}

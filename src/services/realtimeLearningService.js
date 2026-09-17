/**
 * ULTRON Real-Time Continuous Learning Engine
 * Continuously records user feedback, execution results, preferred patterns, and domain insights,
 * injecting learned wisdom into system prompts in real-time.
 */

const KNOWLEDGE_KEY = 'ultron_learned_wisdom';

export class RealtimeLearningEngine {
  constructor() {
    this.memory = this.loadMemory();
  }

  loadMemory() {
    try {
      const saved = localStorage.getItem(KNOWLEDGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  }

  recordInsight(topic, insight, source = 'USER_INTERACTION') {
    const entry = {
      id: 'learn_' + Date.now(),
      timestamp: new Date().toISOString(),
      topic,
      insight,
      source,
      utilityScore: 1
    };

    // Prevent duplicate insights
    const existingIndex = this.memory.findIndex(m => m.topic.toLowerCase() === topic.toLowerCase());
    if (existingIndex >= 0) {
      this.memory[existingIndex].insight = insight;
      this.memory[existingIndex].utilityScore += 1;
      this.memory[existingIndex].timestamp = new Date().toISOString();
    } else {
      this.memory.unshift(entry);
    }

    if (this.memory.length > 100) this.memory.pop();
    this.saveMemory();
    console.log(`[ULTRON Realtime Learning] 🧠 Recorded new wisdom for "${topic}":`, insight);
  }

  getRelevantWisdom(userPrompt) {
    if (!this.memory.length) return '';

    const lower = userPrompt.toLowerCase();
    const matches = this.memory.filter(m => lower.includes(m.topic.toLowerCase()) || m.insight.toLowerCase().includes(lower.slice(0, 10)));
    
    if (!matches.length && this.memory.length > 0) {
      // Pick top 3 recent insights
      return this.memory.slice(0, 3).map(m => `- [${m.topic}]: ${m.insight}`).join('\n');
    }

    return matches.map(m => `- [${m.topic}]: ${m.insight}`).join('\n');
  }

  saveMemory() {
    try {
      localStorage.setItem(KNOWLEDGE_KEY, JSON.stringify(this.memory));
    } catch (e) {}
  }
}

export const realtimeLearningEngine = new RealtimeLearningEngine();

export interface CoreMemory {
  human: string;
  agentNotes: string;
  persona: string;
}

export interface MemoryProvider {
  getCoreMemory(): Promise<CoreMemory>;
  updateCoreMemory(block: keyof CoreMemory, content: string): Promise<void>;
  recallRelevant(keyword: string): Promise<any[]>;
  storePreference(content: string): Promise<void>;
}

export interface GenerationOptions {
  temperature?: number;
  maxTokens?: number;
  stopSequences?: string[];
}

export interface ModelProvider {
  name: string;
  load(): Promise<void>;
  generate(prompt: string, options?: GenerationOptions): Promise<string>;
  stream(prompt: string, options?: GenerationOptions): AsyncIterableIterator<string>;
  unload(): Promise<void>;
}

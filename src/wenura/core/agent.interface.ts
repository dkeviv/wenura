export interface AgentConfig {
  modelProvider: string;
  maxTurns?: number;
  temperature?: number;
}

export interface PageContext {
  url: string;
  title: string;
  domSnapshot: string;
  tabId: number;
}

export interface AgentEvent {
  type: 'plan' | 'tool_call' | 'tool_result' | 'verify' | 'complete' | 'error';
  message: string;
  payload?: any;
}

export interface AgentRuntimeAdapter {
  name: string;
  initialize(config: AgentConfig): Promise<void>;
  runTask(goal: string, context: PageContext): AsyncIterableIterator<AgentEvent>;
  stop(): Promise<void>;
}

export interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  type: 'text' | 'system';
}

export interface ClientPersona {
  name: string;
  age: number;
  profession: string;
  personality: string;
  financialSituation: string;
}

export interface ConversationState {
  isActive: boolean;
  isPaused: boolean;
  currentStep: number;
  totalSteps: number;
}

export interface TransactionData {
  id: string;
  amount: number;
  category: string;
  source?: string;
  currency: string;
  type: 'income' | 'expense';
  date: string;
}

export interface SimulationStats {
  totalExchanges: number;
  successfulResponses: number;
  detectedTransactions: number;
  aiErrors: number;
  incomeDetected: number;
  expensesDetected: number;
  nameDetected: boolean;
  overallScore: number;
} 
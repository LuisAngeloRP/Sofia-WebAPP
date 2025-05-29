import { OpenAI } from 'openai';
import { v4 as uuidv4 } from 'uuid';
import { ChatMessage, ClientPersona, ConversationState } from './types/chat';

// Usar la versión client-compatible que no depende de fs
const ConversationMemory = require('./memory/ConversationMemoryClient');
const FinanceAgent = require('./agent/FinanceAgent');

export class AIClientSimulator {
  private client?: OpenAI;
  private apiKey: string;
  private config: {
    model: string;
    maxTokens: number;
    searchContextSize: string;
  };
  public persona: ClientPersona;
  private testPlan: string[];
  private currentStep: number;
  private conversationHistory: string[];
  private offlineMode: boolean = false;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    
    // Si no hay API key, activar modo offline
    if (!apiKey || apiKey.trim() === '') {
      this.offlineMode = true;
    } else {
      this.client = new OpenAI({
        apiKey: apiKey,
        baseURL: 'https://api.perplexity.ai',
        dangerouslyAllowBrowser: true,
        defaultHeaders: {
          'Content-Type': 'application/json',
          'User-Agent': 'SofIA-WebApp/1.0'
        }
      });
    }
    
    this.config = {
      model: 'sonar',  // Usar modelo válido de Perplexity
      maxTokens: 150,
      searchContextSize: 'low'  // Para optimizar costos en simulación
    };
    
    this.persona = {
      name: this.generateRandomName(),
      age: Math.floor(Math.random() * 30) + 25,
      profession: this.getRandomProfession(),
      personality: this.getRandomPersonality(),
      financialSituation: this.getRandomFinancialSituation()
    };
    
    this.testPlan = [
      'greeting',
      'income_report',
      'expense_report',
      'financial_question',
      'goal_setting',
      'advice_request',
      'follow_up',
      'farewell'
    ];
    
    this.currentStep = 0;
    this.conversationHistory = [];
  }

  private generateRandomName(): string {
    const names = ['María', 'Carlos', 'Ana', 'José', 'Carmen', 'Luis', 'Elena', 'Diego', 'Sofia', 'Miguel'];
    return names[Math.floor(Math.random() * names.length)];
  }
  
  private getRandomProfession(): string {
    const professions = [
      'ingeniera de software', 'médico', 'profesora', 'contador', 'diseñadora gráfica',
      'vendedor', 'enfermera', 'abogado', 'arquitecta', 'freelancer'
    ];
    return professions[Math.floor(Math.random() * professions.length)];
  }
  
  private getRandomPersonality(): string {
    const personalities = [
      'cautelosa con el dinero', 'impulsiva en compras', 'muy organizada', 
      'preocupada por el futuro', 'optimista financiera', 'práctica y directa'
    ];
    return personalities[Math.floor(Math.random() * personalities.length)];
  }
  
  private getRandomFinancialSituation(): string {
    const situations = [
      'quiere empezar a ahorrar', 'busca invertir por primera vez', 
      'tiene deudas que controlar', 'planea comprar casa', 
      'quiere mejorar sus finanzas', 'acaba de recibir aumento de sueldo'
    ];
    return situations[Math.floor(Math.random() * situations.length)];
  }

  async generateMessage(): Promise<string | null> {
    if (this.currentStep >= this.testPlan.length) {
      return null;
    }
    
    const currentIntent = this.testPlan[this.currentStep];
    
    // Usar offline mode si no hay cliente disponible
    if (this.offlineMode || !this.client) {
      this.currentStep++;
      return this.getEnhancedFallbackMessage(currentIntent);
    }
    
    const systemPrompt = this.buildSystemPrompt(currentIntent);
    const userPrompt = this.buildUserPrompt(currentIntent);
    
    try {
      console.log('Haciendo llamada a Perplexity API...', {
        model: this.config.model,
        prompt: userPrompt.substring(0, 100) + '...'
      });

      // Usar fetch directamente para acceder a todos los parámetros de Perplexity
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'User-Agent': 'SofIA-WebApp/1.0'
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: this.config.maxTokens,
          temperature: 0.7,
          web_search_options: {
            search_context_size: this.config.searchContextSize
          },
          search_domain_filter: [
            'wikipedia.org',
            'bcp.com.pe',
            'interbank.pe',
            '-pinterest.com',
            '-reddit.com'
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();
      const message = data.choices[0]?.message?.content?.trim() || '';
      
      console.log('Respuesta recibida de Perplexity:', message.substring(0, 100) + '...');
      
      this.currentStep++;
      return message;
      
    } catch (error: unknown) {
      console.error('Error en llamada a Perplexity API:', {
        error: error instanceof Error ? error.message : String(error),
        model: this.config.model,
        intent: currentIntent
      });
      
      // Si hay error de conexión, avanzar y usar fallback
      this.currentStep++;
      return this.getEnhancedFallbackMessage(currentIntent);
    }
  }

  private buildSystemPrompt(intent: string): string {
    return `Eres ${this.persona.name}, una persona de ${this.persona.age} años que trabaja como ${this.persona.profession}. 
Tu personalidad: ${this.persona.personality}. 
Tu situación financiera: ${this.persona.financialSituation}.

Estás hablando con SofIA, un bot de asesoría financiera por WhatsApp.

INSTRUCCIONES:
- Escribe EXACTAMENTE como escribirías por WhatsApp (informal, natural)
- USA números y cantidades específicas y reales para Perú
- No uses signos de moneda confusos, di las cantidades en soles peruanos naturalmente
- Sé específico con gastos e ingresos reales
- Mantén tu personalidad consistente
- No seas muy formal, usa jerga natural
- Limita tu respuesta a 1-2 oraciones máximo

Objetivo actual: ${this.getIntentDescription(intent)}`;
  }

  private buildUserPrompt(intent: string): string {
    let prompt = `Genera UN mensaje de WhatsApp natural para ${intent}.`;
    
    if (this.conversationHistory.length > 0) {
      prompt += `\n\nConversación previa (últimos 2 intercambios):`;
      const recent = this.conversationHistory.slice(-4);
      for (let i = 0; i < recent.length; i += 2) {
        if (recent[i] && recent[i + 1]) {
          prompt += `\nTú: "${recent[i]}"`;
          prompt += `\nSofIA: "${recent[i + 1]}"`;
        }
      }
    }
    
    prompt += `\n\nEscribe tu próximo mensaje considerando tu personalidad y el contexto.`;
    
    return prompt;
  }

  private getIntentDescription(intent: string): string {
    const descriptions: Record<string, string> = {
      'greeting': 'Salúdate y dile tu nombre de forma natural',
      'income_report': 'Menciona cuánto ganaste recientemente (trabajo, freelance, etc.)',
      'expense_report': 'Comenta sobre gastos que tuviste (compras, servicios, etc.)',
      'financial_question': 'Haz una pregunta sobre finanzas personales o inversiones',
      'goal_setting': 'Menciona una meta financiera que tienes',
      'advice_request': 'Pide consejo específico sobre tu situación financiera',
      'follow_up': 'Comenta sobre algo que te dijo SofIA o pide más detalles',
      'farewell': 'Despídete de forma natural y agradece'
    };
    return descriptions[intent] || 'Continúa la conversación naturalmente';
  }

  private getFallbackMessage(intent: string): string {
    const fallbacks: Record<string, string> = {
      'greeting': `Hola! Soy ${this.persona.name}`,
      'income_report': 'Este mes me llegaron como 3500 soles del trabajo',
      'expense_report': 'Gasté como 800 soles en el super esta semana',
      'financial_question': '¿Crees que es buen momento para invertir?',
      'goal_setting': 'Quiero ahorrar para una casa',
      'advice_request': '¿Qué me recomiendas para manejar mejor mi dinero?',
      'follow_up': 'Interesante lo que me dices',
      'farewell': 'Gracias por todo! Nos vemos'
    };
    return fallbacks[intent] || 'Continúo con la conversación';
  }

  private getEnhancedFallbackMessage(intent: string): string {
    const baseMessages: Record<string, string[]> = {
      'greeting': [
        `Hola! Soy ${this.persona.name}, trabajo como ${this.persona.profession}`,
        `Buenas! Me llamo ${this.persona.name}`,
        `Hola Sofia! Soy ${this.persona.name}`
      ],
      'income_report': [
        `Este mes me llegaron como ${Math.floor(Math.random() * 2000 + 2500)} soles del trabajo`,
        `Recibí mi sueldo de ${Math.floor(Math.random() * 2000 + 3000)} soles`,
        `Me pagaron ${Math.floor(Math.random() * 1500 + 2800)} soles esta semana`
      ],
      'expense_report': [
        `Gasté como ${Math.floor(Math.random() * 500 + 300)} soles en el super esta semana`,
        `Se me fueron ${Math.floor(Math.random() * 800 + 400)} soles en comida este mes`,
        `Pagué ${Math.floor(Math.random() * 300 + 150)} soles de luz y agua`
      ],
      'financial_question': [
        '¿Crees que es buen momento para invertir?',
        '¿Cuánto debería ahorrar al mes?',
        '¿Qué opinas de los bancos digitales?',
        '¿Es buena idea tener cuenta en dólares?'
      ],
      'goal_setting': [
        'Quiero ahorrar para una casa',
        'Mi meta es juntar como 10 mil soles este año',
        'Quiero empezar a invertir en algo seguro',
        'Necesito un fondo de emergencia'
      ],
      'advice_request': [
        '¿Qué me recomiendas para manejar mejor mi dinero?',
        '¿Cómo puedo reducir mis gastos?',
        '¿En qué banco me conviene ahorrar?',
        '¿Debería usar tarjeta de crédito?'
      ],
      'follow_up': [
        'Interesante lo que me dices',
        'Eso no lo sabía',
        '¿Podrías explicarme más?',
        'Tiene sentido'
      ],
      'farewell': [
        'Gracias por todo! Nos vemos',
        'Muchas gracias Sofia!',
        'Me ayudaste mucho, hasta la próxima!'
      ]
    };

    const messages = baseMessages[intent] || ['Continúo con la conversación'];
    const randomIndex = Math.floor(Math.random() * messages.length);
    return messages[randomIndex];
  }

  addToHistory(userMessage: string, botResponse: string): void {
    this.conversationHistory.push(userMessage, botResponse);
  }

  reset(): void {
    this.currentStep = 0;
    this.conversationHistory = [];
    this.persona = {
      name: this.generateRandomName(),
      age: Math.floor(Math.random() * 30) + 25,
      profession: this.getRandomProfession(),
      personality: this.getRandomPersonality(),
      financialSituation: this.getRandomFinancialSituation()
    };
  }

  getState(): ConversationState {
    return {
      isActive: this.currentStep < this.testPlan.length,
      isPaused: false,
      currentStep: this.currentStep,
      totalSteps: this.testPlan.length
    };
  }
}

export class AIConversationSimulator {
  private memory: any;
  private agent: any;
  private aiClient: AIClientSimulator;
  private userId: string;
  private isRunning: boolean;
  private isPaused: boolean;
  private onMessageCallback?: (message: ChatMessage) => void;
  private onStatsCallback?: (stats: any) => void;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.memory = new ConversationMemory(10);
    this.agent = new FinanceAgent(this.memory, apiKey);
    this.aiClient = new AIClientSimulator(apiKey);
    this.userId = 'ai_client_' + Date.now();
    this.isRunning = false;
    this.isPaused = false;
  }

  onMessage(callback: (message: ChatMessage) => void): void {
    this.onMessageCallback = callback;
  }

  onStats(callback: (stats: any) => void): void {
    this.onStatsCallback = callback;
  }

  async start(): Promise<void> {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.isPaused = false;
    
    this.emitMessage({
      id: uuidv4(),
      content: `👤 Cliente IA generado: ${this.aiClient.persona.name}, ${this.aiClient.persona.age} años, ${this.aiClient.persona.profession}`,
      sender: 'user',
      timestamp: new Date(),
      type: 'system'
    });

    await this.runConversation();
  }

  pause(): void {
    this.isPaused = true;
  }

  resume(): void {
    if (this.isPaused) {
      this.isPaused = false;
      this.runConversation();
    }
  }

  stop(): void {
    this.isRunning = false;
    this.isPaused = false;
  }

  reset(): void {
    this.stop();
    this.aiClient.reset();
    this.memory = new ConversationMemory(10);
    this.agent = new FinanceAgent(this.memory, this.apiKey);
    this.userId = 'ai_client_' + Date.now();
  }

  private async runConversation(): Promise<void> {
    while (this.isRunning && !this.isPaused) {
      const clientMessage = await this.aiClient.generateMessage();
      
      if (!clientMessage) {
        this.isRunning = false;
        this.emitMessage({
          id: uuidv4(),
          content: '🏁 Conversación terminada',
          sender: 'user',
          timestamp: new Date(),
          type: 'system'
        });
        
        // Generar estadísticas finales
        await this.generateFinalStats();
        break;
      }

      // Mensaje del cliente
      this.emitMessage({
        id: uuidv4(),
        content: clientMessage,
        sender: 'user',
        timestamp: new Date(),
        type: 'text'
      });

      // Pausa para efecto visual
      await this.sleep(1000);

      if (!this.isRunning || this.isPaused) break;

      try {
        // Respuesta del bot
        const context = this.memory.getConversationContext(this.userId);
        const botResponse = await this.agent.generateResponse(clientMessage, context, this.userId);
        
        this.emitMessage({
          id: uuidv4(),
          content: botResponse,
          sender: 'bot',
          timestamp: new Date(),
          type: 'text'
        });

        // Guardar en memoria
        this.memory.addMessage(this.userId, clientMessage, botResponse);
        this.aiClient.addToHistory(clientMessage, botResponse);

        // Pausa entre intercambios
        await this.sleep(1500);

      } catch (error) {
        console.error('Error en conversación:', error);
        this.emitMessage({
          id: uuidv4(),
          content: '❌ Error en la conversación',
          sender: 'bot',
          timestamp: new Date(),
          type: 'system'
        });
      }
    }
  }

  private async generateFinalStats(): Promise<void> {
    const userProfile = this.memory.getUserProfile(this.userId);
    const incomeDetected = userProfile.financial_data?.income?.length || 0;
    const expensesDetected = userProfile.financial_data?.expenses?.length || 0;
    
    const stats = {
      incomeDetected,
      expensesDetected,
      nameDetected: !!userProfile.name,
      transactions: [
        ...(userProfile.financial_data?.income || []).map((income: any) => ({
          ...income,
          type: 'income'
        })),
        ...(userProfile.financial_data?.expenses || []).map((expense: any) => ({
          ...expense,
          type: 'expense'
        }))
      ]
    };

    if (this.onStatsCallback) {
      this.onStatsCallback(stats);
    }
  }

  private emitMessage(message: ChatMessage): void {
    if (this.onMessageCallback) {
      this.onMessageCallback(message);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getPersona(): ClientPersona {
    return this.aiClient.persona;
  }

  getState(): ConversationState {
    return {
      isActive: this.isRunning,
      isPaused: this.isPaused,
      currentStep: this.aiClient.getState().currentStep,
      totalSteps: this.aiClient.getState().totalSteps
    };
  }
} 
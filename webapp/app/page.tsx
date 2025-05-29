'use client';

import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Play, 
  Pause, 
  Square, 
  RotateCcw, 
  MessageCircle, 
  Bot, 
  User, 
  BarChart3,
  TrendingUp,
  TrendingDown,
  Settings
} from 'lucide-react';
import { AIConversationSimulator } from '../lib/ai-simulator';
import { ChatMessage, ClientPersona, ConversationState } from '../lib/types/chat';

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [simulator, setSimulator] = useState<AIConversationSimulator | null>(null);
  const [conversationState, setConversationState] = useState<ConversationState>({
    isActive: false,
    isPaused: false,
    currentStep: 0,
    totalSteps: 8
  });
  const [persona, setPersona] = useState<ClientPersona | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [apiKey, setApiKey] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Check for API key in environment or localStorage
    const envApiKey = process.env.NEXT_PUBLIC_PERPLEXITY_API_KEY;
    const storedApiKey = localStorage.getItem('perplexity_api_key');
    
    if (envApiKey) {
      setApiKey(envApiKey);
    } else if (storedApiKey) {
      setApiKey(storedApiKey);
    } else {
      setShowSettings(true);
    }
  }, []);

  const initializeSimulator = (key: string) => {
    try {
      const sim = new AIConversationSimulator(key);
      
      sim.onMessage((message) => {
        setMessages(prev => [...prev, message]);
      });

      sim.onStats((newStats) => {
        setStats(newStats);
      });

      setSimulator(sim);
      setPersona(sim.getPersona());
      setConversationState(sim.getState());
      
      return sim;
    } catch (error) {
      console.error('Error initializing simulator:', error);
      return null;
    }
  };

  const handleStart = async () => {
    if (!apiKey) {
      setShowSettings(true);
      return;
    }

    let sim = simulator;
    if (!sim) {
      sim = initializeSimulator(apiKey);
      if (!sim) return;
    }

    try {
      await sim.start();
      setConversationState(sim.getState());
    } catch (error) {
      console.error('Error starting conversation:', error);
    }
  };

  const handlePause = () => {
    if (simulator) {
      simulator.pause();
      setConversationState(simulator.getState());
    }
  };

  const handleResume = async () => {
    if (simulator) {
      simulator.resume();
      setConversationState(simulator.getState());
    }
  };

  const handleStop = () => {
    if (simulator) {
      simulator.stop();
      setConversationState(simulator.getState());
    }
  };

  const handleReset = () => {
    if (simulator) {
      simulator.reset();
      setPersona(simulator.getPersona());
      setConversationState(simulator.getState());
    }
    setMessages([]);
    setStats(null);
  };

  const handleNewConversation = () => {
    const sim = initializeSimulator(apiKey);
    if (sim) {
      setMessages([]);
      setStats(null);
      setPersona(sim.getPersona());
      setConversationState(sim.getState());
    }
  };

  const formatAmount = (amount: number): string => {
    // Formatear números correctamente para evitar confusión con separadores de miles
    return new Intl.NumberFormat('es-PE', { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 2 
    }).format(amount);
  };

  const saveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('perplexity_api_key', key);
    setShowSettings(false);
  };

  const formatTime = (date: Date) => {
    return format(date, 'HH:mm', { locale: es });
  };

  const MessageBubble = ({ message }: { message: ChatMessage }) => {
    const isUser = message.sender === 'user';
    const isSystem = message.type === 'system';
    
    if (isSystem) {
      return (
        <div className="flex justify-center my-4">
          <div className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg text-sm max-w-xs text-center">
            {message.content}
          </div>
        </div>
      );
    }

    return (
      <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
        <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
          isUser 
            ? 'bg-green-500 text-white rounded-br-none' 
            : 'bg-white text-gray-800 rounded-bl-none shadow-md'
        }`}>
          <div className="flex items-start gap-2">
            {!isUser && (
              <Bot className="w-4 h-4 mt-1 text-blue-500 flex-shrink-0" />
            )}
            {isUser && (
              <User className="w-4 h-4 mt-1 text-white flex-shrink-0" />
            )}
            <div className="flex-1">
              <p className="text-sm leading-relaxed">{message.content}</p>
              <p className={`text-xs mt-1 ${isUser ? 'text-green-100' : 'text-gray-500'}`}>
                {formatTime(message.timestamp)}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (showSettings) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
          <div className="flex items-center gap-3 mb-6">
            <Settings className="w-6 h-6 text-gray-600" />
            <h2 className="text-xl font-semibold">Configuración</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                API Key de Perplexity
              </label>
              <input
                type="password"
                placeholder="Ingresa tu API key de Perplexity"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                onChange={(e) => {
                  if (e.target.value.trim()) {
                    saveApiKey(e.target.value.trim());
                  }
                }}
              />
            </div>
            
            <div className="text-sm text-gray-600">
              <p>Para obtener una API key:</p>
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>Ve a <a href="https://perplexity.ai" target="_blank" className="text-blue-500">perplexity.ai</a></li>
                <li>Crea una cuenta</li>
                <li>Obtén tu API key</li>
                <li>Pégala aquí</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-green-600 text-white p-4 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageCircle className="w-8 h-8" />
            <div>
              <h1 className="text-xl font-semibold">SofIA AI vs AI Simulator</h1>
              <p className="text-green-100 text-sm">Conversaciones automatizadas</p>
            </div>
          </div>
          
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 hover:bg-green-700 rounded-lg transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto flex gap-6 p-4">
        {/* Chat Area */}
        <div className="flex-1 bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Chat Header */}
          <div className="bg-gray-50 p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-semibold">
                  {persona?.name?.charAt(0) || 'U'}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">
                    {persona?.name || 'Cliente IA'} ↔ SofIA
                  </h3>
                  <p className="text-sm text-gray-600">
                    {conversationState.isActive ? 
                      (conversationState.isPaused ? 'Pausado' : 'Conversando...') : 
                      'Desconectado'}
                  </p>
                </div>
              </div>
              
              {/* Progress */}
              <div className="text-right">
                <p className="text-sm text-gray-600">
                  Paso {conversationState.currentStep} de {conversationState.totalSteps}
                </p>
                <div className="w-32 bg-gray-200 rounded-full h-2 mt-1">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${(conversationState.currentStep / conversationState.totalSteps) * 100}%` 
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="h-96 overflow-y-auto p-4 bg-gray-50">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Presiona "Iniciar" para comenzar una conversación AI vs AI</p>
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Controls */}
          <div className="p-4 bg-white border-t border-gray-200">
            <div className="flex gap-2 justify-center">
              {!conversationState.isActive ? (
                <button
                  onClick={handleStart}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  <Play className="w-4 h-4" />
                  Iniciar
                </button>
              ) : (
                <>
                  {!conversationState.isPaused ? (
                    <button
                      onClick={handlePause}
                      className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
                    >
                      <Pause className="w-4 h-4" />
                      Pausar
                    </button>
                  ) : (
                    <button
                      onClick={handleResume}
                      className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                    >
                      <Play className="w-4 h-4" />
                      Reanudar
                    </button>
                  )}
                  
                  <button
                    onClick={handleStop}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  >
                    <Square className="w-4 h-4" />
                    Detener
                  </button>
                </>
              )}
              
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Reiniciar
              </button>
              
              <button
                onClick={handleNewConversation}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                Nueva
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-80 space-y-6">
          {/* Cliente Info */}
          {persona && (
            <div className="bg-white rounded-lg shadow-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <User className="w-5 h-5" />
                Cliente Simulado
              </h3>
              <div className="space-y-2 text-sm">
                <div><span className="font-medium">Nombre:</span> {persona.name}</div>
                <div><span className="font-medium">Edad:</span> {persona.age} años</div>
                <div><span className="font-medium">Profesión:</span> {persona.profession}</div>
                <div><span className="font-medium">Personalidad:</span> {persona.personality}</div>
                <div><span className="font-medium">Situación:</span> {persona.financialSituation}</div>
              </div>
            </div>
          )}

          {/* Stats */}
          {stats && (
            <div className="bg-white rounded-lg shadow-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Estadísticas
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Nombre detectado:</span>
                  <span className={`text-sm font-medium ${stats.nameDetected ? 'text-green-600' : 'text-red-600'}`}>
                    {stats.nameDetected ? '✅' : '❌'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 flex items-center gap-1">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    Ingresos:
                  </span>
                  <span className="text-sm font-medium text-green-600">
                    {formatAmount(stats.incomeDetected)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 flex items-center gap-1">
                    <TrendingDown className="w-4 h-4 text-red-500" />
                    Gastos:
                  </span>
                  <span className="text-sm font-medium text-red-600">
                    {formatAmount(stats.expensesDetected)}
                  </span>
                </div>
              </div>
              
              {stats.transactions && stats.transactions.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Transacciones Detectadas:</h4>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {stats.transactions.map((transaction: any, index: number) => (
                      <div key={index} className="text-xs text-gray-600 flex items-center gap-1">
                        {transaction.type === 'income' ? (
                          <TrendingUp className="w-3 h-3 text-green-500" />
                        ) : (
                          <TrendingDown className="w-3 h-3 text-red-500" />
                        )}
                        S/{formatAmount(transaction.amount)} - {transaction.source || transaction.category}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

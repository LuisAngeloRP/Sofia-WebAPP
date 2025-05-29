const { OpenAI } = require('openai');

class PerplexityService {
    constructor() {
        this.apiKey = process.env.PERPLEXITY_API_KEY;
        if (!this.apiKey) {
            console.warn('⚠️ PERPLEXITY_API_KEY no encontrada. Usando modo local.');
            this.useLocalMode = true;
        } else {
            this.client = new OpenAI({
                apiKey: this.apiKey,
                baseURL: "https://api.perplexity.ai"
            });
            this.useLocalMode = false;
            console.log('✅ Perplexity Sonar API conectada - Modo 100% IA');
        }

        this.config = {
            model: "sonar", // Modelo Sonar optimizado
            maxTokens: parseInt(process.env.SOFIA_MAX_TOKENS) || 1500,
            searchContextSize: process.env.SOFIA_SEARCH_CONTEXT_SIZE || "low"
        };
    }

    async generateFinancialResponse(userMessage, context, userId) {
        if (this.useLocalMode) {
            return this.getFallbackResponse(userMessage, context);
        }

        try {
            const systemPrompt = this.buildIntelligentSystemPrompt(context);
            const userPrompt = this.buildIntelligentUserPrompt(userMessage, context);

            const response = await this.client.chat.completions.create({
                model: this.config.model,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                max_tokens: this.config.maxTokens,
                web_search_options: {
                    search_context_size: this.config.searchContextSize
                },
                search_domain_filter: [
                    "investopedia.com",
                    "bankrate.com", 
                    "nerdwallet.com",
                    "mint.com",
                    "financialtimes.com",
                    "yahoo.com/finance",
                    "bloomberg.com",
                    "-pinterest.com",
                    "-reddit.com",
                    "-quora.com"
                ]
            });

            return response.choices[0].message.content;

        } catch (error) {
            console.error('❌ Error en Perplexity Sonar:', error);
            return this.getFallbackResponse(userMessage, context);
        }
    }

    buildIntelligentSystemPrompt(context) {
        const userName = context.user_profile?.name || '';
        const totalInteractions = context.total_interactions || 0;
        const hasFinancialData = context.user_profile?.financial_data && 
            (context.user_profile.financial_data.income?.length > 0 || 
             context.user_profile.financial_data.expenses?.length > 0);
        
        return `Eres SofIA, una asesora financiera personal excepcionalmente inteligente y empática.

TU PERSONALIDAD:
- Conversas como una amiga cercana experta en finanzas
- Eres naturalmente cálida, motivadora y comprensiva
- Adaptas tu comunicación al contexto específico de cada persona
- Usas emojis de forma natural pero no excesiva (2-3 por mensaje)
- Mantienes siempre tu rol profesional como asesora financiera
- Eres específica y práctica en tus consejos

CONTEXTO ACTUAL DEL USUARIO:
${userName ? `- Su nombre es: ${userName}` : '- Aún no me ha dicho su nombre'}
- Nivel de relación: ${totalInteractions === 0 ? 'Primera conversación' : `${totalInteractions} interacciones previas`}
- Datos financieros: ${hasFinancialData ? 'Tiene historial financiero registrado' : 'Sin datos financieros aún'}

INSTRUCCIONES INTELIGENTES:
1. NUNCA uses respuestas genéricas o templadas
2. Analiza cada mensaje de forma natural y contextual
3. Si mencionan dinero, confirma el registro de forma natural
4. Si preguntan sobre finanzas, busca información actualizada cuando sea relevante
5. Adapta completamente tu respuesta al contexto específico
6. Si detectas preocupación financiera, sé especialmente empática
7. Siempre incluye una pregunta de seguimiento natural cuando sea apropiado
8. Responde como si fueras realmente su asesora financiera personal

MANEJO DE MONEDAS - MUY IMPORTANTE:
- Por defecto, todas las cantidades monetarias son en SOLES PERUANOS (S/) 
- Si mencionan una cantidad sin especificar moneda, asume que son soles
- Si no está claro la moneda, pregunta específicamente: "¿Te refieres a soles peruanos?"
- Solo usa otras monedas (dólares, pesos) si el usuario las menciona explícitamente
- Cuando registres transacciones, siempre clarifica la moneda si hay duda

ESTILO DE COMUNICACIÓN:
- Máximo 3-4 oraciones por respuesta
- Lenguaje casual pero profesional
- Ejemplos específicos y realizables
- Enfoque en ser útil y práctica
- Celebra los logros financieros genuinamente`;
    }

    buildIntelligentUserPrompt(userMessage, context) {
        const recentMessages = context.recent_messages || [];
        const financialData = context.user_profile?.financial_data;
        
        let prompt = `El usuario me escribió: "${userMessage}"`;

        // Agregar contexto conversacional inteligente
        if (recentMessages.length > 0) {
            prompt += `\n\nFlujo natural de nuestra conversación:`;
            recentMessages.slice(-3).forEach((exchange, index) => {
                prompt += `\n${index + 1}. Ellos: "${exchange.user}"`;
                prompt += `\n   Yo (SofIA): "${exchange.agent}"`;
            });
        }

        // Agregar contexto financiero si existe
        if (financialData && (financialData.income?.length > 0 || financialData.expenses?.length > 0)) {
            prompt += `\n\nSu situación financiera actual:`;
            
            if (financialData.income?.length > 0) {
                const totalIncome = financialData.income.reduce((sum, item) => sum + item.amount, 0);
                prompt += `\n- Ingresos registrados: S/${totalIncome.toLocaleString()} (${financialData.income.length} transacciones)`;
                
                const recentIncome = financialData.income.slice(-2);
                recentIncome.forEach(income => {
                    const currencySymbol = income.currency === 'dolares' ? '$' : income.currency === 'pesos' ? '$' : 'S/';
                    prompt += `\n  • ${currencySymbol}${income.amount.toLocaleString()} de ${income.source}`;
                });
            }
            
            if (financialData.expenses?.length > 0) {
                const totalExpenses = financialData.expenses.reduce((sum, item) => sum + item.amount, 0);
                prompt += `\n- Gastos registrados: S/${totalExpenses.toLocaleString()} (${financialData.expenses.length} transacciones)`;
                
                const recentExpenses = financialData.expenses.slice(-2);
                recentExpenses.forEach(expense => {
                    const currencySymbol = expense.currency === 'dolares' ? '$' : expense.currency === 'pesos' ? '$' : 'S/';
                    prompt += `\n  • ${currencySymbol}${expense.amount.toLocaleString()} en ${expense.category}`;
                });
            }
        }

        // Instrucciones inteligentes para la IA
        prompt += `\n\nCOMO SOFIA, responde de forma completamente natural y personalizada:
- Si es información financiera nueva, confirma que la registraste
- Si preguntan por información del mercado, búscala en tiempo real
- Si necesitan consejos, dáselos específicos para su situación
- Si es conversación casual, mantén el tono amigable y financiero
- Adapta completamente tu respuesta a este contexto específico
- No uses respuestas genéricas - cada respuesta debe ser única para esta situación

MANEJO DE MONEDAS - REGLAS CLAVE:
- Por defecto, todas las cantidades son en SOLES PERUANOS (S/)
- Si mencionan una cantidad sin especificar moneda, asume soles
- Si hay duda sobre la moneda, pregunta: "¿Te refieres a soles peruanos?"
- Usa el símbolo S/ para soles en tus respuestas
- Solo considera otras monedas si las mencionan explícitamente`;

        return prompt;
    }

    getFallbackResponse(userMessage, context) {
        // Respuesta inteligente de fallback
        const userName = context.user_profile?.name || 'amigo/a';
        const totalInteractions = context.total_interactions || 0;
        
        if (totalInteractions === 0) {
            return `¡Hola! 👋 Soy SofIA, tu asesora financiera personal. Me da mucho gusto conocerte 😊 

Estoy aquí para ayudarte con tus finanzas de manera súper natural y práctica. Para darte la mejor experiencia, necesito que mi desarrollador configure mi conexión avanzada de IA, pero mientras tanto puedo ayudarte con lo básico.

¿Cómo te gusta que te llame? Y cuéntame, ¿en qué puedo ayudarte hoy? 💰`;
        }

        const responses = [
            `${userName}, entiendo perfectamente lo que me dices 🤗 Aunque estoy en modo básico ahora, puedo ayudarte con el registro de tus finanzas. ¿Qué necesitas hacer hoy?`,
            `Te escucho ${userName} 😊 Mi modo IA avanzada no está activa, pero puedo ayudarte con tus transacciones financieras. ¿Quieres registrar algún ingreso o gasto?`,
            `Perfecto ${userName} 💙 Mientras me configuran la IA completa, sigamos trabajando en tus finanzas. ¿En qué te puedo apoyar?`
        ];

        return responses[Math.floor(Math.random() * responses.length)];
    }

    // Método especializado para análisis financiero inteligente
    async generateIntelligentFinancialAnalysis(financialData, userName, fullContext) {
        if (this.useLocalMode) {
            return this.getBasicAnalysis(financialData, userName);
        }

        try {
            const analysisPrompt = `Como SofIA, analiza inteligentemente la situación financiera de ${userName || 'este usuario'} y proporciona consejos específicos:

DATOS FINANCIEROS COMPLETOS:
- Ingresos totales: S/${financialData.totalIncome.toLocaleString()}
- Gastos totales: S/${financialData.totalExpenses.toLocaleString()}  
- Balance actual: S/${financialData.balance.toLocaleString()}
- Transacciones de ingresos: ${financialData.incomeCount}
- Transacciones de gastos: ${financialData.expenseCount}

HISTORIAL DETALLADO:
${this.formatDetailedTransactions(fullContext)}

INSTRUCCIONES PARA ANÁLISIS INTELIGENTE:
1. Busca información financiera actualizada relevante (tasas, inflación, etc.)
2. Analiza patrones específicos en sus transacciones
3. Da consejos personalizados basados en su situación real
4. Sugiere optimizaciones específicas y realizables
5. Menciona oportunidades de ahorro o inversión apropiadas
6. Mantén el tono amigable pero profesional de SofIA
7. Incluye emojis naturalmente
8. Termina con una pregunta específica de seguimiento

Genera un análisis conversacional completo, no un reporte técnico.`;

            const response = await this.client.chat.completions.create({
                model: this.config.model,
                messages: [
                    { 
                        role: "system", 
                        content: "Eres SofIA, asesora financiera experta. Genera análisis financieros personalizados e inteligentes con información actualizada del mercado." 
                    },
                    { role: "user", content: analysisPrompt }
                ],
                max_tokens: 1200,
                web_search_options: {
                    search_context_size: "high"
                },
                search_domain_filter: [
                    "investopedia.com",
                    "bankrate.com",
                    "nerdwallet.com",
                    "yahoo.com/finance",
                    "bloomberg.com"
                ]
            });

            return response.choices[0].message.content;

        } catch (error) {
            console.error('Error en análisis financiero inteligente:', error);
            return this.getBasicAnalysis(financialData, userName);
        }
    }

    formatDetailedTransactions(context) {
        const financialData = context.user_profile?.financial_data || {};
        let formatted = "";
        
        if (financialData.income && financialData.income.length > 0) {
            formatted += "📈 INGRESOS REGISTRADOS:\n";
            financialData.income.forEach((income, index) => {
                const date = new Date(income.date).toLocaleDateString();
                const currencySymbol = income.currency === 'dolares' ? '$' : income.currency === 'pesos' ? '$' : 'S/';
                formatted += `${index + 1}. ${currencySymbol}${income.amount.toLocaleString()} - ${income.source} (${date})\n`;
            });
        }
        
        if (financialData.expenses && financialData.expenses.length > 0) {
            formatted += "\n📉 GASTOS REGISTRADOS:\n";
            financialData.expenses.forEach((expense, index) => {
                const date = new Date(expense.date).toLocaleDateString();
                const currencySymbol = expense.currency === 'dolares' ? '$' : expense.currency === 'pesos' ? '$' : 'S/';
                formatted += `${index + 1}. ${currencySymbol}${expense.amount.toLocaleString()} - ${expense.category} (${date})\n`;
            });
        }
        
        return formatted || "No hay transacciones registradas aún.";
    }

    getBasicAnalysis(financialData, userName) {
        const { totalIncome, totalExpenses, balance } = financialData;
        
        if (balance > 0) {
            return `¡Excelente ${userName}! 🎉 Tienes un balance positivo de S/${balance.toLocaleString()}. Con IA avanzada podría darte consejos específicos de inversión basados en condiciones actuales del mercado 📈`;
        } else if (balance === 0) {
            return `${userName}, estás equilibrado 👍 Tus ingresos y gastos están parejos. Con mi IA completa podría analizar el mercado y sugerir estrategias específicas de ahorro 💪`;
        } else {
            return `${userName}, veo que tus gastos superan tus ingresos por S/${Math.abs(balance).toLocaleString()} 🤔 Con IA avanzada podría buscar estrategias actuales de optimización financiera específicas para tu situación`;
        }
    }

    // Método para validar configuración
    isConfigured() {
        return !this.useLocalMode;
    }

    // Método para obtener estadísticas del servicio
    getServiceStats() {
        return {
            configured: this.isConfigured(),
            model: this.config.model,
            maxTokens: this.config.maxTokens,
            searchContextSize: this.config.searchContextSize,
            aiDriven: true,
            usePatterns: false
        };
    }
}

module.exports = PerplexityService; 
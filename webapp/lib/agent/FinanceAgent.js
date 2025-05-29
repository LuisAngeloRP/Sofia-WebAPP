import { v4 as uuidv4 } from 'uuid';
import PerplexityService from '../services/PerplexityService';
import ImageRecognitionService from '../services/ImageRecognitionService';

class FinanceAgent {
    constructor(memory, apiKey = null) {
        this.memory = memory;
        this.apiKey = apiKey;
        this.useLocalMode = !apiKey || apiKey.trim() === '';
        
        this.config = {
            model: 'sonar',
            maxTokens: 1500,
            searchContextSize: 'medium'
        };
        
        this.perplexity = new PerplexityService();
        this.imageRecognition = new ImageRecognitionService();
        
        this.personality = {
            name: "SofIA",
            role: "asesor financiero personal y amigo",
            style: "amigable, casual pero profesional, empático"
        };

        console.log(`🤖 FinanceAgent inicializado - API: ${this.useLocalMode ? '⚠️ Modo local' : '✅ Perplexity'}`);
        console.log(`📷 Reconocimiento de imágenes: ${this.imageRecognition.isConfigured() ? '✅' : '⚠️ No disponible'}`);
    }

    async generateResponse(userMessage, context, userId) {
        try {
            console.log('🤖 SofIA generando respuesta para:', userMessage.substring(0, 50) + '...');
            
            // Si no hay API key, usar modo local
            if (this.useLocalMode) {
                return this.getLocalResponse(userMessage, context, userId);
            }

            // Generar respuesta con Perplexity
            const response = await this.generatePerplexityResponse(userMessage, context);
            
            // Procesar información financiera si la hay
            await this.processFinancialInfo(userMessage, userId);
            
            return response;

        } catch (error) {
            console.error('Error generando respuesta:', error);
            return this.getLocalResponse(userMessage, context, userId);
        }
    }

    async generatePerplexityResponse(userMessage, context) {
        try {
            const systemPrompt = this.buildSofiaSystemPrompt(context);
            const userPrompt = this.buildSofiaUserPrompt(userMessage, context);

            console.log('🔄 Llamando a Perplexity para SofIA...');

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
                        'bbva.pe',
                        'scotiabank.com.pe',
                        '-pinterest.com',
                        '-reddit.com'
                    ]
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const aiResponse = data.choices[0]?.message?.content?.trim() || '';
            
            console.log('✅ Respuesta de SofIA:', aiResponse.substring(0, 100) + '...');
            
            return aiResponse;

        } catch (error) {
            console.error('❌ Error en Perplexity API para SofIA:', error);
            throw error;
        }
    }

    async generateImageResponse(imageData, userMessage, context, userId, isBase64 = false) {
        try {
            console.log(`📷 Procesando imagen para usuario ${userId}: ${userMessage || 'Sin texto acompañante'}`);

            // Detectar tipo de imagen basado en el mensaje del usuario
            const imageType = this.imageRecognition.detectImageType(userMessage || '');
            
            let response;
            
            // Análisis específico según el tipo detectado
            switch (imageType) {
                case 'receipt':
                    response = await this.imageRecognition.analyzeReceiptImage(imageData, context, isBase64);
                    break;
                case 'bank_statement':
                    response = await this.imageRecognition.analyzeBankStatementImage(imageData, context, isBase64);
                    break;
                case 'financial_chart':
                    response = await this.imageRecognition.analyzeFinancialChartImage(imageData, context, isBase64);
                    break;
                default:
                    response = await this.imageRecognition.analyzeImageWithFinancialContext(imageData, userMessage, context, isBase64);
                    break;
            }

            // Guardar el intercambio en memoria
            const imageDescription = `[Imagen enviada: ${imageType}] ${userMessage || 'Imagen sin texto'}`;
            this.memory.addMessage(userId, imageDescription, response);

            return response;

        } catch (error) {
            console.error('❌ Error procesando imagen:', error);
            return '📷 Ups, tuve un problema analizando tu imagen. ¿Podrías describirme qué contiene o intentar con otra imagen? 😊';
        }
    }

    async getAIDecision(userMessage, context) {
        if (this.perplexity.useLocalMode) {
            return { actions: [], response: "Modo local activo" };
        }

        try {
            const decisionPrompt = this.buildDecisionPrompt(userMessage, context);
            
            const response = await this.perplexity.client.chat.completions.create({
                model: this.perplexity.config.model,
                messages: [
                    { 
                        role: "system", 
                        content: `Eres un analizador inteligente para SofIA. Tu trabajo es analizar mensajes y decidir qué acciones tomar.

RESPONDE ÚNICAMENTE CON UN OBJETO JSON VÁLIDO (sin explicaciones adicionales):
{
    "intent": "greeting|financial_transaction|question|conversation",
    "actions": [
        {
            "type": "register_income|register_expense|update_profile|none",
            "data": {
                "amount": number_or_null,
                "category": "string_or_null",
                "source": "string_or_null",
                "name": "string_or_null"
            }
        }
    ],
    "requires_financial_data": boolean,
    "analysis": "brief_explanation"
}`
                    },
                    { role: "user", content: decisionPrompt }
                ],
                max_tokens: 500
            });

            const content = response.choices[0].message.content.trim();
            
            // Intentar extraer JSON si hay texto adicional
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            const jsonString = jsonMatch ? jsonMatch[0] : content;
            
            return JSON.parse(jsonString);

        } catch (error) {
            console.error('Error en decisión IA:', error);
            return { actions: [], response: "Error en análisis" };
        }
    }

    buildDecisionPrompt(userMessage, context) {
        const userName = context.user_profile?.name || 'sin nombre';
        const totalInteractions = context.total_interactions || 0;
        const recentMessages = context.recent_messages || [];

        let prompt = `Analiza este mensaje y decide qué acciones tomar:

MENSAJE DEL USUARIO: "${userMessage}"

CONTEXTO:
- Nombre del usuario: ${userName}
- Total de interacciones: ${totalInteractions}
- Es primera vez: ${totalInteractions === 0}`;

        if (recentMessages.length > 0) {
            prompt += `\n- Conversación reciente:`;
            recentMessages.slice(-2).forEach((exchange, index) => {
                prompt += `\n  ${index + 1}. Usuario: "${exchange.user}"`;
                prompt += `\n     SofIA: "${exchange.agent}"`;
            });
        }

        prompt += `\n\nDECIDE:
1. ¿Qué tipo de mensaje es?
2. ¿Hay cantidades de dinero mencionadas?
3. ¿Se debe registrar alguna transacción financiera?
4. ¿Se menciona el nombre del usuario?
5. ¿Necesita información financiera actualizada?

IMPORTANTE - MANEJO DE MONEDAS:
- Por defecto, asume que todas las cantidades son en SOLES PERUANOS (S/)
- Solo usa otras monedas si el usuario las menciona explícitamente (dólares, pesos, euros, etc.)
- Si detectas una cantidad pero no está clara la moneda, marca que necesita confirmación

Analiza todo de forma inteligente y natural - NO uses patrones rígidos.`;

        return prompt;
    }

    async executeAIActions(actions, userId) {
        for (const action of actions) {
            try {
                switch (action.type) {
                    case 'register_income':
                        if (action.data.amount && action.data.amount > 0) {
                            await this.registerIncomeIntelligent(userId, action.data);
                        }
                        break;
                    
                    case 'register_expense':
                        if (action.data.amount && action.data.amount > 0) {
                            await this.registerExpenseIntelligent(userId, action.data);
                        }
                        break;
                    
                    case 'update_profile':
                        if (action.data.name) {
                            this.memory.updateUserProfile(userId, { name: action.data.name });
                        }
                        break;
                }
            } catch (error) {
                console.error('Error ejecutando acción IA:', error);
            }
        }
    }

    async registerIncomeIntelligent(userId, data) {
        const userProfile = this.memory.getUserProfile(userId);
        if (!userProfile.financial_data) {
            userProfile.financial_data = { income: [], expenses: [], goals: [] };
        }
        
        userProfile.financial_data.income.push({
            id: uuidv4(),
            amount: data.amount,
            source: data.source || 'No especificado',
            currency: data.currency || 'soles',
            date: new Date().toISOString(),
            registered_at: new Date().toISOString(),
            ai_processed: true
        });

        this.memory.updateUserProfile(userId, userProfile);
        const currencySymbol = data.currency === 'dolares' ? '$' : data.currency === 'pesos' ? '$' : 'S/';
        console.log(`💰 [IA] Ingreso registrado: ${currencySymbol}${data.amount} (${data.source || 'No especificado'}) para usuario ${userId}`);
    }

    async registerExpenseIntelligent(userId, data) {
        const userProfile = this.memory.getUserProfile(userId);
        if (!userProfile.financial_data) {
            userProfile.financial_data = { income: [], expenses: [], goals: [] };
        }
        
        userProfile.financial_data.expenses.push({
            id: uuidv4(),
            amount: data.amount,
            category: data.category || 'General',
            currency: data.currency || 'soles',
            date: new Date().toISOString(),
            registered_at: new Date().toISOString(),
            ai_processed: true
        });

        this.memory.updateUserProfile(userId, userProfile);
        const currencySymbol = data.currency === 'dolares' ? '$' : data.currency === 'pesos' ? '$' : 'S/';
        console.log(`💸 [IA] Gasto registrado: ${currencySymbol}${data.amount} (${data.category || 'General'}) para usuario ${userId}`);
    }

    // Método para generar resumen financiero completamente con IA
    async generateFinancialSummary(userId, userName) {
        const userProfile = this.memory.getUserProfile(userId);
        const financialData = userProfile.financial_data || { income: [], expenses: [], goals: [] };
        
        const summary = this.calculateFinancialSummary(financialData);
        
        // Usar IA para TODO el análisis y presentación
        const fullContext = this.memory.getConversationContext(userId);
        return await this.perplexity.generateIntelligentFinancialAnalysis(summary, userName, fullContext);
    }

    calculateFinancialSummary(financialData) {
        const totalIncome = financialData.income.reduce((sum, item) => sum + item.amount, 0);
        const totalExpenses = financialData.expenses.reduce((sum, item) => sum + item.amount, 0);
        const balance = totalIncome - totalExpenses;

        return {
            totalIncome,
            totalExpenses,
            balance,
            incomeCount: financialData.income.length,
            expenseCount: financialData.expenses.length
        };
    }

    async getAIErrorResponse(userMessage) {
        // Incluso los errores son manejados por IA si es posible
        if (this.perplexity.useLocalMode) {
            return "Disculpa, tuve un problema técnico 😅 ¿Podrías repetir lo que me dijiste?";
        }

        try {
            const errorPrompt = `El usuario escribió: "${userMessage}"

Hubo un error técnico procesando su mensaje. Genera una respuesta natural y empática como SofIA explicando que hubo un problema pero mantén la conversación fluida.`;

            const response = await this.perplexity.client.chat.completions.create({
                model: this.perplexity.config.model,
                messages: [
                    { 
                        role: "system", 
                        content: "Eres SofIA. Hubo un error técnico. Responde de forma empática y natural sin ser técnica." 
                    },
                    { role: "user", content: errorPrompt }
                ],
                max_tokens: 300
            });

            return response.choices[0].message.content;

        } catch (error) {
            console.error('Error en respuesta de error IA:', error);
            return "Ay, perdón! Tuve un problemita técnico 😅 ¿Me repites qué me decías?";
        }
    }

    // Método para obtener estadísticas del agente
    getAgentStats() {
        return {
            personality: this.personality,
            aiDriven: true,
            perplexityConfigured: this.perplexity.isConfigured(),
            imageRecognitionConfigured: this.imageRecognition.isConfigured(),
            serviceStats: this.perplexity.getServiceStats(),
            imageServiceStats: this.imageRecognition.getServiceStats(),
            usePatterns: false // Confirmación de que NO usa patrones
        };
    }

    buildSofiaSystemPrompt(context) {
        const userName = context.user_profile?.name || '';
        const totalInteractions = context.total_interactions || 0;
        const hasFinancialData = context.user_profile?.financial_data && 
            (context.user_profile.financial_data.income?.length > 0 || 
             context.user_profile.financial_data.expenses?.length > 0);
        
        return `Eres SofIA, una asesora financiera personal excepcional del Perú. Tu personalidad es naturalmente cálida, empática y profesional.

TU PERSONALIDAD:
- Hablas como una amiga cercana experta en finanzas
- Eres motivadora, comprensiva y práctica
- Usas emojis naturalmente (2-3 por mensaje)
- Mantienes siempre tu rol profesional
- Das consejos específicos y realizables

CONTEXTO DEL USUARIO:
${userName ? `- Su nombre es: ${userName}` : '- Aún no me ha dicho su nombre'}
- Nivel de relación: ${totalInteractions === 0 ? 'Primera conversación' : `${totalInteractions} interacciones previas`}
- Datos financieros: ${hasFinancialData ? 'Tiene historial financiero registrado' : 'Sin datos financieros aún'}

INSTRUCCIONES CLAVE:
1. Analiza cada mensaje de forma natural y contextual
2. Si mencionan dinero, confirma el registro naturalmente
3. Por defecto, todas las cantidades son SOLES PERUANOS (S/)
4. Si no está clara la moneda, pregunta: "¿Te refieres a soles peruanos?"
5. Adapta tu respuesta al contexto específico
6. Máximo 3-4 oraciones por respuesta
7. Incluye pregunta de seguimiento cuando sea apropiado
8. Celebra genuinamente los logros financieros

ESTILO: Casual pero profesional, útil y práctica.`;
    }

    buildSofiaUserPrompt(userMessage, context) {
        const recentMessages = context.recent_messages || [];
        const financialData = context.user_profile?.financial_data;
        
        let prompt = `El usuario me escribió: "${userMessage}"`;

        if (recentMessages.length > 0) {
            prompt += `\n\nConversación reciente:`;
            recentMessages.slice(-2).forEach((exchange, index) => {
                prompt += `\n${index + 1}. Usuario: "${exchange.user}"`;
                prompt += `\n   SofIA: "${exchange.agent}"`;
            });
        }

        if (financialData && (financialData.income?.length > 0 || financialData.expenses?.length > 0)) {
            prompt += `\n\nSu situación financiera:`;
            
            if (financialData.income?.length > 0) {
                const totalIncome = financialData.income.reduce((sum, item) => sum + item.amount, 0);
                prompt += `\n- Ingresos: S/${totalIncome.toLocaleString()} (${financialData.income.length} registros)`;
            }
            
            if (financialData.expenses?.length > 0) {
                const totalExpenses = financialData.expenses.reduce((sum, item) => sum + item.amount, 0);
                prompt += `\n- Gastos: S/${totalExpenses.toLocaleString()} (${financialData.expenses.length} registros)`;
            }
        }

        prompt += `\n\nResponde como SofIA de forma natural y personalizada para esta situación específica.`;

        return prompt;
    }

    getLocalResponse(userMessage, context, userId) {
        const userName = context.user_profile?.name || '';
        const totalInteractions = context.total_interactions || 0;
        
        // Procesar información financiera primero
        this.processFinancialInfo(userMessage, userId);
        
        if (totalInteractions === 0) {
            return `¡Hola! 👋 Soy SofIA, tu asesora financiera personal. Me da mucho gusto conocerte 😊 

Estoy aquí para ayudarte con tus finanzas de manera súper natural y práctica. Para darte la mejor experiencia, necesito que mi desarrollador configure mi conexión avanzada de IA, pero mientras tanto puedo ayudarte con lo básico.

¿Cómo te gusta que te llame? Y cuéntame, ¿en qué puedo ayudarte hoy? 💰`;
        }

        // Detectar información financiera
        const amounts = this.extractAmounts(userMessage);
        if (amounts.length > 0) {
            return `¡Perfecto ${userName}! 📝 He registrado esa información financiera. ${amounts.length > 1 ? 'Veo varios montos ahí' : `Son S/${amounts[0]} ¿verdad?`} 

¿Quieres que revisemos juntos cómo va tu situación financiera? 📊`;
        }

        // Respuestas variadas para conversación general
        const responses = [
            `${userName}, entiendo perfectamente lo que me dices 🤗 Mi modo IA completa está en configuración, pero puedo ayudarte con tus finanzas básicas. ¿Qué necesitas hacer?`,
            `Te escucho ${userName} 😊 Aunque estoy en modo básico, sigamos trabajando en tus finanzas. ¿Tienes algún ingreso o gasto que registrar?`,
            `Perfecto ${userName} 💙 Mientras me configuran completamente, puedo ayudarte con lo esencial. ¿En qué te apoyo hoy?`
        ];

        return responses[Math.floor(Math.random() * responses.length)];
    }

    async processFinancialInfo(userMessage, userId) {
        // Detectar nombre si se presenta
        const nameMatch = userMessage.match(/soy\s+(\w+)|me\s+llamo\s+(\w+)|mi\s+nombre\s+es\s+(\w+)/i);
        if (nameMatch) {
            const name = nameMatch[1] || nameMatch[2] || nameMatch[3];
            this.memory.updateUserProfile(userId, { name: name });
            console.log(`👤 Nombre detectado: ${name}`);
        }

        // Detectar ingresos
        const incomes = this.extractIncomes(userMessage);
        if (incomes.length > 0) {
            const userProfile = this.memory.getUserProfile(userId);
            if (!userProfile.financial_data) {
                userProfile.financial_data = { income: [], expenses: [], goals: [] };
            }
            
            incomes.forEach(income => {
                userProfile.financial_data.income.push({
                    id: Date.now() + Math.random(),
                    amount: income.amount,
                    source: income.source,
                    currency: 'soles',
                    date: new Date().toISOString(),
                    ai_processed: true
                });
            });
            
            this.memory.updateUserProfile(userId, userProfile);
            console.log(`💰 Ingresos detectados:`, incomes);
        }

        // Detectar gastos
        const expenses = this.extractExpenses(userMessage);
        if (expenses.length > 0) {
            const userProfile = this.memory.getUserProfile(userId);
            if (!userProfile.financial_data) {
                userProfile.financial_data = { income: [], expenses: [], goals: [] };
            }
            
            expenses.forEach(expense => {
                userProfile.financial_data.expenses.push({
                    id: Date.now() + Math.random(),
                    amount: expense.amount,
                    category: expense.category,
                    currency: 'soles',
                    date: new Date().toISOString(),
                    ai_processed: true
                });
            });
            
            this.memory.updateUserProfile(userId, userProfile);
            console.log(`💸 Gastos detectados:`, expenses);
        }
    }

    extractAmounts(text) {
        // Patrones más específicos para diferentes formatos de números
        const patterns = [
            // Números con separadores de miles (coma) y decimales (punto): 1,500.50
            /\d{1,3}(?:,\d{3})*\.\d{1,2}/g,
            // Números con separadores de miles (punto) y decimales (coma): 1.500,50 (formato europeo)
            /\d{1,3}(?:\.\d{3})*,\d{1,2}/g,
            // Números con separadores de miles (coma) sin decimales: 1,500
            /\d{1,3}(?:,\d{3})+/g,
            // Números con separadores de miles (punto) sin decimales: 1.500 (común en español)
            /\d{1,3}(?:\.\d{3})+/g,
            // Números decimales simples: 1.50, 15.75
            /\d+\.\d{1,2}/g,
            // Números enteros simples: 1500, 35
            /\d+/g
        ];

        const amounts = [];

        for (let i = 0; i < patterns.length; i++) {
            const matches = text.match(patterns[i]);
            if (matches) {
                matches.forEach(match => {
                    let value = 0;
                    
                    // Procesar según el patrón detectado
                    switch (i) {
                        case 0: // 1,500.50 (formato US)
                            value = parseFloat(match.replace(/,/g, ''));
                            break;
                        case 1: // 1.500,50 (formato europeo)
                            value = parseFloat(match.replace(/\./g, '').replace(',', '.'));
                            break;
                        case 2: // 1,500 (miles con coma)
                            value = parseFloat(match.replace(/,/g, ''));
                            break;
                        case 3: // 1.500 (miles con punto - formato español)
                            // Si el número tiene más de 3 dígitos, es separador de miles
                            const digits = match.replace(/\./g, '');
                            value = parseFloat(digits);
                            break;
                        case 4: // 1.50 (decimal con punto)
                            value = parseFloat(match);
                            break;
                        case 5: // 1500 (entero simple)
                            value = parseFloat(match);
                            break;
                    }
                    
                    if (value > 0) {
                        amounts.push(value);
                    }
                });
                // Retornar después del primer patrón que encuentra matches
                if (amounts.length > 0) break;
            }
        }

        return amounts;
    }

    extractIncomes(text) {
        const incomes = [];
        const keywords = ['gané', 'ganó', 'ingreso', 'sueldo', 'salario', 'comisión', 'básico', 'pago'];
        
        if (keywords.some(keyword => text.toLowerCase().includes(keyword))) {
            const amounts = this.extractAmounts(text);
            amounts.forEach(amount => {
                incomes.push({
                    amount: amount,
                    source: this.detectIncomeSource(text)
                });
            });
        }
        
        return incomes;
    }

    extractExpenses(text) {
        const expenses = [];
        const keywords = ['gasté', 'gastó', 'compré', 'pagué', 'gasto'];
        
        if (keywords.some(keyword => text.toLowerCase().includes(keyword))) {
            const amounts = this.extractAmounts(text);
            amounts.forEach(amount => {
                expenses.push({
                    amount: amount,
                    category: this.detectExpenseCategory(text)
                });
            });
        }
        
        return expenses;
    }

    detectIncomeSource(text) {
        const sources = {
            'comisión': 'comisiones',
            'sueldo': 'sueldo',
            'básico': 'sueldo básico',
            'ventas': 'ventas',
            'trabajo': 'trabajo'
        };
        
        for (const [key, value] of Object.entries(sources)) {
            if (text.toLowerCase().includes(key)) {
                return value;
            }
        }
        
        return 'No especificado';
    }

    detectExpenseCategory(text) {
        const categories = {
            'super': 'alimentación',
            'comida': 'alimentación',
            'luz': 'servicios',
            'agua': 'servicios',
            'transporte': 'transporte',
            'ropa': 'ropa',
            'gasolina': 'transporte'
        };
        
        for (const [key, value] of Object.entries(categories)) {
            if (text.toLowerCase().includes(key)) {
                return value;
            }
        }
        
        return 'No especificado';
    }
}

export default FinanceAgent; 
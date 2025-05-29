const { OpenAI } = require('openai');
require('dotenv').config();

class ImageRecognitionService {
    constructor() {
        this.apiKey = process.env.PERPLEXITY_API_KEY;
        if (!this.apiKey) {
            console.warn('⚠️ PERPLEXITY_API_KEY no encontrada. Reconocimiento de imágenes no disponible.');
            this.useLocalMode = true;
        } else {
            this.client = new OpenAI({
                apiKey: this.apiKey,
                baseURL: "https://api.perplexity.ai"
            });
            this.useLocalMode = false;
            console.log('✅ Servicio de reconocimiento de imágenes activado con Perplexity Sonar');
        }

        this.config = {
            model: "sonar", // Modelo que soporta imágenes
            maxTokens: parseInt(process.env.SOFIA_MAX_TOKENS) || 1500,
        };
    }

    async analyzeImageWithFinancialContext(imageData, userMessage, context, isBase64 = false) {
        if (this.useLocalMode) {
            return this.getFallbackImageResponse();
        }

        try {
            // Construir la URL de la imagen según el tipo
            const imageUrl = isBase64 ? 
                `data:image/jpeg;base64,${imageData}` : 
                imageData;

            const systemPrompt = this.buildImageAnalysisSystemPrompt(context);
            const userPrompt = userMessage || "Por favor analiza esta imagen y dime qué información financiera encuentras";

            // Construir el contenido del mensaje con imagen
            const messageContent = [
                {
                    type: "text",
                    text: userPrompt
                },
                {
                    type: "image_url",
                    image_url: {
                        url: imageUrl
                    }
                }
            ];

            const response = await this.client.chat.completions.create({
                model: this.config.model,
                messages: [
                    { role: "system", content: systemPrompt },
                    { 
                        role: "user", 
                        content: messageContent
                    }
                ],
                max_tokens: this.config.maxTokens,
                stream: false
            });

            return response.choices[0].message.content;

        } catch (error) {
            console.error('❌ Error en reconocimiento de imagen:', error);
            return this.getErrorImageResponse(error);
        }
    }

    buildImageAnalysisSystemPrompt(context) {
        const userName = context.user_profile?.name || '';
        const hasFinancialData = context.user_profile?.financial_data && 
            (context.user_profile.financial_data.income?.length > 0 || 
             context.user_profile.financial_data.expenses?.length > 0);

        return `Eres SofIA, una asesora financiera personal experta en análisis de imágenes financieras.

TU ESPECIALIDAD EN IMÁGENES:
- Analizar recibos, facturas y comprobantes de pago
- Interpretar estados de cuenta bancarios
- Leer gráficos financieros y tablas de inversión
- Identificar información en tarjetas de crédito o débito (SIN revelar datos sensibles)
- Reconocer tickets de compra y gastos
- Interpretar documentos financieros y reportes

CONTEXTO DEL USUARIO:
${userName ? `- Usuario: ${userName}` : '- Usuario nuevo'}
- Datos financieros previos: ${hasFinancialData ? 'Sí tiene registros' : 'Sin registros previos'}

INSTRUCCIONES PARA ANÁLISIS:
1. Describe lo que ves en la imagen con enfoque financiero
2. Extrae información relevante (montos, fechas, categorías, conceptos)
3. NUNCA reveles números completos de tarjetas, cuentas o datos sensibles
4. Si es un gasto/ingreso, pregunta si quiere registrarlo
5. Da consejos financieros basados en lo que observas
6. Mantén el tono amigable y profesional de SofIA
7. Si no encuentras información financiera, ayuda de manera general

INFORMACIÓN SENSIBLE:
- OCULTA números de tarjeta (muestra solo últimos 4 dígitos)
- NO muestres números de cuenta completos
- Mantén la privacidad del usuario siempre

RESPUESTA:
- Máximo 4-5 oraciones
- Incluye 2-3 emojis naturalmente
- Termina con una pregunta útil
- Enfócate en ser práctica y útil`;
    }

    async analyzeReceiptImage(imageData, context, isBase64 = false) {
        const specificPrompt = "Analiza este recibo o comprobante. Extrae el total, la fecha, el lugar y los conceptos principales. ¿Quieres que registre esta transacción en tu historial financiero?";
        return await this.analyzeImageWithFinancialContext(imageData, specificPrompt, context, isBase64);
    }

    async analyzeBankStatementImage(imageData, context, isBase64 = false) {
        const specificPrompt = "Analiza este estado de cuenta. Identifica los movimientos principales, saldos y patrones de gasto. Te ayudo a interpretar esta información financiera.";
        return await this.analyzeImageWithFinancialContext(imageData, specificPrompt, context, isBase64);
    }

    async analyzeFinancialChartImage(imageData, context, isBase64 = false) {
        const specificPrompt = "Analiza este gráfico o tabla financiera. Explícame qué tendencias o información importante puedes identificar que me pueda ayudar en mis decisiones financieras.";
        return await this.analyzeImageWithFinancialContext(imageData, specificPrompt, context, isBase64);
    }

    detectImageType(userMessage) {
        const message = userMessage.toLowerCase();
        
        if (message.includes('recibo') || message.includes('ticket') || message.includes('comprobante') || message.includes('factura')) {
            return 'receipt';
        }
        
        if (message.includes('estado') || message.includes('cuenta') || message.includes('banco') || message.includes('tarjeta')) {
            return 'bank_statement';
        }
        
        if (message.includes('gráfico') || message.includes('grafica') || message.includes('inversión') || message.includes('tabla')) {
            return 'financial_chart';
        }
        
        return 'general';
    }

    getFallbackImageResponse() {
        return `📷 ¡Veo que me enviaste una imagen! Lamentablemente, mi función de reconocimiento de imágenes necesita que mi desarrollador configure la API de Perplexity 🤖

Mientras tanto, puedes:
• Describirme lo que aparece en la imagen
• Contarme los montos que ves
• Enviármelos como texto para que los registre

¿Qué información financiera contiene tu imagen? 😊`;
    }

    getErrorImageResponse(error) {
        if (error.message?.includes('image')) {
            return `📷 Ups, tuve un problema procesando tu imagen 🤔 

Puede ser que:
• La imagen sea muy grande (máximo 5MB)
• El formato no sea compatible (usa PNG, JPEG, WEBP o GIF)
• Haya un problema temporal con el servicio

¿Puedes intentar con otra imagen o contarme qué contiene? 😊`;
        }

        return `📷 Hubo un pequeño problema técnico analizando tu imagen 😅 

¿Podrías describirme qué información financiera contiene? Así te puedo ayudar igualmente 💪`;
    }

    isConfigured() {
        return !this.useLocalMode;
    }

    getServiceStats() {
        return {
            configured: this.isConfigured(),
            model: this.config.model,
            maxTokens: this.config.maxTokens,
            supportedFormats: ['PNG', 'JPEG', 'WEBP', 'GIF'],
            maxImageSize: '5MB',
            features: [
                'Análisis de recibos',
                'Estados de cuenta',
                'Gráficos financieros',
                'Documentos financieros'
            ]
        };
    }
}

module.exports = ImageRecognitionService; 
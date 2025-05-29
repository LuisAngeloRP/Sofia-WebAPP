module.exports = {
    // Configuración del agente
    agent: {
        name: "SofIA",
        maxContextMessages: 10, // Cuántos intercambios mantener en contexto
        personalityProfile: {
            style: "amigable_profesional",
            emotionalIntelligence: true,
            useEmojis: true,
            casualLanguage: true,
            encouragementLevel: "high"
        }
    },

    // Configuración de WhatsApp
    whatsapp: {
        clientId: "sofia-finance-bot",
        respondToGroups: false,
        autoReply: true,
        typingSimulation: true
    },

    // Configuración de memoria
    memory: {
        persistData: true,
        dataPath: "./data",
        backupInterval: 3600000, // 1 hora en millisegundos
        cleanupOldMessages: true,
        cleanupAfterDays: 30
    },

    // Configuración financiera
    finance: {
        defaultCurrency: "soles",
        currencySymbol: "S/",
        categories: {
            income: [
                "salario", "freelance", "venta", "negocio", 
                "trabajo extra", "bono", "inversión"
            ],
            expenses: [
                "Alimentación", "Servicios", "Transporte", "Vivienda",
                "Salud", "Entretenimiento", "Vestimenta", "Educación", "General"
            ]
        },
        insights: {
            enableAutoAnalysis: true,
            warningThresholds: {
                highExpenseRatio: 0.8, // Alerta si gastos > 80% de ingresos
                categoryLimit: 0.3 // Alerta si una categoría > 30% del total
            }
        }
    },

    // Configuración de logs
    logging: {
        enableConsoleLog: true,
        enableFileLog: false,
        logLevel: "info",
        logPath: "./logs"
    },

    // Configuración de desarrollo
    development: {
        debugMode: false,
        mockMode: false,
        testResponses: false
    }
}; 
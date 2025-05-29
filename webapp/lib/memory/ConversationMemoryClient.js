import { format } from 'date-fns';

class ConversationMemoryClient {
    constructor(maxContextMessages = 10) {
        this.maxContextMessages = maxContextMessages;
        this.conversations = new Map();
        this.userProfiles = new Map();
        this.saveDebounceTimeouts = new Map();
        
        // Load data from localStorage
        this.loadConversations();
        this.loadUserProfiles();
    }

    ensureDataDirectory() {
        // No-op for browser version - localStorage handles storage
    }

    loadConversations() {
        try {
            const data = localStorage.getItem('sofia_conversations');
            if (data) {
                const parsed = JSON.parse(data);
                this.conversations = new Map(Object.entries(parsed));
            }
        } catch (error) {
            console.warn('Error loading conversations from localStorage:', error);
            this.conversations = new Map();
        }
    }

    loadUserProfiles() {
        try {
            const data = localStorage.getItem('sofia_user_profiles');
            if (data) {
                const parsed = JSON.parse(data);
                this.userProfiles = new Map(Object.entries(parsed));
            }
        } catch (error) {
            console.warn('Error loading user profiles from localStorage:', error);
            this.userProfiles = new Map();
        }
    }

    saveConversations() {
        try {
            const obj = Object.fromEntries(this.conversations);
            localStorage.setItem('sofia_conversations', JSON.stringify(obj));
        } catch (error) {
            console.error('Error saving conversations to localStorage:', error);
        }
    }

    saveUserProfiles() {
        try {
            const obj = Object.fromEntries(this.userProfiles);
            localStorage.setItem('sofia_user_profiles', JSON.stringify(obj));
        } catch (error) {
            console.error('Error saving user profiles to localStorage:', error);
        }
    }

    saveConversationsDebounced() {
        clearTimeout(this.saveDebounceTimeouts.get('conversations'));
        this.saveDebounceTimeouts.set('conversations', setTimeout(() => {
            this.saveConversations();
        }, 1000));
    }

    saveUserProfilesDebounced() {
        clearTimeout(this.saveDebounceTimeouts.get('profiles'));
        this.saveDebounceTimeouts.set('profiles', setTimeout(() => {
            this.saveUserProfiles();
        }, 1000));
    }

    addMessage(userId, userMessage, agentResponse) {
        if (!this.conversations.has(userId)) {
            this.conversations.set(userId, []);
        }

        const conversation = this.conversations.get(userId);
        const timestamp = new Date().toISOString();

        conversation.push({
            timestamp,
            userMessage,
            agentResponse,
            extractedData: this.extractFinancialData(userMessage + ' ' + agentResponse)
        });

        // Mantener solo los últimos N mensajes
        if (conversation.length > this.maxContextMessages) {
            conversation.splice(0, conversation.length - this.maxContextMessages);
        }

        this.conversations.set(userId, conversation);
        this.saveConversationsDebounced();

        return conversation;
    }

    getConversationContext(userId) {
        const conversation = this.conversations.get(userId) || [];
        return conversation.map(msg => ({
            user: msg.userMessage,
            assistant: msg.agentResponse,
            timestamp: msg.timestamp
        }));
    }

    updateUserProfile(userId, profileData) {
        const existingProfile = this.userProfiles.get(userId) || {};
        const updatedProfile = { ...existingProfile, ...profileData, lastUpdated: new Date().toISOString() };
        this.userProfiles.set(userId, updatedProfile);
        this.saveUserProfilesDebounced();
    }

    getUserProfile(userId) {
        return this.userProfiles.get(userId) || {};
    }

    extractFinancialData(text) {
        const financialData = {
            amounts: [],
            currencies: [],
            categories: [],
            accounts: [],
            dates: []
        };

        // Extraer montos
        const amountMatches = text.match(/\b\d+(?:[\.,]\d{2})?\s*(?:soles?|s\/\.?|pen|pesos?|dólares?|usd|\$|€|euros?)\b/gi);
        if (amountMatches) {
            financialData.amounts = amountMatches.map(match => {
                const amount = this.extractAmount(match);
                return {
                    original: match,
                    value: amount.value,
                    currency: amount.currency
                };
            });
        }

        // Extraer categorías financieras
        const categories = ['comida', 'transporte', 'vivienda', 'salud', 'entretenimiento', 'ropa', 'educación', 'ahorro', 'inversión'];
        categories.forEach(category => {
            if (text.toLowerCase().includes(category)) {
                financialData.categories.push(category);
            }
        });

        // Extraer cuentas/bancos
        const accounts = ['bcp', 'interbank', 'bbva', 'scotiabank', 'banco de la nación', 'yape', 'plin', 'tunki'];
        accounts.forEach(account => {
            if (text.toLowerCase().includes(account)) {
                financialData.accounts.push(account);
            }
        });

        return financialData;
    }

    extractAmount(text) {
        // Primero detectar moneda
        let currency = 'PEN'; // Default soles
        if (text.toLowerCase().includes('dólar') || text.toLowerCase().includes('usd') || text.includes('$')) {
            currency = 'USD';
        } else if (text.toLowerCase().includes('euro') || text.toLowerCase().includes('€')) {
            currency = 'EUR';
        }

        // Extraer valor numérico manteniendo el formato original
        // Patrones más específicos para diferentes formatos de números
        const patterns = [
            // Números con separadores de miles (coma) y decimales (punto): 1,500.50
            /\d{1,3}(?:,\d{3})*\.\d{1,2}/,
            // Números con separadores de miles (punto) y decimales (coma): 1.500,50 (formato europeo)
            /\d{1,3}(?:\.\d{3})*,\d{1,2}/,
            // Números con separadores de miles (coma) sin decimales: 1,500
            /\d{1,3}(?:,\d{3})+/,
            // Números con separadores de miles (punto) sin decimales: 1.500 (común en español)
            /\d{1,3}(?:\.\d{3})+/,
            // Números decimales simples: 1.50, 15.75
            /\d+\.\d{1,2}/,
            // Números enteros simples: 1500, 35
            /\d+/
        ];

        let numberMatch = null;
        let matchedPattern = null;

        for (let i = 0; i < patterns.length; i++) {
            const match = text.match(patterns[i]);
            if (match) {
                numberMatch = match[0];
                matchedPattern = i;
                break;
            }
        }

        if (!numberMatch) return { value: 0, currency };

        let value = 0;

        // Procesar según el patrón detectado
        switch (matchedPattern) {
            case 0: // 1,500.50 (formato US)
                value = parseFloat(numberMatch.replace(/,/g, ''));
                break;
            case 1: // 1.500,50 (formato europeo)
                value = parseFloat(numberMatch.replace(/\./g, '').replace(',', '.'));
                break;
            case 2: // 1,500 (miles con coma)
                value = parseFloat(numberMatch.replace(/,/g, ''));
                break;
            case 3: // 1.500 (miles con punto - formato español)
                // Si el número tiene más de 3 dígitos, es separador de miles
                const digits = numberMatch.replace(/\./g, '');
                value = parseFloat(digits);
                break;
            case 4: // 1.50 (decimal con punto)
                value = parseFloat(numberMatch);
                break;
            case 5: // 1500 (entero simple)
                value = parseFloat(numberMatch);
                break;
            default:
                value = 0;
        }

        return { value, currency };
    }

    cleanOldConversations(daysOld = 30) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);

        let cleaned = 0;
        for (const [userId, conversation] of this.conversations.entries()) {
            const filteredConversation = conversation.filter(msg => {
                const msgDate = new Date(msg.timestamp);
                return msgDate > cutoffDate;
            });
            
            if (filteredConversation.length !== conversation.length) {
                this.conversations.set(userId, filteredConversation);
                cleaned += conversation.length - filteredConversation.length;
            }
        }

        if (cleaned > 0) {
            this.saveConversations();
        }

        return cleaned;
    }

    getStats() {
        const totalUsers = this.conversations.size;
        const totalMessages = Array.from(this.conversations.values()).reduce((total, conv) => total + conv.length, 0);
        
        return {
            totalUsers,
            totalMessages,
            averageMessagesPerUser: totalUsers > 0 ? totalMessages / totalUsers : 0
        };
    }

    getActiveUsersToday() {
        const today = format(new Date(), 'yyyy-MM-dd');
        const activeUsers = [];

        for (const [userId, conversation] of this.conversations.entries()) {
            const hasMessagesToday = conversation.some(msg => {
                const msgDate = format(new Date(msg.timestamp), 'yyyy-MM-dd');
                return msgDate === today;
            });

            if (hasMessagesToday) {
                activeUsers.push(userId);
            }
        }

        return activeUsers;
    }

    forceSync() {
        // Clear all debounce timeouts and save immediately
        this.saveDebounceTimeouts.forEach(timeout => clearTimeout(timeout));
        this.saveDebounceTimeouts.clear();
        
        this.saveConversations();
        this.saveUserProfiles();
    }
}

export default ConversationMemoryClient; 
import fs from 'fs';
import path from 'path';
import { format } from 'date-fns';

class ConversationMemory {
    constructor(maxContextMessages = 10) {
        this.maxContextMessages = maxContextMessages; // Cuántos mensajes mantener en contexto
        this.conversations = new Map(); // En memoria para acceso rápido
        this.dataDir = path.join(__dirname, '../../data');
        this.conversationsFile = path.join(this.dataDir, 'conversations.json');
        this.userProfilesFile = path.join(this.dataDir, 'user_profiles.json');
        
        // Debounce timers para evitar escrituras frecuentes
        this.saveConversationsTimer = null;
        this.saveProfilesTimer = null;
        this.saveDelay = 2000; // 2 segundos de retraso
        
        this.ensureDataDirectory();
        this.loadConversations();
        this.loadUserProfiles();
    }

    ensureDataDirectory() {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
    }

    loadConversations() {
        try {
            if (fs.existsSync(this.conversationsFile)) {
                const data = JSON.parse(fs.readFileSync(this.conversationsFile, 'utf8'));
                this.conversations = new Map(Object.entries(data));
            }
        } catch (error) {
            console.error('Error cargando conversaciones:', error);
            this.conversations = new Map();
        }
    }

    loadUserProfiles() {
        try {
            if (fs.existsSync(this.userProfilesFile)) {
                const data = JSON.parse(fs.readFileSync(this.userProfilesFile, 'utf8'));
                this.userProfiles = new Map(Object.entries(data));
            } else {
                this.userProfiles = new Map();
            }
        } catch (error) {
            console.error('Error cargando perfiles de usuario:', error);
            this.userProfiles = new Map();
        }
    }

    saveConversations() {
        try {
            const data = Object.fromEntries(this.conversations);
            fs.writeFileSync(this.conversationsFile, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('Error guardando conversaciones:', error);
        }
    }

    saveUserProfiles() {
        try {
            const data = Object.fromEntries(this.userProfiles);
            fs.writeFileSync(this.userProfilesFile, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('Error guardando perfiles:', error);
        }
    }

    // Versión con debounce para evitar escrituras frecuentes
    saveConversationsDebounced() {
        if (this.saveConversationsTimer) {
            clearTimeout(this.saveConversationsTimer);
        }
        
        this.saveConversationsTimer = setTimeout(() => {
            this.saveConversations();
            this.saveConversationsTimer = null;
        }, this.saveDelay);
    }

    saveUserProfilesDebounced() {
        if (this.saveProfilesTimer) {
            clearTimeout(this.saveProfilesTimer);
        }
        
        this.saveProfilesTimer = setTimeout(() => {
            this.saveUserProfiles();
            this.saveProfilesTimer = null;
        }, this.saveDelay);
    }

    addMessage(userId, userMessage, agentResponse) {
        if (!this.conversations.has(userId)) {
            this.conversations.set(userId, []);
        }

        const conversation = this.conversations.get(userId);
        const timestamp = new Date().toISOString();

        // Agregar el intercambio
        conversation.push({
            timestamp,
            user: userMessage,
            agent: agentResponse,
            formatted_time: format(new Date(), 'dd/MM/yyyy HH:mm')
        });

        // Mantener solo los últimos N mensajes para el contexto
        if (conversation.length > this.maxContextMessages * 2) { // *2 porque cada intercambio son 2 mensajes
            conversation.splice(0, conversation.length - (this.maxContextMessages * 2));
        }

        this.conversations.set(userId, conversation);
        this.saveConversationsDebounced(); // Usar versión con debounce
    }

    getConversationContext(userId) {
        const conversation = this.conversations.get(userId) || [];
        const userProfile = this.userProfiles.get(userId) || {};
        
        return {
            recent_messages: conversation.slice(-this.maxContextMessages),
            user_profile: userProfile,
            total_interactions: conversation.length,
            first_interaction: conversation.length > 0 ? conversation[0].timestamp : null,
            last_interaction: conversation.length > 0 ? conversation[conversation.length - 1].timestamp : null
        };
    }

    updateUserProfile(userId, profileData) {
        const existingProfile = this.userProfiles.get(userId) || {};
        const updatedProfile = { ...existingProfile, ...profileData };
        
        this.userProfiles.set(userId, updatedProfile);
        this.saveUserProfiles();
    }

    getUserProfile(userId) {
        return this.userProfiles.get(userId) || {};
    }

    // Método para extraer información financiera de las conversaciones
    extractFinancialData(userId) {
        const conversation = this.conversations.get(userId) || [];
        const financialData = {
            income: [],
            expenses: [],
            savings: [],
            goals: [],
            debts: []
        };

        // Buscar patrones en las conversaciones
        conversation.forEach(exchange => {
            const userMsg = exchange.user.toLowerCase();
            
            // Detectar menciones de ingresos
            if (userMsg.includes('ganè') || userMsg.includes('ingreso') || userMsg.includes('salario') || userMsg.includes('sueldo')) {
                const amount = this.extractAmount(userMsg);
                if (amount) {
                    financialData.income.push({
                        amount,
                        date: exchange.timestamp,
                        description: exchange.user
                    });
                }
            }

            // Detectar gastos
            if (userMsg.includes('gastè') || userMsg.includes('compré') || userMsg.includes('pagué') || userMsg.includes('costo')) {
                const amount = this.extractAmount(userMsg);
                if (amount) {
                    financialData.expenses.push({
                        amount,
                        date: exchange.timestamp,
                        description: exchange.user
                    });
                }
            }
        });

        return financialData;
    }

    extractAmount(text) {
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

        if (!numberMatch) return null;

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
                return null;
        }

        return value > 0 ? value : null;
    }

    // Limpiar conversaciones antiguas (opcional)
    cleanOldConversations(daysOld = 30) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);

        for (const [userId, conversation] of this.conversations.entries()) {
            const filteredConversation = conversation.filter(exchange => {
                const messageDate = new Date(exchange.timestamp);
                return messageDate > cutoffDate;
            });
            
            if (filteredConversation.length !== conversation.length) {
                this.conversations.set(userId, filteredConversation);
            }
        }
        this.saveConversations();
    }

    getStats() {
        return {
            total_users: this.conversations.size,
            total_conversations: Array.from(this.conversations.values()).reduce((sum, conv) => sum + conv.length, 0),
            active_users_today: this.getActiveUsersToday(),
            memory_usage: process.memoryUsage()
        };
    }

    getActiveUsersToday() {
        const today = new Date().toDateString();
        let activeUsers = 0;

        for (const conversation of this.conversations.values()) {
            if (conversation.length > 0) {
                const lastMessage = conversation[conversation.length - 1];
                const messageDate = new Date(lastMessage.timestamp).toDateString();
                if (messageDate === today) {
                    activeUsers++;
                }
            }
        }

        return activeUsers;
    }

    // Método para forzar el guardado inmediato (útil al cerrar la aplicación)
    forceSync() {
        if (this.saveConversationsTimer) {
            clearTimeout(this.saveConversationsTimer);
            this.saveConversationsTimer = null;
        }
        if (this.saveProfilesTimer) {
            clearTimeout(this.saveProfilesTimer);
            this.saveProfilesTimer = null;
        }
        
        this.saveConversations();
        this.saveUserProfiles();
        console.log('💾 Datos sincronizados forzosamente');
    }
}

export default ConversationMemory; 
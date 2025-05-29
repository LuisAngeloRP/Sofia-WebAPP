# 🤖 SofIA AI vs AI Simulator - Web App

Una aplicación web moderna con interfaz tipo WhatsApp que permite visualizar conversaciones AI vs AI automatizadas en tiempo real.

## 🌟 Características

### 💬 Interfaz WhatsApp
- Diseño moderno inspirado en WhatsApp
- Burbujas de mensajes diferenciadas por usuario/bot
- Tiempo real de conversación
- Scroll automático a nuevos mensajes

### 🤖 Simulación AI vs AI
- **Cliente IA**: Genera mensajes naturales con personalidades aleatorias
- **SofIA Bot**: Responde con IA financiera avanzada
- Conversaciones completamente automatizadas
- Detección automática de transacciones financieras

### 🎮 Controles Intuitivos
- ▶️ **Iniciar**: Comienza nueva conversación
- ⏸️ **Pausar**: Pausa la conversación actual
- ⏹️ **Detener**: Termina la conversación
- 🔄 **Reiniciar**: Reinicia con la misma personalidad
- 💬 **Nueva**: Genera nueva personalidad de cliente

### 📊 Panel de Estadísticas
- Información del cliente simulado
- Transacciones detectadas automáticamente
- Métricas de rendimiento en tiempo real
- Progreso visual de la conversación

## 🚀 Instalación y Configuración

### Prerequisitos
```bash
# Node.js 18+ y npm
node --version  # v18.0.0+
npm --version   # 9.0.0+
```

### 1. Instalación
```bash
# Desde el directorio SofIA-Prototype
cd webapp
npm install
```

### 2. Configuración API Key
Necesitas una API key de Perplexity para que funcione la IA:

1. Ve a [https://perplexity.ai](https://perplexity.ai)
2. Crea una cuenta
3. Obtén tu API key
4. **Opción A - Variable de entorno:**
   ```bash
   echo "NEXT_PUBLIC_PERPLEXITY_API_KEY=tu_api_key_aqui" > .env.local
   ```
5. **Opción B - Interfaz web:**
   - La aplicación te pedirá la API key en la primera ejecución
   - Se guarda automáticamente en localStorage

### 3. Ejecutar Aplicación
```bash
# Desarrollo
npm run dev

# O producción
npm run build
npm start
```

La aplicación estará disponible en: [http://localhost:3000](http://localhost:3000)

## 🎯 Cómo Usar

### Inicio Rápido
1. **Configurar API Key** (primera vez)
2. **Presionar "Iniciar"** para comenzar simulación
3. **Observar conversación** en tiempo real
4. **Ver estadísticas** en panel lateral

### Controles Avanzados
- **Pausar/Reanudar**: Control total sobre el flujo
- **Nueva conversación**: Cambia personalidad del cliente
- **Reiniciar**: Misma personalidad, conversación nueva

### Panel de Cliente
Cada simulación genera un cliente único:
- **Nombre**: Aleatorio (María, Carlos, Ana, etc.)
- **Edad**: 25-55 años
- **Profesión**: Variada (ingeniero, médico, etc.)
- **Personalidad**: Cauteloso, impulsivo, organizado, etc.
- **Situación**: Objetivos financieros específicos

### Estadísticas en Tiempo Real
- ✅ Nombre detectado automáticamente
- 📈 Ingresos procesados por IA
- 📉 Gastos categorizados automáticamente
- 💱 Lista de transacciones detectadas

## 🔧 Arquitectura Técnica

### Frontend
- **Next.js 15** con App Router
- **TypeScript** para type safety
- **Tailwind CSS** para styling
- **Lucide React** para iconos

### Backend Integration
- **Perplexity Sonar API** para IA generativa
- **Clases adaptadas** del backend SofIA
- **Event-driven** para actualizaciones en tiempo real

### Estructura de Archivos
```
webapp/
├── app/
│   ├── page.tsx              # Componente principal
│   ├── layout.tsx            # Layout base
│   └── globals.css           # Estilos globales
├── lib/
│   ├── ai-simulator.ts       # Simulador AI vs AI
│   ├── types/
│   │   └── chat.ts          # Tipos TypeScript
│   ├── agent/               # FinanceAgent adaptado
│   ├── memory/              # Sistema de memoria
│   └── services/            # Servicios IA
└── public/                  # Assets estáticos
```

## 🧠 IA y Personalidades

### Cliente IA Generativo
```typescript
// Personalidad generada aleatoriamente
{
  name: "María",
  age: 32,
  profession: "diseñadora gráfica", 
  personality: "cautelosa con el dinero",
  financialSituation: "quiere empezar a ahorrar"
}
```

### Plan de Conversación
1. **Saludo** - Presentación natural
2. **Ingresos** - Reporta ganancias recientes
3. **Gastos** - Menciona gastos específicos
4. **Pregunta** - Consulta financiera
5. **Metas** - Establece objetivos
6. **Consejos** - Pide recomendaciones
7. **Seguimiento** - Profundiza temas
8. **Despedida** - Cierre natural

### SofIA Bot
- **IA Avanzada**: Powered by Perplexity Sonar
- **Detección automática**: Ingresos, gastos, nombres
- **Memoria contextual**: Mantiene historial
- **Respuestas empáticas**: Tono natural y profesional

## 🛠️ Desarrollo

### Scripts Disponibles
```bash
npm run dev          # Desarrollo con hot reload
npm run build        # Build de producción
npm run start        # Servidor de producción
npm run lint         # Linter ESLint
```

### Personalización
1. **Modificar personalidades** en `lib/ai-simulator.ts`
2. **Ajustar UI** en `app/page.tsx`
3. **Cambiar prompts** en métodos de simulador
4. **Adaptar estilos** en Tailwind classes

### Debugging
```bash
# Habilitar logs detallados
console.log('Debug info:', message);

# Monitor network en DevTools
# Inspeccionar llamadas a Perplexity API
```

## 🔐 Seguridad

### API Keys
- ✅ Nunca commits keys en código
- ✅ Usa variables de entorno
- ✅ localStorage para persistencia local
- ⚠️ `dangerouslyAllowBrowser: true` solo para demo

### Producción
Para producción real:
1. Usar API routes de Next.js
2. Proxy requests through backend
3. Validar requests server-side
4. Rate limiting

## 🎨 Customización UI

### Colores del Tema
```css
/* Verde WhatsApp */
--green-primary: #075e54;
--green-secondary: #128c7e;
--green-light: #25d366;

/* Grises */
--gray-background: #f8f9fa;
--gray-chat: #e5ddd5;
```

### Responsive Design
- 📱 **Mobile**: Stack vertical
- 💻 **Desktop**: Layout horizontal con sidebar
- 📊 **Stats panel**: Colapsible en móvil

## 🚨 Solución de Problemas

### Error: API Key inválida
```
✅ Verificar key en Perplexity Dashboard
✅ Confirmar formato correcto
✅ Revisar límites de uso
```

### Error: Conversación no inicia
```
✅ Comprobar conexión internet
✅ Verificar consola del navegador
✅ Confirmar API key configurada
```

### Error: Mensajes no aparecen
```
✅ Revisar estado del simulador
✅ Verificar callbacks configurados
✅ Comprobar logs de red
```

### Performance Issues
```
✅ Limitar historial de mensajes
✅ Optimizar re-renders con React.memo
✅ Usar lazy loading para componentes
```

## 📈 Métricas y Analytics

### KPIs Monitoreados
- ✅ Conversaciones completadas
- ✅ Transacciones detectadas
- ✅ Tiempo promedio de conversación
- ✅ Tasa de éxito de IA

### Datos Capturados
```typescript
interface ConversationMetrics {
  duration: number;
  messagesCount: number;
  transactionsDetected: number;
  personalityType: string;
  completionRate: number;
}
```

## 🔮 Roadmap

### Próximas Características
- [ ] **Múltiples conversaciones** simultáneas
- [ ] **Exportar conversaciones** (JSON, PDF)
- [ ] **Configuración avanzada** de personalidades
- [ ] **Modo batch** para testing masivo
- [ ] **Analytics dashboard** detallado
- [ ] **Integración WhatsApp Business** real

### Mejoras Técnicas
- [ ] **Server-side rendering** completo
- [ ] **Database persistence** de conversaciones
- [ ] **Real-time collaboration** entre usuarios
- [ ] **API REST** para integración externa

## 📞 Soporte

### Documentación
- [SofIA Main Docs](../docs/)
- [AI vs AI Test Guide](../docs/AI-VS-AI-TEST.md)
- [Backend Setup](../setup.md)

### Issues Comunes
1. **Configuración API**: Revisar variables de entorno
2. **Build errors**: Verificar dependencias
3. **Runtime errors**: Comprobar browser console

---

**🎯 Esta webapp demuestra el poder de SofIA con conversaciones AI vs AI completamente automatizadas en una interfaz moderna y intuitiva.**

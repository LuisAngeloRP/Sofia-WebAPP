#!/bin/bash

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║          🤖 SofIA AI vs AI Simulator - Web App           ║"
echo "║            Iniciando aplicación en modo desarrollo       ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Verificar si Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js no está instalado"
    echo "💡 Instala Node.js desde: https://nodejs.org/"
    exit 1
fi

# Verificar versión de Node.js
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "⚠️  Advertencia: Se recomienda Node.js 18+, tienes $(node -v)"
fi

# Verificar si hay dependencias instaladas
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependencias..."
    npm install
    echo "✅ Dependencias instaladas"
    echo ""
fi

# Verificar API key
if [ ! -f ".env.local" ]; then
    echo "⚙️  Configuración inicial:"
    echo "   - La aplicación te pedirá tu API key de Perplexity"
    echo "   - Se guardará automáticamente para futuras sesiones"
    echo ""
fi

echo "🚀 Iniciando servidor de desarrollo..."
echo "📱 La aplicación estará disponible en: http://localhost:3000"
echo ""
echo "🎮 Controles:"
echo "   ▶️  Iniciar - Comienza conversación AI vs AI"
echo "   ⏸️  Pausar - Pausa la conversación actual"
echo "   🔄 Reiniciar - Nueva conversación, misma personalidad"
echo "   💬 Nueva - Genera nueva personalidad de cliente"
echo ""
echo "Presiona Ctrl+C para detener el servidor"
echo "─────────────────────────────────────────────────────────────"

# Iniciar servidor de desarrollo
npm run dev 
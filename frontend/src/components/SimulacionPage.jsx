import { useState, useEffect } from 'react';
// import { io } from 'socket.io-client';

// Socket.IO deshabilitado para deploy simplificado
// const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3000');

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function SimulacionPage({ config }) {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);

  const DEMO_USER_ID = 'demo_simulator_001';

  // Polling para obtener nuevos mensajes cada 3 segundos
  useEffect(() => {
    const pollMessages = async () => {
      try {
        const response = await fetch(`${API_URL}/api/demo/conversation/${DEMO_USER_ID}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.messages) {
            // Actualizar mensajes si hay nuevos
            setMessages(data.messages);
            setIsTyping(data.isTyping || false);
          }
        }
      } catch (error) {
        // Silenciar errores de polling
      }
    };

    // Poll inicial
    pollMessages();

    // Polling cada 3 segundos
    const interval = setInterval(pollMessages, 3000);

    return () => clearInterval(interval);
  }, []);

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    const messageText = inputMessage;
    setInputMessage('');

    // Agregar mensaje del usuario inmediatamente
    setMessages(prev => [...prev, {
      type: 'user',
      text: messageText,
      timestamp: new Date()
    }]);

    setIsTyping(true);

    try {
      const response = await fetch(`${API_URL}/webhook/demo-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: DEMO_USER_ID,
          message: messageText,
          platform: 'demo'
        })
      });

      if (response.ok) {
        const data = await response.json();

        // Agregar respuesta del agente
        setMessages(prev => [...prev, {
          type: 'agent',
          text: data.response,
          timestamp: new Date()
        }]);

        // Si hay productos, agregarlos
        if (data.products && data.products.length > 0) {
          setMessages(prev => [...prev, {
            type: 'products',
            products: data.products,
            timestamp: new Date()
          }]);
        }
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex h-full bg-gray-50">
      {/* Chat Principal */}
      <div className="flex-1 flex flex-col max-w-4xl mx-auto bg-white shadow-xl">
        {/* Header estilo WhatsApp */}
        <div className="bg-gradient-to-r from-green-600 to-green-500 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-lg">
              J
            </div>
            <div>
              <p className="font-bold text-white">Jessica - Silver Line</p>
              <p className="text-xs text-green-100">Asesora de ventas • En línea</p>
            </div>
          </div>
          <button
            onClick={() => setShowPromptEditor(true)}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-semibold transition flex items-center gap-2"
          >
            <i className="fas fa-cog"></i>
            Editar Prompt
          </button>
        </div>

        {/* Explicación del demo */}
        <div className="bg-yellow-50 border-b border-yellow-200 p-4">
          <div className="flex items-start gap-3">
            <i className="fas fa-info-circle text-yellow-600 mt-1"></i>
            <div className="flex-1">
              <p className="text-sm font-semibold text-yellow-900 mb-1">
                💬 Simulador de Conversación
              </p>
              <p className="text-xs text-yellow-700">
                Así se verá la IA respondiendo en WhatsApp/Instagram de tu negocio.
                Probá consultando por productos, precios o delivery.
              </p>
            </div>
          </div>
        </div>

        {/* Mensajes */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#e5ddd5]">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-comments text-green-600 text-3xl"></i>
              </div>
              <p className="text-gray-600 font-semibold mb-2">Iniciá la conversación</p>
              <p className="text-sm text-gray-500">Ejemplo: "Hola, busco una pulsera de perla"</p>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={idx}>
              {msg.type === 'user' && (
                <div className="flex justify-end">
                  <div className="max-w-md">
                    <div className="bg-[#dcf8c6] px-4 py-2 rounded-lg shadow">
                      <p className="text-sm text-gray-900">{msg.text}</p>
                      <p className="text-xs text-gray-500 text-right mt-1">
                        {msg.timestamp.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {msg.type === 'agent' && (
                <div className="flex justify-start">
                  <div className="max-w-md">
                    <div className="bg-white px-4 py-2 rounded-lg shadow">
                      <p className="text-sm text-gray-900">{msg.text}</p>
                      <p className="text-xs text-gray-500 text-right mt-1">
                        {msg.timestamp.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {msg.type === 'products' && msg.products && (
                <div className="flex justify-start">
                  <div className="max-w-lg">
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                      {msg.products.map(product => (
                        <div key={product.id} className="border-b last:border-b-0 p-3 hover:bg-gray-50">
                          <div className="flex gap-3">
                            {product.image_urls?.[0] && (
                              <img
                                src={product.image_urls[0]}
                                alt={product.name}
                                className="w-20 h-20 object-cover rounded cursor-pointer hover:opacity-80 transition"
                                onClick={() => setLightboxImage(product.image_urls[0])}
                                title="Click para ver en tamaño completo"
                              />
                            )}
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900 text-sm">{product.name}</p>
                              <p className="text-xs text-gray-500 mb-1">{product.description}</p>
                              <p className="text-lg font-bold text-green-600">
                                {product.price.toLocaleString('es-PY')} {product.currency === 'USD' ? 'USD' : 'Gs'}
                              </p>
                              {product.stock_quantity > 0 && (
                                <p className="text-xs text-gray-500">Stock: {product.stock_quantity}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      <p className="text-xs text-gray-400 text-right p-2">
                        {msg.timestamp.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-white px-4 py-3 rounded-lg shadow">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input de mensajes */}
        <div className="bg-gray-100 p-4 border-t border-gray-200">
          <div className="flex gap-3">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Escribí tu mensaje..."
              className="flex-1 px-4 py-3 bg-white border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500"
              autoFocus
            />
            <button
              onClick={sendMessage}
              className="px-6 py-3 bg-green-600 text-white rounded-full font-semibold hover:bg-green-700 transition"
            >
              <i className="fas fa-paper-plane"></i>
            </button>
          </div>
        </div>
      </div>

      {/* Modal de edición de prompt (próximo paso) */}
      {showPromptEditor && (
        <PromptEditorModal
          onClose={() => setShowPromptEditor(false)}
          config={config}
        />
      )}

      {/* Lightbox para expandir imágenes */}
      {lightboxImage && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <button
            className="absolute top-4 right-4 text-white text-4xl hover:text-gray-300"
            onClick={() => setLightboxImage(null)}
          >
            ×
          </button>
          <img
            src={lightboxImage}
            alt="Producto expandido"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

// Componente placeholder para el editor de prompt
function PromptEditorModal({ onClose, config }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Editor de Prompt del Agente</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <p className="text-gray-600 mb-4">Próximamente: Editor completo de prompt en tiempo real</p>
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-500">
              Aquí podrás editar el comportamiento de Jessica, su tono, flujo de conversación y reglas.
            </p>
          </div>
        </div>
        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

export default SimulacionPage;

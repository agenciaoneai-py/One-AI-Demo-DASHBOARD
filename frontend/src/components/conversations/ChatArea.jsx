import { useState, useEffect, useRef, useCallback } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const PLATFORM_CONFIG = {
  instagram: { name: 'Instagram', icon: 'fab fa-instagram', hexColor: '#E1306C', gradient: 'from-pink-400 to-pink-600', messageGradient: 'from-purple-500 to-pink-500' },
  whatsapp:  { name: 'WhatsApp',  icon: 'fab fa-whatsapp',  hexColor: '#25D366', gradient: 'from-green-400 to-green-600', messageGradient: 'from-emerald-500 to-green-500' },
  facebook:  { name: 'Facebook',  icon: 'fab fa-facebook-messenger', hexColor: '#1877F2', gradient: 'from-blue-400 to-blue-600', messageGradient: 'from-blue-500 to-indigo-500' },
};

function getInitials(name) {
  if (!name) return '??';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' });
}

function formatDateLabel(iso) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Hoy';
  if (d.toDateString() === yesterday.toDateString()) return 'Ayer';
  return d.toLocaleDateString('es-PY', { day: 'numeric', month: 'long' });
}

export default function ChatArea({ conversation, platform, onBack, onTogglePanel, onUpdate, isMobile }) {
  const [messageInput, setMessageInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);

  const pCfg = PLATFORM_CONFIG[platform] || PLATFORM_CONFIG.instagram;
  const contact = conversation.contact || {};
  const name = contact.name || 'Sin nombre';
  const initials = getInitials(name);
  const isAiOn = conversation.ai_mode === 'automatic';
  const messages = conversation.messages || [];

  // Empty state
  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#f8f9fa]">
        <div className="text-center px-4">
          <div className="text-6xl mb-4">💬</div>
          <h2 className="text-xl lg:text-2xl font-semibold text-slate-800 mb-2">Selecciona una conversación</h2>
          <p className="text-sm lg:text-base text-slate-600">Elige una conversación de la lista para comenzar</p>
        </div>
      </div>
    );
  }

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, isTyping, scrollToBottom]);

  // Track scroll position for FAB
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 150);
  };

  const toggleAI = async () => {
    const newMode = isAiOn ? 'manual' : 'automatic';
    onUpdate(conversation.id, { ai_mode: newMode });
    try {
      await fetch(`${API_URL}/api/conversations/${conversation.id}/toggle-ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aiEnabled: newMode === 'automatic' })
      });
    } catch (e) { console.error(e); }
  };

  const sendMessage = async () => {
    const text = messageInput.trim();
    if (!text) return;

    const newMsg = {
      id: `msg_${Date.now()}`,
      text,
      sender: 'agent',
      timestamp: new Date().toISOString(),
      seen: true,
    };

    onUpdate(conversation.id, {
      messages: [...messages, newMsg],
      last_message: text,
      last_message_at: newMsg.timestamp,
      unread_count: 0,
    });
    setMessageInput('');

    // Simulate IA response after send
    setIsTyping(true);
    try {
      await fetch(`${API_URL}/api/conversations/${conversation.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, platform })
      });
    } catch (e) { console.error(e); }

    // Fake IA response after 2-3s
    await new Promise(r => setTimeout(r, 2000 + Math.random() * 1000));
    setIsTyping(false);

    const aiMsg = {
      id: `msg_${Date.now()}`,
      text: getAiResponse(text),
      sender: 'ai',
      timestamp: new Date().toISOString(),
      seen: false,
    };
    onUpdate(conversation.id, {
      messages: [...messages, newMsg, aiMsg],
      last_message: aiMsg.text,
      last_message_at: aiMsg.timestamp,
    });
  };

  // Group consecutive messages from same sender
  const groupedMessages = messages.map((msg, i) => ({
    ...msg,
    isFirstInGroup: i === 0 || messages[i - 1].sender !== msg.sender,
    showDate: i === 0 || new Date(msg.timestamp).toDateString() !== new Date(messages[i - 1].timestamp).toDateString(),
  }));

  return (
    <div className="flex-1 flex flex-col min-w-0 relative">
      {/* Header */}
      <header className="h-14 bg-white/80 backdrop-blur-sm border-b px-3 lg:px-5 flex items-center justify-between sticky top-0 z-20"
        style={{ borderBottomColor: pCfg.hexColor + '40' }}>
        <div className="flex items-center gap-3 min-w-0">
          {isMobile && onBack && (
            <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-lg transition-colors duration-200">
              <i className="fas fa-arrow-left text-xl text-slate-600" />
            </button>
          )}
          <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${pCfg.gradient} flex items-center justify-center text-xs font-semibold text-white flex-shrink-0`}>
            {initials}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold leading-none truncate">{name}</h3>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-400 mt-1">
              <span className="flex items-center gap-1">
                <i className={`${pCfg.icon} text-xs`} style={{ color: pCfg.hexColor }} /> {pCfg.name}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={toggleAI}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200 shadow-sm ${
              isAiOn
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
            }`}>
            <div className={`w-2 h-2 rounded-full animate-pulse ${isAiOn ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            <i className="fas fa-robot text-base" />
            IA {isAiOn ? 'ON' : 'OFF'}
          </button>

          {onTogglePanel && (
            <>
              <div className="w-px h-6 bg-slate-200 mx-1" />
              <button onClick={onTogglePanel}
                className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all duration-200 min-w-[44px] min-h-[44px] flex items-center justify-center">
                <i className={`fas ${isMobile ? 'fa-circle-info' : 'fa-angles-right'} text-xl`} />
              </button>
            </>
          )}
        </div>
      </header>

      {/* Messages area */}
      <div ref={scrollContainerRef} onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3 lg:px-5 py-4 bg-[#f8f9fa]">
        <div className="space-y-1">
          {groupedMessages.map((msg, idx) => (
            <div key={msg.id || idx}>
              {/* Date separator */}
              {msg.showDate && (
                <div className="flex items-center justify-center py-3">
                  <span className="bg-gray-200/60 text-gray-500 text-xs font-medium px-3 py-1 rounded-full">
                    {formatDateLabel(msg.timestamp)}
                  </span>
                </div>
              )}

              {msg.sender === 'user' ? (
                /* User message (left) */
                <div className="flex items-end gap-2 lg:gap-3 max-w-[85%] lg:max-w-[75%] mb-1">
                  {msg.isFirstInGroup ? (
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${pCfg.gradient} flex-shrink-0 flex items-center justify-center font-bold text-xs text-white shadow-md`}>
                      {initials}
                    </div>
                  ) : (
                    <div className="w-8 h-8 flex-shrink-0" />
                  )}
                  <div className="px-4 py-2.5 rounded-2xl bg-gray-100 text-slate-800 rounded-bl-sm">
                    <p className="text-sm leading-relaxed">{msg.text}</p>
                    <div className="flex items-center gap-1 mt-1 justify-end text-gray-400">
                      <span className="text-[10px]">{formatTime(msg.timestamp)}</span>
                      <i className="fas fa-check-double text-[10px] text-indigo-400/70" />
                    </div>
                  </div>
                </div>
              ) : (
                /* Agent/AI message (right) */
                <div className="flex items-end gap-2 lg:gap-3 max-w-[85%] lg:max-w-[75%] ml-auto flex-row-reverse mb-1">
                  <div className="flex flex-col gap-0.5">
                    {msg.isFirstInGroup && (
                      <span className="text-xs font-medium px-1 text-right text-slate-400">
                        {msg.sender === 'agent' ? '👤 Operador' : '🤖 Agente IA'}
                      </span>
                    )}
                    <div className={`px-4 py-2.5 rounded-2xl bg-gradient-to-r ${pCfg.messageGradient} text-white rounded-br-sm shadow-sm`}>
                      {msg.image && (
                        <img src={msg.image} alt="Producto" loading="lazy"
                          style={{ width: '200px', height: '140px', objectFit: 'cover', borderRadius: '6px', display: 'block', marginBottom: '6px' }} />
                      )}
                      <p className="text-sm leading-relaxed">{msg.text}</p>
                      <div className="flex items-center gap-1 mt-1 justify-end text-white/50">
                        <span className="text-[10px]">{msg.sender === 'ai' ? 'IA • ' : ''}{formatTime(msg.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex justify-start mb-4 px-1">
              <div className="flex items-end gap-2 max-w-[70%]">
                <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${pCfg.gradient} flex items-center justify-center text-xs font-bold text-white flex-shrink-0`}>
                  <i className="fas fa-robot text-[10px]" />
                </div>
                <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '-0.3s' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '-0.15s' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Scroll-to-bottom FAB */}
      {showScrollBtn && (
        <div className="absolute bottom-20 right-4 lg:right-6 z-10">
          <button onClick={scrollToBottom}
            className="w-9 h-9 rounded-full bg-white shadow-md border border-gray-200 flex items-center justify-center text-slate-600 hover:bg-gray-50 transition-all duration-200">
            <i className="fas fa-chevron-down text-sm" />
          </button>
        </div>
      )}

      {/* AI paused banner */}
      {conversation.aiPaused && conversation.pauseReason && (
        <div className="bg-amber-50 border-t border-amber-200 px-4 py-2.5 flex items-center gap-3">
          <i className="fas fa-pause-circle text-amber-500" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-amber-800">IA pausada</p>
            <p className="text-xs text-amber-600 truncate">{conversation.pauseReason}</p>
          </div>
          <button onClick={toggleAI} className="px-3 py-1.5 bg-emerald-500 text-white text-xs font-semibold rounded-lg hover:bg-emerald-600 transition-colors flex-shrink-0">
            Reanudar IA
          </button>
        </div>
      )}

      {/* Input area */}
      <div className="bg-white border-t border-gray-100 px-3 lg:px-5 py-3">
        {isAiOn ? (
          /* IA ON - disabled input */
          <div className="relative flex items-center gap-3 bg-gray-50 rounded-full px-4 py-2.5">
            <div className="flex-1 text-sm text-gray-400 italic cursor-not-allowed">
              La IA está respondiendo automáticamente
            </div>
            <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-400 flex items-center justify-center cursor-not-allowed">
              <i className="fas fa-paper-plane text-sm" />
            </div>
          </div>
        ) : (
          /* Manual mode */
          <div className="space-y-3 bg-red-50 border border-red-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              <p className="text-xs font-bold text-red-700">Conversación pausada - Modo manual activado</p>
            </div>
            <textarea
              value={messageInput}
              onChange={e => setMessageInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              rows={3}
              maxLength={1000}
              placeholder="Escribe tu mensaje manual... (Enter envía, Shift+Enter nueva línea)"
              className="w-full px-4 py-3 border border-red-200 bg-white rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-500/30 transition-all"
            />
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <span className="text-xs font-semibold text-slate-500">{messageInput.length}/1000 caracteres</span>
              </div>
              <button onClick={sendMessage} disabled={!messageInput.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl font-bold text-xs hover:bg-red-700 disabled:bg-slate-300 transition-all duration-200 shadow-md">
                <i className="fas fa-paper-plane text-base" />
                Enviar manual
              </button>
            </div>
            <p className="text-xs text-red-600">💡 El mensaje se enviará al cliente. Reanuda la IA cuando termines.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Simple fake AI response for demo
function getAiResponse(userMsg) {
  const responses = [
    '¡Gracias por tu mensaje! Déjame verificar la disponibilidad.',
    'Con gusto te ayudo. ¿Querés que te envíe fotos del producto?',
    '¡Excelente elección! Ese es uno de nuestros productos más populares.',
    'Te confirmo que tenemos stock disponible. ¿Te interesa hacer el pedido?',
    'El envío a tu zona tiene un costo adicional. ¿Querés que te pase los detalles?',
    '¡Perfecto! Te paso las opciones que tenemos disponibles.',
    'Sí, aceptamos transferencia, tarjeta y pago contra entrega.',
    'Te envío las fotos por acá. ¿Alguna otra consulta?',
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}

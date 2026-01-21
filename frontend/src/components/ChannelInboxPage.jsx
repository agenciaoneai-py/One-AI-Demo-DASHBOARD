import { useState, useEffect } from 'react';

function ChannelInboxPage({ channel }) {
  const [conversations, setConversations] = useState([]);
  const [selectedConv, setSelectedConv] = useState(null);
  const [filter, setFilter] = useState('all'); // all, unread, assigned, unassigned
  const [searchQuery, setSearchQuery] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(true);

  // Formatear timestamp relativo
  const formatRelativeTime = (timestamp) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'Ahora';
    if (diffInSeconds < 3600) return `Hace ${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `Hace ${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 604800) return `Hace ${Math.floor(diffInSeconds / 86400)}d`;

    return date.toLocaleDateString('es-PY');
  };

  // Formatear timestamp absoluto
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' });
  };

  // Cargar conversaciones cuando cambia el canal
  useEffect(() => {
    fetchConversations();
  }, [channel]);

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${API_URL}/api/conversations/${channel}`);
      const result = await response.json();

      if (result.success) {
        setConversations(result.data);
        if (result.data.length > 0) {
          setSelectedConv(result.data[0]);
        }
      }
    } catch (error) {
      console.error('Error cargando conversaciones:', error);
    } finally {
      setLoading(false);
    }
  };

  // Toggle AI habilitada/deshabilitada (hand-off)
  const toggleAI = async () => {
    if (!selectedConv) return;

    const newAiState = !selectedConv.aiEnabled;

    const updatedConv = {
      ...selectedConv,
      aiEnabled: newAiState
    };

    // Actualizar inmediatamente en el UI
    setSelectedConv(updatedConv);
    setConversations(prev =>
      prev.map(c => c.id === selectedConv.id ? updatedConv : c)
    );

    // Llamar al backend (opcional, para logging)
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      await fetch(`${API_URL}/api/conversations/${selectedConv.id}/toggle-ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aiEnabled: newAiState })
      });
    } catch (error) {
      console.error('Error toggling AI:', error);
    }
  };

  // Asignar conversación a agente humano
  const assignToAgent = () => {
    if (!selectedConv) return;

    const updatedConv = {
      ...selectedConv,
      assignedTo: selectedConv.assignedTo ? null : 'agent_001',
      aiEnabled: false // Al asignar, desactivar IA
    };

    setSelectedConv(updatedConv);
    setConversations(prev =>
      prev.map(c => c.id === selectedConv.id ? updatedConv : c)
    );
  };

  // Calificar lead
  const qualifyLead = () => {
    if (!selectedConv) return;

    const updatedConv = {
      ...selectedConv,
      status: selectedConv.status === 'calificado' ? 'en_progreso' : 'calificado'
    };

    setSelectedConv(updatedConv);
    setConversations(prev =>
      prev.map(c => c.id === selectedConv.id ? updatedConv : c)
    );
  };

  const sendMessage = () => {
    if (!messageInput.trim() || !selectedConv) return;

    // Simulación de envío (fake)
    const newMessage = {
      id: `msg_${Date.now()}`,
      text: messageInput,
      sender: 'agent',
      timestamp: new Date().toISOString(),
      seen: true
    };

    const updatedConv = {
      ...selectedConv,
      messages: [...selectedConv.messages, newMessage],
      lastMessage: {
        text: messageInput,
        timestamp: newMessage.timestamp,
        sender: 'agent'
      },
      unreadCount: 0
    };

    setSelectedConv(updatedConv);
    setConversations(prev =>
      prev.map(c => c.id === selectedConv.id ? updatedConv : c)
    );

    setMessageInput('');
  };

  const filteredConversations = conversations.filter(conv => {
    // Aplicar filtro de búsqueda
    const fullName = `${conv.contact.first_name} ${conv.contact.last_name}`.toLowerCase();
    if (searchQuery && !fullName.includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Aplicar filtros de estado
    if (filter === 'unread' && conv.unreadCount === 0) return false;
    if (filter === 'assigned' && !conv.assignedTo) return false;
    if (filter === 'unassigned' && conv.assignedTo) return false;

    return true;
  });


  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando conversaciones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-gray-50">
      {/* A) COLUMNA IZQUIERDA - LISTA DE CONVERSACIONES */}
      <div className="w-[30%] bg-white h-screen overflow-y-auto border-r border-gray-200">
        {/* Header con filtros y buscador */}
        <div className="p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 capitalize">{channel}</h2>
            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full font-semibold">
              {conversations.length} conversaciones
            </span>
          </div>

          {/* Filtros */}
          <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                filter === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                filter === 'unread'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              No leídos
            </button>
            <button
              onClick={() => setFilter('assigned')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                filter === 'assigned'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Asignados
            </button>
            <button
              onClick={() => setFilter('unassigned')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                filter === 'unassigned'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Sin asignar
            </button>
          </div>

          {/* Buscador */}
          <div className="relative">
            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar contacto..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Lista de conversaciones */}
        <div>
          {filteredConversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => setSelectedConv(conv)}
              className={`w-full px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition-all duration-200 border-l-4 ${
                selectedConv?.id === conv.id
                  ? 'bg-indigo-50 border-indigo-600'
                  : 'border-transparent hover:border-gray-300'
              }`}
            >
              {/* Avatar con iniciales y color único */}
              <div className="relative flex-shrink-0">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shadow-sm"
                  style={{
                    backgroundColor: conv.contact.color.bg,
                    color: conv.contact.color.text
                  }}
                >
                  {conv.contact.first_name?.charAt(0)}{conv.contact.last_name?.charAt(0)}
                </div>

                {/* Badge del canal */}
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-md border-2 border-white">
                  {conv.platform === 'instagram' && (
                    <i className="fab fa-instagram text-pink-500 text-sm"></i>
                  )}
                  {conv.platform === 'whatsapp' && (
                    <i className="fab fa-whatsapp text-green-500 text-sm"></i>
                  )}
                  {conv.platform === 'facebook' && (
                    <i className="fab fa-facebook text-blue-600 text-sm"></i>
                  )}
                </div>

                {/* Indicador de IA habilitada */}
                {conv.aiEnabled && (
                  <div className="absolute -top-1 -left-1 w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center shadow-md">
                    <i className="fas fa-robot text-white text-xs"></i>
                  </div>
                )}
              </div>

              {/* Contenido */}
              <div className="flex-1 min-w-0 text-left">
                {/* Nombre + Badges */}
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-gray-900 truncate">
                    {conv.contact.first_name} {conv.contact.last_name}
                  </p>

                  {/* Badge de temperatura */}
                  {conv.contact.temperature === 'hot' && (
                    <span className="text-xs">🔥</span>
                  )}
                  {conv.contact.temperature === 'warm' && (
                    <span className="text-xs">⚠️</span>
                  )}

                  {/* Badge de no leído */}
                  {conv.unreadCount > 0 && (
                    <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                      {conv.unreadCount}
                    </span>
                  )}
                </div>

                {/* ID o Teléfono */}
                <p className="text-xs text-gray-500 truncate mb-1">
                  {conv.platform === 'whatsapp' && conv.contact.whatsapp_phone}
                  {conv.platform === 'instagram' && `ID: ${conv.contact.instagram_id?.toString().slice(-8)}`}
                  {conv.platform === 'facebook' && `ID: ${conv.contact.subscriber_id?.toString().slice(-6)}`}
                </p>

                {/* Preview del último mensaje */}
                <p className="text-sm text-gray-600 truncate">
                  {conv.lastMessage.text}
                </p>
              </div>

              {/* Timestamp */}
              <div className="flex-shrink-0 text-right">
                <p className="text-xs text-gray-500">
                  {formatRelativeTime(conv.lastMessage.timestamp)}
                </p>
              </div>
            </button>
          ))}

          {filteredConversations.length === 0 && (
            <div className="text-center py-12">
              <i className="fas fa-inbox text-4xl text-gray-300 mb-3"></i>
              <p className="text-sm text-gray-500">No hay conversaciones</p>
            </div>
          )}
        </div>
      </div>

      {/* B) COLUMNA CENTRAL - ÁREA DE CHAT */}
      <div className="w-[45%] bg-gray-50 flex flex-col">
        {selectedConv ? (
          <>
            {/* Header del chat mejorado */}
            <div className="bg-white p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Avatar con iniciales */}
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold shadow-md"
                  style={{
                    backgroundColor: selectedConv.contact.color.bg,
                    color: selectedConv.contact.color.text
                  }}
                >
                  {selectedConv.contact.first_name?.charAt(0)}{selectedConv.contact.last_name?.charAt(0)}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900">
                      {selectedConv.contact.first_name} {selectedConv.contact.last_name}
                    </p>

                    {/* Badge del canal */}
                    {selectedConv.platform === 'instagram' && (
                      <i className="fab fa-instagram text-pink-500"></i>
                    )}
                    {selectedConv.platform === 'whatsapp' && (
                      <i className="fab fa-whatsapp text-green-500"></i>
                    )}
                    {selectedConv.platform === 'facebook' && (
                      <i className="fab fa-facebook text-blue-600"></i>
                    )}
                  </div>

                  {/* Info secundaria */}
                  <p className="text-xs text-gray-500">
                    {selectedConv.platform === 'whatsapp' && selectedConv.contact.whatsapp_phone}
                    {selectedConv.platform === 'instagram' && `Instagram • ID: ${selectedConv.contact.instagram_id?.toString().slice(-8)}`}
                    {selectedConv.platform === 'facebook' && `Messenger`}
                    {' • '}
                    Última interacción: {formatRelativeTime(selectedConv.contact.last_interaction_at)}
                  </p>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex items-center gap-2">
                {/* Toggle IA */}
                <button
                  onClick={toggleAI}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 ${
                    selectedConv.aiEnabled
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md hover:shadow-lg'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {selectedConv.aiEnabled ? (
                    <>
                      <i className="fas fa-robot mr-2"></i>
                      IA ON
                    </>
                  ) : (
                    <>
                      <i className="fas fa-user mr-2"></i>
                      IA OFF
                    </>
                  )}
                </button>

                {/* Asignar */}
                <button
                  onClick={assignToAgent}
                  className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition text-sm font-semibold"
                >
                  <i className="fas fa-user-plus mr-2"></i>
                  Asignar
                </button>

                {/* Calificar */}
                <button
                  onClick={qualifyLead}
                  className="px-4 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition text-sm font-semibold"
                >
                  <i className="fas fa-check-circle mr-2"></i>
                  Calificar
                </button>

                {/* Ver en CRM */}
                {selectedConv.status === 'calificado' && (
                  <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-semibold">
                    Ver en CRM
                  </button>
                )}
              </div>
            </div>

            {/* Alert cuando IA está pausada */}
            {!selectedConv.aiEnabled && (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <i className="fas fa-exclamation-triangle text-yellow-400"></i>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      <strong>Modo Manual Activado</strong> - La IA está pausada. Los mensajes deben ser respondidos manualmente.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Área de mensajes mejorada */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-gray-50 to-white">
              {selectedConv.messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.sender === 'user' ? 'justify-start' : 'justify-end'} animate-fadeIn`}
                >
                  {msg.sender === 'user' ? (
                    // Mensaje del usuario
                    <div className="flex items-start gap-2 max-w-md">
                      {/* Avatar pequeño con iniciales */}
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-sm"
                        style={{
                          backgroundColor: selectedConv.contact.color.bg,
                          color: selectedConv.contact.color.text
                        }}
                      >
                        {selectedConv.contact.first_name?.charAt(0)}{selectedConv.contact.last_name?.charAt(0)}
                      </div>

                      <div>
                        <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm border border-gray-100">
                          <p className="text-sm text-gray-900">{msg.text}</p>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 ml-2">
                          {formatTimestamp(msg.timestamp)}
                        </p>
                      </div>
                    </div>
                  ) : (
                    // Mensaje del agente/IA
                    <div className="max-w-md">
                      <div className={`px-4 py-3 rounded-2xl rounded-tr-sm shadow-md ${
                        msg.sender === 'ai'
                          ? 'bg-gradient-to-r from-indigo-600 to-purple-600'
                          : 'bg-gradient-to-r from-green-500 to-emerald-600'
                      } text-white`}>
                        <p className="text-sm">{msg.text}</p>

                        {/* Badge de IA */}
                        {msg.sender === 'ai' && (
                          <span className="inline-flex items-center gap-1 text-xs bg-white/20 px-2 py-0.5 rounded-full mt-2">
                            <i className="fas fa-robot"></i>
                            IA
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-1 mr-2 justify-end">
                        <p className="text-xs text-gray-500">
                          {formatTimestamp(msg.timestamp)}
                        </p>
                        {msg.seen && (
                          <i className="fas fa-check-double text-indigo-600 text-xs"></i>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Typing indicator (opcional) */}
              {selectedConv.contact.typing && (
                <div className="flex justify-start">
                  <div className="bg-white px-4 py-3 rounded-2xl shadow-sm">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input de mensajes mejorado */}
            <div className="bg-white p-4 border-t border-gray-200">
              <div className="flex items-end gap-3">
                {/* Botones laterales */}
                <button className="text-gray-400 hover:text-gray-600 transition">
                  <i className="fas fa-smile text-xl"></i>
                </button>
                <button className="text-gray-400 hover:text-gray-600 transition">
                  <i className="fas fa-paperclip text-xl"></i>
                </button>

                {/* Textarea */}
                <div className="flex-1 relative">
                  <textarea
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder={selectedConv.aiEnabled ? "La IA responderá automáticamente..." : "Escribe un mensaje..."}
                    disabled={selectedConv.aiEnabled}
                    className="w-full px-4 py-3 border border-gray-300 rounded-2xl resize-none focus:outline-none focus:border-indigo-500 disabled:bg-gray-50 disabled:cursor-not-allowed text-sm"
                    rows="1"
                  />
                </div>

                {/* Botón enviar */}
                <button
                  onClick={sendMessage}
                  disabled={!messageInput.trim() || selectedConv.aiEnabled}
                  className="bg-indigo-600 text-white p-3 rounded-full hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <i className="fas fa-paper-plane"></i>
                </button>
              </div>

              {/* Hint cuando IA está activa */}
              {selectedConv.aiEnabled && (
                <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                  <i className="fas fa-robot"></i>
                  La IA está respondiendo automáticamente. Pausa la IA para responder manualmente.
                </p>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <i className="fas fa-comments text-6xl text-gray-300 mb-4"></i>
              <p>Selecciona una conversación</p>
            </div>
          </div>
        )}
      </div>

      {/* C) COLUMNA DERECHA - INFO DEL LEAD */}
      <div className="w-80 bg-white h-full border-l border-gray-200 overflow-y-auto">
        {selectedConv ? (
          <>
            {/* Header con avatar grande */}
            <div className="p-6 border-b border-gray-200 bg-gradient-to-br from-gray-50 to-white">
              <div className="flex flex-col items-center">
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold shadow-lg mb-3"
                  style={{
                    backgroundColor: selectedConv.contact.color.bg,
                    color: selectedConv.contact.color.text
                  }}
                >
                  {selectedConv.contact.first_name?.charAt(0)}{selectedConv.contact.last_name?.charAt(0)}
                </div>

                <h3 className="text-lg font-bold text-gray-900">
                  {selectedConv.contact.first_name} {selectedConv.contact.last_name}
                </h3>

                {/* ID de ManyChat */}
                <p className="text-xs text-gray-500 font-mono">
                  ID: {selectedConv.contact.subscriber_id}
                </p>
              </div>
            </div>

            {/* Datos de contacto */}
            <div className="p-6 border-b border-gray-200">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Información de Contacto
              </h4>

              <div className="space-y-3">
                {/* Plataforma */}
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                    {selectedConv.platform === 'instagram' && (
                      <i className="fab fa-instagram text-pink-500"></i>
                    )}
                    {selectedConv.platform === 'whatsapp' && (
                      <i className="fab fa-whatsapp text-green-500"></i>
                    )}
                    {selectedConv.platform === 'facebook' && (
                      <i className="fab fa-facebook text-blue-600"></i>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500">Plataforma</p>
                    <p className="text-sm font-medium text-gray-900 capitalize">
                      {selectedConv.platform}
                    </p>
                  </div>
                </div>

                {/* WhatsApp Phone */}
                {selectedConv.contact.whatsapp_phone && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                      <i className="fas fa-phone text-green-600"></i>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500">WhatsApp</p>
                      <p className="text-sm font-medium text-gray-900">
                        {selectedConv.contact.whatsapp_phone}
                      </p>
                    </div>
                  </div>
                )}

                {/* Instagram ID */}
                {selectedConv.contact.instagram_id && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-pink-50 flex items-center justify-center">
                      <i className="fab fa-instagram text-pink-500"></i>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500">Instagram ID</p>
                      <p className="text-sm font-medium text-gray-900 font-mono">
                        {selectedConv.contact.instagram_id}
                      </p>
                    </div>
                  </div>
                )}

                {/* Email */}
                {selectedConv.contact.email && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                      <i className="fas fa-envelope text-blue-600"></i>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500">Email</p>
                      <p className="text-sm font-medium text-gray-900">
                        {selectedConv.contact.email}
                      </p>
                    </div>
                  </div>
                )}

                {/* Última interacción */}
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                    <i className="fas fa-clock text-gray-600"></i>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500">Última interacción</p>
                    <p className="text-sm font-medium text-gray-900">
                      {formatRelativeTime(selectedConv.contact.last_interaction_at)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Lead Score */}
            <div className="p-6 border-b border-gray-200">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Lead Score
              </h4>

              <div className="text-center">
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-indigo-50 to-purple-50 mb-3">
                  <p className="text-4xl font-bold text-indigo-600">
                    {selectedConv.contact.leadScore}
                  </p>
                </div>

                <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                  <div
                    className={`h-3 rounded-full transition-all duration-500 ${
                      selectedConv.contact.temperature === 'hot' ? 'bg-gradient-to-r from-red-500 to-orange-500' :
                      selectedConv.contact.temperature === 'warm' ? 'bg-gradient-to-r from-yellow-500 to-orange-400' :
                      'bg-gradient-to-r from-blue-400 to-cyan-500'
                    }`}
                    style={{width: `${selectedConv.contact.leadScore}%`}}
                  ></div>
                </div>

                <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${
                  selectedConv.contact.temperature === 'hot' ? 'bg-red-100 text-red-700' :
                  selectedConv.contact.temperature === 'warm' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {selectedConv.contact.temperature === 'hot' && '🔥 CALIENTE'}
                  {selectedConv.contact.temperature === 'warm' && '⚠️ TIBIO'}
                  {selectedConv.contact.temperature === 'cold' && '❄️ FRÍO'}
                </span>
              </div>
            </div>

            {/* Custom Fields */}
            <div className="p-6 border-b border-gray-200">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Información (ManyChat)
              </h4>

              <div className="space-y-2">
                {Object.entries(selectedConv.contact.custom_fields).map(([key, value]) => (
                  <div key={key} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                    <span className="text-sm text-gray-600 capitalize">
                      {key.replace('_', ' ')}:
                    </span>
                    <span className="text-sm font-semibold text-gray-900 capitalize">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div className="p-6 border-b border-gray-200">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Tags
              </h4>

              <div className="flex flex-wrap gap-2">
                {selectedConv.contact.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-full border border-indigo-200"
                  >
                    {tag.replace('_', ' ')}
                  </span>
                ))}
              </div>
            </div>

            {/* Notas */}
            <div className="p-6">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Notas Internas
              </h4>

              <textarea
                placeholder="Agregar nota sobre este lead..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                rows="4"
              ></textarea>

              <button className="mt-3 w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-2 rounded-lg font-semibold hover:shadow-lg transition-all duration-200">
                <i className="fas fa-save mr-2"></i>
                Guardar Nota
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <i className="fas fa-user-circle text-6xl text-gray-300 mb-4"></i>
              <p className="text-sm">Selecciona una conversación</p>
            </div>
          </div>
        )}
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }

        .conversation-item {
          transition: all 0.2s ease;
        }

        .conversation-item:hover {
          transform: translateX(4px);
        }
      `}</style>
    </div>
  );
}

export default ChannelInboxPage;

import { useState, useEffect } from 'react';
import ConversationsList from './conversations/ConversationsList';
import ChatArea from './conversations/ChatArea';
import ContactPanel from './conversations/ContactPanel';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function useViewport() {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return { isMobile: width < 768, isTablet: width >= 768 && width < 1024 };
}

export default function ChannelInboxPage({ channel = 'instagram' }) {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [showContactPanel, setShowContactPanel] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { isMobile, isTablet } = useViewport();

  useEffect(() => {
    setIsLoading(true);
    setSelectedConversation(null);
    setShowContactPanel(false);
    fetch(`${API_URL}/api/conversations/${channel}`)
      .then(r => r.json())
      .then(data => {
        const list = data.conversations || data.data || [];
        setConversations(list);
        if (!isMobile && list.length > 0) setSelectedConversation(list[0]);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [channel]);

  const updateConversation = (convId, updates) => {
    setConversations(prev => prev.map(c => c.id === convId ? { ...c, ...updates } : c));
    if (selectedConversation?.id === convId) {
      setSelectedConversation(prev => prev ? { ...prev, ...updates } : prev);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] lg:h-screen overflow-hidden">
      <div className="flex flex-1 overflow-hidden bg-gray-50 relative">
        {/* List */}
        {(!isMobile || !selectedConversation) && (
          <ConversationsList
            conversations={conversations}
            selectedId={selectedConversation?.id}
            onSelect={setSelectedConversation}
            platform={channel}
            isLoading={isLoading}
          />
        )}

        {/* Chat */}
        {(!isMobile || (selectedConversation && !showContactPanel)) && selectedConversation && (
          <ChatArea
            conversation={selectedConversation}
            platform={channel}
            onBack={isMobile ? () => setSelectedConversation(null) : undefined}
            onTogglePanel={() => setShowContactPanel(!showContactPanel)}
            onUpdate={updateConversation}
            isMobile={isMobile}
          />
        )}

        {/* Empty state (desktop, no selection) */}
        {!isMobile && !selectedConversation && (
          <div className="flex-1 flex items-center justify-center bg-[#f8f9fa]">
            <div className="text-center px-4">
              <div className="text-6xl mb-4">💬</div>
              <h2 className="text-xl lg:text-2xl font-semibold text-slate-800 mb-2">Selecciona una conversación</h2>
              <p className="text-sm lg:text-base text-slate-600">Elige una conversación de la lista para comenzar</p>
            </div>
          </div>
        )}

        {/* Contact panel: desktop sidebar */}
        {!isMobile && !isTablet && showContactPanel && selectedConversation && (
          <ContactPanel conversation={selectedConversation} platform={channel} />
        )}

        {/* Contact panel: mobile overlay */}
        {isMobile && showContactPanel && selectedConversation && (
          <div className="absolute inset-0 z-30 bg-white overflow-y-auto">
            <div className="sticky top-0 z-10 h-12 bg-white border-b border-gray-200 flex items-center px-4 gap-3">
              <button onClick={() => setShowContactPanel(false)}
                className="p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors">
                <i className="fas fa-arrow-left text-gray-600" />
              </button>
              <span className="text-sm font-semibold text-gray-900">Info del contacto</span>
            </div>
            <ContactPanel conversation={selectedConversation} platform={channel} />
          </div>
        )}
      </div>
    </div>
  );
}

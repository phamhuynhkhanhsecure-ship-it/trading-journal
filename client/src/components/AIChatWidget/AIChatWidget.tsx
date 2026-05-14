import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { aiApi } from '../../services/api';
import './AIChatWidget.css';

// Using inline SVGs for icons to avoid extra dependencies
const ChatIcon = () => (
  <svg xmlns="http://www.开展w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
  </svg>
);

const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const SendIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"></line>
    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
  </svg>
);

interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export const AIChatWidget: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleToggle = () => {
    setIsOpen(!isOpen);
    // Add welcome message if chat history is empty
    if (!isOpen && messages.length === 0) {
      setMessages([
        {
          role: 'model',
          parts: [{ text: t('aiChat.welcome') }]
        }
      ]);
    }
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const newUserMessage: ChatMessage = {
      role: 'user',
      parts: [{ text: inputValue }]
    };

    const newMessages = [...messages, newUserMessage];
    setMessages(newMessages);
    setInputValue('');
    setIsLoading(true);

    try {
      // Filter out the initial welcome message from the client side because Gemini API requires the conversation to start with a 'user' role
      const apiMessages = newMessages.filter((msg, idx) => !(idx === 0 && msg.role === 'model'));
      const responseText = await aiApi.chat(apiMessages, i18n.language);
      
      setMessages([
        ...newMessages,
        {
          role: 'model',
          parts: [{ text: responseText }]
        }
      ]);
    } catch (error: any) {
      console.error('Chat error:', error);
      setMessages([
        ...newMessages,
        {
          role: 'model',
          parts: [{ text: `${t('aiChat.errorPrefix')} ${error.message || t('aiChat.defaultError')}` }]
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  // Convert markdown-ish text to simple HTML (just basic bold and line breaks for safety/simplicity without installing full markdown parser)
  const formatText = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br/>');
  };

  return (
    <div className={`ai-chat-widget ${isOpen ? 'open' : ''}`}>
      {/* Chat Button */}
      <button 
        className="chat-toggle-btn"
        onClick={handleToggle}
        aria-label="Toggle AI Chat"
      >
        {isOpen ? <CloseIcon /> : <ChatIcon />}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="chat-window">
          <div className="chat-header">
            <div className="chat-title">
              <span className="ai-dot"></span>
              {t('aiChat.title')}
            </div>
          </div>

          <div className="chat-messages">
            {messages.map((msg, index) => (
              <div key={index} className={`message-bubble ${msg.role}`}>
                <div 
                  className="message-content"
                  dangerouslySetInnerHTML={{ __html: formatText(msg.parts[0].text) }}
                />
              </div>
            ))}
            
            {isLoading && (
              <div className="message-bubble model">
                <div className="typing-indicator">
                  <span></span><span></span><span></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input-area">
            <input
              type="text"
              className="chat-input"
              placeholder={t('aiChat.placeholder')}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
            />
            <button 
              className="chat-send-btn" 
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading}
            >
              <SendIcon />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

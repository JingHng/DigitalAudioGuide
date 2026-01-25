import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import AdminLayout from './AdminLayout';
import { Sparkles, X, Plus, History, Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import '../css/AIAssistant.css';

const API_BASE = '/api/assistant';

interface Conversation {
  conversationId: string;
  title: string | null;
  statusId: number;
  createdAt: string;
  modifiedAt: string;
}

interface Message {
  messageId: string;
  conversationId: string;
  senderTypeId: number;
  senderType: string;
  content: string;
  createdAt: string;
}

interface ConversationWithMessages extends Conversation {
  messages: Message[];
}

const quickActions = [
  { emoji: '📊', label: "Today's Stats", text: "Show me today's statistics" },
  { emoji: '🎨', label: 'Popular Exhibits', text: "What are the most popular exhibits?" },
  { emoji: '🎧', label: 'Audio Engagement', text: "Show audio engagement metrics" },
  { emoji: '📝', label: 'Summarise Logs', text: "Summarize recent audit logs" },
];

export default function AssistantPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<ConversationWithMessages | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [maskedKey, setMaskedKey] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState(false);
  const [savingKey, setSavingKey] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning,';
    if (hour < 18) return 'Good Afternoon,';
    return 'Good Evening,';
  };

  useEffect(() => {
    fetchConversations();
    fetchApiKeyStatus();
    
    // Check if there's a conversationId in the URL query params
    const conversationId = searchParams.get('conversationId');
    if (conversationId) {
      loadConversation(conversationId);
      // Clear the query param after loading
      setSearchParams({});
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversations = async () => {
    try {
      setLoadingConversations(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE}/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setConversations(response.data.data.conversationList || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoadingConversations(false);
    }
  };

  const loadConversation = async (conversationId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE}/conversations/${conversationId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCurrentConversation(response.data.conversation);
      setMessages(response.data.conversation.messages || []);
      setSidebarOpen(false);
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  const startNewConversation = () => {
    setCurrentConversation(null);
    setMessages([]);
    setInputMessage('');
    setSidebarOpen(false);
    // Focus back on input
    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    const messageContent = inputMessage.trim();
    
    // Optimistic Update: Show the user message immediately
    const tempUserMsg: Message = {
        messageId: Date.now().toString(),
        conversationId: currentConversation?.conversationId || '',
        senderTypeId: 1,
        senderType: 'user',
        content: messageContent,
        createdAt: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMsg]);
    
    setInputMessage('');
    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_BASE}/chat`,
        {
          content: messageContent,
          conversationId: currentConversation?.conversationId || null
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.conversation) {
        setCurrentConversation(response.data.conversation);
        setMessages(response.data.conversation.messages || []);
        fetchConversations();
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert("Failed to send message. Please check your API key.");
    } finally {
      setIsLoading(false);
    }
  };

  const deleteConversation = async (conversationId: string) => {
    if(!confirm("Delete this conversation?")) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE}/conversations/${conversationId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchConversations();
      if (currentConversation?.conversationId === conversationId) {
        startNewConversation();
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  };

  const fetchApiKeyStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/settings/gemini-api-key', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setHasKey(response.data.data.hasKey);
      setMaskedKey(response.data.data.maskedKey);
    } catch (error) {
      console.error('Error fetching API key status:', error);
    }
  };

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) return;
    setSavingKey(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        '/api/settings/gemini-api-key',
        { apiKey: apiKey.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setHasKey(true);
      setMaskedKey(response.data.data.maskedKey);
      setApiKey('');
      setSettingsModalOpen(false);
      alert('API key saved successfully!');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to save API key');
    } finally {
      setSavingKey(false);
    }
  };

  const handleDeleteApiKey = async () => {
    if (!confirm('Are you sure you want to delete the API key?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete('/api/settings/gemini-api-key', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setHasKey(false);
      setMaskedKey(null);
      setApiKey('');
      alert('API key deleted successfully!');
    } catch (error) {
      alert('Failed to delete API key');
    }
  };

  // Content Formatter (Markdown Lite)
  const formatContent = (text: string) => {
    return text.split('\n').map((line, i) => {
      const parts = line.split(/(\*\*.*?\*\*|\*.*?\*)/g);
      return (
        <span key={i}>
          {parts.map((part, j) => {
            if (part.startsWith('**') && part.endsWith('**')) return <strong key={j}>{part.slice(2, -2)}</strong>;
            if (part.startsWith('*') && part.endsWith('*')) return <em key={j}>{part.slice(1, -1)}</em>;
            return <span key={j}>{part}</span>;
          })}
          {i < text.split('\n').length - 1 && <br />}
        </span>
      );
    });
  };

  // Animation variants
  const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.4 } } };

  return (
    <AdminLayout currentPath="/admin/assistant">
      <motion.div className="ai-assistant-container" variants={containerVariants} initial="hidden" animate="visible">
        
        <div className="ai-content-wrapper">
          {/* Header */}
          <div className="ai-top-actions">
            <div className="ai-toolbar-title">
              <Sparkles size={18} className="text-blue-500" />
              <span>Omnie Assistant</span>
            </div>
            <div className="ai-action-buttons">
               <button onClick={() => setSettingsModalOpen(true)} className="ai-btn-settings"><Settings size={16} /> API Settings</button>
               <button onClick={startNewConversation} className="ai-btn-new-chat"><Plus size={16} /> New Chat</button>
               <button onClick={() => navigate('/admin/assistant/history')} className="ai-btn-history"><History size={18} /></button>
            </div>
          </div>

          <div className="ai-main-flex-wrapper">
            <div className="ai-background">
              <motion.div className="ai-bg-orb-1" animate={{ y: [-10, 10, -10] }} transition={{ duration: 6, repeat: Infinity }} />
              <motion.div className="ai-bg-orb-2" animate={{ y: [10, -10, 10] }} transition={{ duration: 6, repeat: Infinity }} />
            </div>

            {/* Sidebar */}
            <div className={`ai-sidebar ${sidebarOpen ? '' : 'closed'}`}>
                <h3 className="ai-sidebar-title">Recent Conversations</h3>
                {loadingConversations ? <p className="p-4 text-sm text-gray-400">Loading...</p> : (
                  <div className="ai-conversation-list">
                    {conversations.map((conv) => (
                      <div key={conv.conversationId} className={`ai-conversation-item ${currentConversation?.conversationId === conv.conversationId ? 'active' : ''}`} onClick={() => loadConversation(conv.conversationId)}>
                        <p className="ai-conversation-title">{conv.title || 'Untitled'}</p>
                        <button onClick={(e) => { e.stopPropagation(); deleteConversation(conv.conversationId); }} className="ai-conversation-delete">×</button>
                      </div>
                    ))}
                  </div>
                )}
            </div>

            {/* Main Chat Area */}
            <div className="ai-main-content">
              {messages.length === 0 ? (
                <div className="ai-welcome-screen">
                  <div className="ai-badge">
                    <Sparkles size={12} color="#3b82f6" />
                    <span className="ai-badge-text">AI-Powered Assistant</span>
                  </div>
                  <h1 className="ai-greeting">{getGreeting()} <br /> how can I help you?</h1>
                  <p className="ai-description">Omnie's your intelligent AI companion for the Digital Audio Guide System.
                  <br />Get instant insights, manage data, and streamline administrative tasks with natural language conversations.</p>
                  
                  <div className="ai-quick-actions">
                    {quickActions.map((action, idx) => (
                      <button key={idx} onClick={() => setInputMessage(action.text)} className="ai-quick-action-btn">
                        <span>{action.emoji}</span> {action.label}
                      </button>
                    ))}
                  </div>

                  <div className="ai-input-form-wrapper">
                    <form onSubmit={sendMessage} className="ai-input-form">
                      <div className="ai-input-container">
                        <textarea ref={textareaRef} value={inputMessage} onChange={(e) => setInputMessage(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(e); } }} placeholder="Ask Anything..." disabled={isLoading} rows={2} className="ai-textarea" />
                        <button type="submit" disabled={isLoading || !inputMessage.trim()} className={`ai-send-btn ${isLoading || !inputMessage.trim() ? 'disabled' : 'active'}`}>
                          {isLoading ? '...' : 'Send'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              ) : (
                <>
                  <div className="ai-messages-container">
                    {messages.map((msg, idx) => (
                      <div key={msg.messageId || idx} className={`ai-message ${msg.senderType === 'user' ? 'user' : 'assistant'}`}>
                        {msg.senderType !== 'user' && (
                          <div className="ai-message-avatar assistant"><Sparkles size={18} /></div>
                        )}
                        <div className="ai-message-bubble">
                          <div className="ai-message-content">{formatContent(msg.content)}</div>
                        </div>
                      </div>
                    ))}
                    {isLoading && (
                      <div className="ai-message assistant">
                        <div className="ai-message-avatar assistant"><Sparkles size={18} /></div>
                        <div className="ai-loading-bubble">Omnie is thinking...</div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  <form onSubmit={sendMessage} className="ai-chat-input-form">
                    <div className="ai-input-container">
                      <textarea value={inputMessage} onChange={(e) => setInputMessage(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(e); } }} placeholder="Ask Anything..." disabled={isLoading} rows={1} className="ai-textarea" />
                      <button type="submit" disabled={isLoading || !inputMessage.trim()} className={`ai-send-btn ${isLoading || !inputMessage.trim() ? 'disabled' : 'active'}`}>Send</button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Settings Modal */}
       {settingsModalOpen && (
  <div className="ai-modal-overlay" onClick={() => setSettingsModalOpen(false)}>
    <motion.div 
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      onClick={(e) => e.stopPropagation()} 
      className="ai-modal-content"
    >
      {/* Header Section */}
      <div className="ai-modal-header">
        <div className="ai-modal-header-text">
          <h2 className="ai-modal-title">API Configuration</h2>
          <p className="ai-modal-subtitle">
            Connect your AI Assistant to Google Gemini to enable advanced AI insights and natural language processing.
          </p>
        </div>
        <button className="ai-modal-close" onClick={() => setSettingsModalOpen(false)}>
          <X size={20} />
        </button>
      </div>

      <div className="ai-modal-body">
        {/* Connection Status Section */}
        <div className="ai-status-section">
          <div className="ai-section-label">Connection Status</div>
          {hasKey ? (
            <div className="ai-status-card success">
              <div className="ai-status-indicator"></div>
              <div className="ai-status-details">
                <span className="ai-status-text">Current API: </span>
                <code className="ai-key-preview">"{maskedKey}"</code>
              </div>
            </div>
          ) : (
            <div className="ai-status-card warning">
              <div className="ai-status-indicator"></div>
              <span className="ai-status-text">No active connection found</span>
            </div>
          )}
        </div>

        {/* Form Section */}
        <div className="ai-form-group">
          <div className="ai-label-wrapper">
            <label htmlFor="apiKeyInput">API Key</label>
            <a 
              href="https://aistudio.google.com/app/apikey" 
              target="_blank" 
              rel="noopener noreferrer"
              className="ai-label-link"
            >
              Get a key from Google AI Studio
            </a>
          </div>
          <input 
            id="apiKeyInput"
            type="password" 
            value={apiKey} 
            onChange={(e) => setApiKey(e.target.value)} 
            placeholder="Key in Your API Key Here..." 
            className="ai-form-input" 
          />
        </div>

        {/* Actions Section */}
        <div className="ai-modal-actions">
          <button 
            onClick={handleSaveApiKey} 
            disabled={savingKey || !apiKey.trim()} 
            className="ai-btn-save"
          >
            {savingKey ? 'Verifying...' : 'Save Configuration'}
          </button>
          
        </div>

        {/* Footer Security Section */}
        <div className="ai-modal-footer">
          <div className="ai-security-lock">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            <span>End-to-end encrypted storage</span>
          </div>
        </div>
      </div>
    </motion.div>
  </div>
)}
      </motion.div>
    </AdminLayout>
  );
}
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import AdminLayout from './AdminLayout';
import { Sparkles, Menu, X, Plus, History } from 'lucide-react';
import { motion } from 'framer-motion';

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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning,';
    if (hour < 18) return 'Good Afternoon,';
    return 'Good Evening,';
  };

  useEffect(() => {
    fetchConversations();
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
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    const messageContent = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_BASE}/chat`,
        {
          content: messageContent,
          conversationId: currentConversation?.conversationId
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
    } finally {
      setIsLoading(false);
    }
  };

  const startNewConversation = () => {
    setCurrentConversation(null);
    setMessages([]);
    setSidebarOpen(false); // Close sidebar when starting new chat
  };

  const deleteConversation = async (conversationId: string) => {
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

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
      },
    },
  };

  const buttonVariants = {
    initial: { scale: 1 },
    hover: {
      scale: 1.05,
      y: -2,
      boxShadow: '0 10px 25px rgba(59, 130, 246, 0.15)',
      transition: {
        type: 'spring' as const,
        stiffness: 400,
        damping: 10,
      },
    },
    tap: { scale: 0.95 },
  };

  return (
    <AdminLayout currentPath="/admin/assistant">
      <motion.div
        className="min-h-full w-full overflow-hidden relative"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: 'calc(100vh - 120px)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Main Content Area */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative', flexDirection: 'column' }}>
          {/* Integrated New Chat and History buttons - blended into page */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            padding: '1rem 1.5rem 0 1.5rem',
            background: 'transparent',
            zIndex: 50,
            position: 'absolute',
            top: 0,
            right: 0
          }}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={startNewConversation}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  background: 'rgba(59, 130, 246, 0.9)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)',
                  transition: 'all 0.3s ease'
                }}
              >
                <Plus size={16} />
                <span>New Chat</span>
              </motion.button>
              
              <motion.button
              data-testid="history-toggle-button" 
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSidebarOpen(!sidebarOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0.5rem',
                  background: 'rgba(255, 255, 255, 0.8)',
                  color: '#6b7280',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                  transition: 'all 0.3s ease'
                }}
              >
                <History size={20} />
              </motion.button>
            </div>
          </div>

          {/* Main content wrapper */}
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
          {/* Animated background elements */}
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
            <motion.div
              style={{
                position: 'absolute',
                top: '-10%',
                right: '-5%',
                width: '400px',
                height: '400px',
                background: 'radial-gradient(circle, rgba(59,130,246,0.2) 0%, transparent 70%)',
                borderRadius: '50%',
              }}
              animate={{
                y: [-10, 10, -10],
                rotate: [-2, 2, -2],
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
            <motion.div
              style={{
                position: 'absolute',
                bottom: '-15%',
                left: '-8%',
                width: '500px',
                height: '500px',
                background: 'radial-gradient(circle, rgba(139,92,246,0.2) 0%, transparent 70%)',
                borderRadius: '50%',
              }}
              animate={{
                y: [-10, 10, -10],
                rotate: [-2, 2, -2],
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: 3,
              }}
            />
          </div>

          {/* Sidebar */}
          <div style={{
            width: sidebarOpen ? '280px' : '0',
            borderRight: sidebarOpen ? '1px solid rgba(229,231,235,1)' : 'none',
            padding: sidebarOpen ? '1rem' : '0',
            overflowY: 'auto',
            overflowX: 'hidden',
          backgroundColor: 'white',
          position: 'relative',
          zIndex: 10,
          transition: 'all 0.3s ease-in-out'
        }}>
          {sidebarOpen && (
            <>
              <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.5rem' }}>
                Conversations
              </h3>

              {loadingConversations ? (
                <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: '0.875rem' }}>Loading...</p>
              ) : conversations.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: '0.875rem' }}>No conversations yet</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {conversations.map((conv) => (
                    <div
                      key={conv.conversationId}
                      style={{
                        padding: '0.75rem',
                        backgroundColor: currentConversation?.conversationId === conv.conversationId ? '#dbeafe' : 'white',
                        borderRadius: '0.5rem',
                        cursor: 'pointer',
                        border: '1px solid #e5e7eb',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                      onClick={() => loadConversation(conv.conversationId)}
                    >
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <p style={{
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {conv.title || 'Untitled'}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteConversation(conv.conversationId);
                        }}
                        style={{
                          padding: '0.25rem',
                          backgroundColor: 'transparent',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          fontSize: '1.25rem'
                        }}
                        title="Delete conversation"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Main Content Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 10 }}>
          {messages.length === 0 ? (
            /* Welcome Screen */
            <motion.div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1rem',
                textAlign: 'center',
                overflow: 'hidden'
              }}
              variants={itemVariants}
            >
              {/* AI Badge */}
              <motion.div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '0.5rem',
                  padding: '0.3rem 0.75rem',
                  background: 'linear-gradient(to bottom right, rgba(59, 130, 246, 0.3), rgba(59, 130, 246, 0.1))',
                  borderRadius: '9999px',
                  border: '1px solid rgba(59, 130, 246, 0.5)',
                  backdropFilter: 'blur(10px)'
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                    rotate: [0, 180, 360],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                >
                  <Sparkles size={12} color="#3b82f6" />
                </motion.div>
                <span style={{ fontSize: '0.75rem', fontWeight: '500', color: '#3b82f6' }}>
                  AI-Powered Assistant
                </span>
              </motion.div>

              {/* Main Greeting */}
              <motion.h1
                style={{
                  fontSize: '2rem',
                  fontWeight: 'bold',
                  marginBottom: '0.5rem',
                  background: 'linear-gradient(to right, #1f2937, #3b82f6, #1e40af)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  lineHeight: '1.2'
                }}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                {getGreeting()} <br />
                how can I help you today?
              </motion.h1>

              {/* Description */}
              <motion.p
                style={{
                  fontSize: '0.95rem',
                  color: '#6b7280',
                  maxWidth: '700px',
                  marginBottom: '1.5rem',
                  lineHeight: '1.5'
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                Omnie is your intelligent AI companion for the Digital Audio Guide System. <br />
                Get instant insights, manage data, and streamline administrative tasks with natural language conversations.
              </motion.p>

              {/* Quick Actions */}
              <motion.div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                  justifyContent: 'center',
                  marginBottom: '1rem',
                  maxWidth: '600px'
                }}
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: {},
                  visible: {
                    transition: {
                      staggerChildren: 0.1,
                    },
                  },
                }}
              >
                {quickActions.map((action, idx) => (
                  <motion.div
                    key={idx}
                    variants={{
                      hidden: { opacity: 0, y: 20, scale: 0.8 },
                      visible: {
                        opacity: 1,
                        y: 0,
                        scale: 1,
                        transition: {
                          type: 'spring',
                          stiffness: 300,
                          damping: 20,
                        },
                      },
                    }}
                  >
                    <motion.button
                      variants={buttonVariants}
                      initial="initial"
                      whileHover="hover"
                      whileTap="tap"
                      onClick={() => setInputMessage(action.text)}
                      style={{
                        padding: '0.5rem 1rem',
                        fontSize: '0.875rem',
                        background: 'white',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.5rem',
                        cursor: 'pointer',
                        color: '#374151',
                        fontWeight: '500',
                        backdropFilter: 'blur(10px)'
                      }}
                    >
                      <span style={{ marginRight: '0.5rem' }}>{action.emoji}</span>
                      {action.label}
                    </motion.button>
                  </motion.div>
                ))}
              </motion.div>

              {/* Input Form - Inside Welcome Screen */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                style={{ width: '100%', maxWidth: '48rem', marginTop: '2rem' }}
              >
                <form onSubmit={sendMessage} style={{ width: '100%' }}>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
                    <textarea
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage(e);
                        }
                      }}
                      placeholder="Ask Anything..."
                      disabled={isLoading}
                      rows={2}
                      style={{
                        flex: 1,
                        padding: '0.75rem 1rem',
                        border: '1px solid rgba(209, 213, 219, 0.5)',
                        borderRadius: '0.75rem',
                        fontSize: '0.95rem',
                        outline: 'none',
                        resize: 'none',
                        fontFamily: 'inherit',
                        background: 'rgba(255, 255, 255, 0.8)',
                        backdropFilter: 'blur(10px)'
                      }}
                    />
                    <motion.button
                      type="submit"
                      disabled={isLoading || !inputMessage.trim()}
                      whileHover={!isLoading && inputMessage.trim() ? { scale: 1.05, y: -2 } : {}}
                      whileTap={!isLoading && inputMessage.trim() ? { scale: 0.95 } : {}}
                      style={{
                        padding: '0.75rem 2rem',
                        background: isLoading || !inputMessage.trim() 
                          ? '#9ca3af' 
                          : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.75rem',
                        cursor: isLoading || !inputMessage.trim() ? 'not-allowed' : 'pointer',
                        fontWeight: '600',
                        fontSize: '1rem',
                        minWidth: '100px',
                        whiteSpace: 'nowrap',
                        boxShadow: isLoading || !inputMessage.trim() ? 'none' : '0 4px 12px rgba(59, 130, 246, 0.4)'
                      }}
                    >
                      {isLoading ? 'Sending...' : 'Send'}
                    </motion.button>
                  </div>
                  <div style={{
                    marginTop: '0.5rem',
                    fontSize: '0.75rem',
                    color: '#6b7280',
                    textAlign: 'right'
                  }}>
                    Press <strong>Enter</strong> to send, <strong>Shift + Enter</strong> for new line
                  </div>
                </form>
              </motion.div>
            </motion.div>
          ) : (
            /* Messages Display with Input Form */
            <>
              <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '1rem',
                background: 'rgba(255, 255, 255, 0.5)',
                backdropFilter: 'blur(10px)'
              }}>
                {messages.map((msg, idx) => {
                  const isUser = msg.senderType === 'user';
                  // Simple markdown-like formatting
                  const formatContent = (text: string) => {
                    return text
                      .split('\n')
                      .map((line, i) => {
                        // Convert **text** to bold and *text* to italic
                        const parts = line.split(/(\*\*.*?\*\*|\*.*?\*)/g);
                        return (
                          <span key={i}>
                            {parts.map((part, j) => {
                              if (part.startsWith('**') && part.endsWith('**')) {
                                return <strong key={j}>{part.slice(2, -2)}</strong>;
                              } else if (part.startsWith('*') && part.endsWith('*')) {
                                return <em key={j}>{part.slice(1, -1)}</em>;
                              }
                              return <span key={j}>{part}</span>;
                            })}
                            {i < text.split('\n').length - 1 && <br />}
                          </span>
                        );
                      });
                  };

                  return (
                    <motion.div
                      key={msg.messageId || idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      style={{
                        marginBottom: '1rem',
                        display: 'flex',
                        gap: '0.5rem',
                        justifyContent: isUser ? 'flex-end' : 'flex-start',
                        alignItems: 'flex-start'
                      }}
                    >
                      {/* Profile picture for AI (left side) */}
                      {!isUser && (
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontWeight: '600',
                          fontSize: '0.875rem',
                          flexShrink: 0,
                          boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)'
                        }}>
                          <Sparkles size={16} />
                        </div>
                      )}
                      
                      <div
                        style={{
                          maxWidth: '70%',
                          padding: '0.75rem 1rem',
                          borderRadius: '0.75rem',
                          backgroundColor: isUser ? '#3b82f6' : '#f3f4f6',
                          color: isUser ? 'white' : '#1f2937'
                        }}
                      >
                        <div style={{ margin: 0 }}>
                          {formatContent(msg.content)}
                        </div>
                      </div>

                      {/* Profile picture for User (right side) */}
                      {isUser && (
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #10b981, #059669)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontWeight: '600',
                          fontSize: '0.875rem',
                          flexShrink: 0,
                          boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
                        }}>
                          A
                        </div>
                      )}
                    </motion.div>
                  );
                })}
                
                {/* Loading indicator */}
                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      marginBottom: '1rem',
                      display: 'flex',
                      gap: '0.5rem',
                      justifyContent: 'flex-start',
                      alignItems: 'flex-start'
                    }}
                  >
                    {/* AI profile picture */}
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: '600',
                      fontSize: '0.875rem',
                      flexShrink: 0,
                      boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)'
                    }}>
                      <Sparkles size={16} />
                    </div>
                    
                    <div
                      style={{
                        maxWidth: '70%',
                        padding: '0.75rem 1rem',
                        borderRadius: '0.75rem',
                        backgroundColor: '#f3f4f6',
                        color: '#6b7280',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      <motion.div
                        animate={{
                          rotate: 360
                        }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          ease: 'linear'
                        }}
                      >
                        <Sparkles size={16} color="#3b82f6" />
                      </motion.div>
                      <span>Omnie is thinking...</span>
                    </div>
                  </motion.div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Input Form - In Chat View */}
              <form onSubmit={sendMessage} style={{
                padding: '1rem',
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(10px)',
                borderTop: '1px solid rgba(229,231,235,0.5)'
              }}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
                  <textarea
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage(e);
                      }
                    }}
                    placeholder="Ask Anything..."
                    disabled={isLoading}
                    rows={2}
                    style={{
                      flex: 1,
                      padding: '0.75rem 1rem',
                      border: '1px solid rgba(209, 213, 219, 0.5)',
                      borderRadius: '0.75rem',
                      fontSize: '0.95rem',
                      outline: 'none',
                      resize: 'none',
                      fontFamily: 'inherit',
                      background: 'rgba(255, 255, 255, 0.8)',
                      backdropFilter: 'blur(10px)'
                    }}
                  />
                  <motion.button
                    type="submit"
                    disabled={isLoading || !inputMessage.trim()}
                    whileHover={!isLoading && inputMessage.trim() ? { scale: 1.05, y: -2 } : {}}
                    whileTap={!isLoading && inputMessage.trim() ? { scale: 0.95 } : {}}
                    style={{
                      padding: '0.75rem 2rem',
                      background: isLoading || !inputMessage.trim() 
                        ? '#9ca3af' 
                        : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.75rem',
                      cursor: isLoading || !inputMessage.trim() ? 'not-allowed' : 'pointer',
                      fontWeight: '600',
                      fontSize: '1rem',
                      minWidth: '100px',
                      whiteSpace: 'nowrap',
                      boxShadow: isLoading || !inputMessage.trim() ? 'none' : '0 4px 12px rgba(59, 130, 246, 0.4)'
                    }}
                  >
                    {isLoading ? 'Sending...' : 'Send'}
                  </motion.button>
                </div>
                <div style={{
                  marginTop: '0.5rem',
                  fontSize: '0.75rem',
                  color: '#6b7280',
                  textAlign: 'right'
                }}>
                  Press <strong>Enter</strong> to send, <strong>Shift + Enter</strong> for new line
                </div>
              </form>
            </>
          )}
        </div>
        </div>
        </div>
      </motion.div>
    </AdminLayout>
  );
}

import React, { useState, useRef, useEffect } from 'react';
import { Input, Button, List, Typography, Spin, message as antdMessage, Tag, Card, Divider, Avatar, Alert } from 'antd';
import { SendOutlined, LoadingOutlined, ToolOutlined, CheckCircleOutlined, RobotOutlined, UserOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { streamAIChat, invokeAI } from './api';

const { Text } = Typography;

function formatTime(date) {
  const d = new Date(date);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Generate a unique conversation ID
function generateConversationId() {
  return 'conv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

export default function AIChatPanel({ onInvoiceUpdate }) {
  const [messages, setMessages] = useState([
    { 
      role: 'system', 
      content: 'You are an AI assistant for invoice management. You can answer questions and perform invoice actions using QuickBooks tools.', 
      time: Date.now() 
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentStream, setCurrentStream] = useState('');
  const [toolCalls, setToolCalls] = useState([]);
  const [toolResults, setToolResults] = useState([]);
  const [conversationId, setConversationId] = useState(generateConversationId());
  const [error, setError] = useState(null);
  const [lastResponse, setLastResponse] = useState(null);
  const listRef = useRef();

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, currentStream, toolCalls, toolResults]);

  // Reset conversation when component mounts
  useEffect(() => {
    setConversationId(generateConversationId());
  }, []);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    
    const now = Date.now();
    const newMsg = { role: 'user', content: input, time: now };
    setMessages(msgs => [...msgs, newMsg]);
    setInput('');
    setLoading(true);
    setCurrentStream('');
    setToolCalls([]);
    setToolResults([]);
    setError(null);

    try {
      const result = await invokeAI({ 
        messages: [...messages, newMsg],
        maxSteps: 5,
        toolChoice: 'auto',
        conversationId
      });
      
      // Store the last response for context
      setLastResponse(result);
      
      // Add the assistant message
      setMessages(msgs => [...msgs, { 
        role: 'assistant', 
        content: result.text || 'No response received.',
        time: Date.now(),
        metadata: {
          steps: result.steps,
          toolResults: result.toolResults?.length || 0,
          conversationId: result.conversationId
        }
      }]);
      
      // Handle tool results and invoice updates
      let jsonMatch = result.text && result.text.match(/===INVOICE_DATA_START===\n([\s\S]+?)\n===INVOICE_DATA_END===/);
      if (jsonMatch) {
        try {
          let invoiceData = JSON.parse(jsonMatch[1]);
          // Always treat as array for the table
          if (!Array.isArray(invoiceData)) {
            invoiceData = [invoiceData];
          }
          // Map flat AI invoice data to the expected structure for the table
          const mapped = invoiceData.map(inv => ({
            Id: inv.id || inv.Id,
            DocNumber: inv.DocNumber || inv["Invoice #"],
            CustomerRef: { name: inv.Customer || (inv.CustomerRef && inv.CustomerRef.name) },
            TxnDate: inv.TxnDate || inv["Date"],
            DueDate: inv.DueDate || inv["Due Date"],
            TotalAmt: inv.TotalAmt || inv["Total"],
            Balance: inv.Balance,
            Status: inv.Status,
          }));
          if (onInvoiceUpdate) {
            onInvoiceUpdate(mapped);
          }
        } catch (e) {
          // If parsing fails, do not update the table
          console.error('Failed to parse invoice data from AI response:', e);
        }
      }
      
      setLoading(false);
    } catch (e) {
      console.error('AI Chat Error:', e);
      
      // Handle different types of errors
      let errorMessage = e.message;
      let errorType = 'general';
      
      if (e.response?.data) {
        const errorData = e.response.data;
        errorMessage = errorData.error || errorMessage;
        errorType = errorData.errorType || 'general';
        
        if (errorData.needsAuth) {
          errorMessage = 'QuickBooks authentication required. Please authenticate first.';
          errorType = 'auth';
        }
      }
      
      setError({
        message: errorMessage,
        type: errorType,
        suggestion: e.response?.data?.suggestion
      });
      
      // Add error message to chat
      setMessages(msgs => [...msgs, { 
        role: 'assistant', 
        content: `I encountered an error: ${errorMessage}`,
        time: Date.now(),
        isError: true
      }]);
      
      setLoading(false);
    }
  };

  const renderMessage = (msg, idx) => {
    const isUser = msg.role === 'user';
    const isAI = msg.role === 'assistant';
    const isSystem = msg.role === 'system';
    const isError = msg.isError;
    
    // If assistant, strip out delimited JSON from display
    let displayContent = msg.content;
    if (isAI && typeof displayContent === 'string') {
      displayContent = displayContent.replace(/===INVOICE_DATA_START===([\s\S]*?)===INVOICE_DATA_END===/g, '').trim();
    }
    
    const align = isUser ? 'flex-end' : 'flex-start';
    const bubbleColor = isUser ? '#1677ff' : isError ? '#ff4d4f' : isAI ? '#f4faff' : '#f0f0f0';
    const textColor = isUser ? '#fff' : isError ? '#fff' : '#333';
    const borderRadius = isUser
      ? '16px 16px 4px 16px'
      : isAI
      ? '16px 16px 16px 4px'
      : '12px';
    
    const avatar = isUser ? (
      <Avatar style={{ background: '#1677ff' }} icon={<UserOutlined />} />
    ) : isAI ? (
      <Avatar style={{ background: isError ? '#ff4d4f' : '#b7e0ff' }} icon={<RobotOutlined />} />
    ) : (
      <Avatar style={{ background: '#e6f0fa', color: '#1677ff' }}>S</Avatar>
    );
    
    return (
      <div key={idx} style={{ display: 'flex', flexDirection: isUser ? 'row-reverse' : 'row', alignItems: 'flex-end', marginBottom: 12 }}>
        {avatar}
        <div style={{ maxWidth: '80%', margin: isUser ? '0 12px 0 0' : '0 0 0 12px', display: 'flex', flexDirection: 'column', alignItems: align }}>
          <div
            style={{
              background: bubbleColor,
              color: textColor,
              borderRadius,
              padding: '12px 16px',
              fontSize: 15,
              boxShadow: isUser ? '0 2px 8px #1677ff22' : isError ? '0 2px 8px #ff4d4f22' : '0 2px 8px #e6f0fa',
              minWidth: 60,
              wordBreak: 'break-word',
              whiteSpace: 'pre-wrap',
              marginBottom: 2,
            }}
            aria-label={isUser ? 'Your message' : isAI ? 'AI message' : 'System message'}
          >
            {displayContent}
          </div>
          
          {/* Metadata for AI messages */}
          {isAI && msg.metadata && (
            <div style={{ fontSize: 11, color: '#888', marginTop: 4, textAlign: align === 'flex-end' ? 'right' : 'left' }}>
              {msg.metadata.steps > 0 && `Steps: ${msg.metadata.steps}`}
              {msg.metadata.toolResults > 0 && ` • Tools: ${msg.metadata.toolResults}`}
            </div>
          )}
          
          <span style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{formatTime(msg.time)}</span>
        </div>
      </div>
    );
  };

  const clearError = () => {
    setError(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '16px 0 8px 0', textAlign: 'center', fontWeight: 600, color: '#1677ff', fontSize: 18, letterSpacing: 1, borderBottom: '1px solid #e6f0fa', background: '#f8fbff', borderRadius: '12px 12px 0 0' }}>
        <RobotOutlined style={{ marginRight: 8 }} />AI Assistant
      </div>
      
      {/* Error Alert */}
      {error && (
        <Alert
          message={error.message}
          description={error.suggestion}
          type="error"
          showIcon
          closable
          onClose={clearError}
          style={{ margin: 8, borderRadius: 8 }}
        />
      )}
      
      <div
        ref={listRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          background: '#f8fbff',
          borderRadius: error ? '0' : '0 0 12px 12px',
          boxShadow: '0 2px 12px #e6f0fa',
          padding: 24,
          minHeight: 400,
          maxHeight: 480,
          marginBottom: 0,
        }}
        tabIndex={0}
        aria-label="Chat history"
      >
        {messages.slice(1).map(renderMessage)}
        {currentStream && (
          <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 12 }}>
            <Avatar style={{ background: '#b7e0ff' }} icon={<RobotOutlined />} />
            <div style={{
              background: '#f4faff',
              color: '#333',
              borderRadius: '16px 16px 16px 4px',
              padding: '12px 16px',
              fontSize: 15,
              marginLeft: 12,
              minWidth: 60,
              wordBreak: 'break-word',
              whiteSpace: 'pre-wrap',
              boxShadow: '0 2px 8px #e6f0fa',
            }}>
              {currentStream}
              {loading && <span style={{ color: '#1677ff' }}>▋</span>}
            </div>
          </div>
        )}
        {loading && !currentStream && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 16 }}>
            <Spin indicator={<LoadingOutlined style={{ fontSize: 24, color: '#1677ff' }} spin />} />
            <Text style={{ marginLeft: 12, color: '#666' }}>Processing your request...</Text>
          </div>
        )}
      </div>
      
      <Divider style={{ margin: 0, borderColor: '#e6f0fa' }} />
      
      <Input.Group compact style={{ display: 'flex', background: '#fff', borderRadius: '0 0 12px 12px', boxShadow: '0 2px 8px #e6f0fa', padding: 16, position: 'sticky', bottom: 0, zIndex: 2 }}>
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onPressEnter={handleSend}
          placeholder="Ask about invoices or request an action (e.g., 'Show me invoices over $1000', 'Which invoice has the max balance?')..."
          style={{ flex: 1, borderRadius: 8, border: '1px solid #e6f0fa', background: '#fff' }}
          disabled={loading}
          aria-label="Type your message"
        />
        <Button 
          type="primary" 
          icon={<SendOutlined />} 
          onClick={handleSend} 
          style={{ background: '#1677ff', marginLeft: 8 }} 
          disabled={loading || !input.trim()}
          aria-label="Send message"
        >
          Send
        </Button>
      </Input.Group>
    </div>
  );
} 
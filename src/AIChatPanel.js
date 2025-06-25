import React, { useState, useRef, useEffect } from 'react';
import { Input, Button, List, Typography, Spin, message as antdMessage, Tag, Card } from 'antd';
import { SendOutlined, LoadingOutlined, ToolOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { streamAIChat, invokeAI } from './api';

const { Text } = Typography;

export default function AIChatPanel({ onInvoiceUpdate }) {
  const [messages, setMessages] = useState([
    { role: 'system', content: 'You are an AI assistant for invoice management. You can answer questions and perform invoice actions using QuickBooks tools.' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentStream, setCurrentStream] = useState('');
  const [toolCalls, setToolCalls] = useState([]);
  const [toolResults, setToolResults] = useState([]);
  const listRef = useRef();

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, currentStream, toolCalls, toolResults]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    
    const newMsg = { role: 'user', content: input };
    setMessages(msgs => [...msgs, newMsg]);
    setInput('');
    setLoading(true);
    setCurrentStream('');
    setToolCalls([]);
    setToolResults([]);

    try {
      // Use non-streaming for testing
      const result = await invokeAI({ 
        messages: [...messages, newMsg],
        maxSteps: 5,
        toolChoice: 'auto', // Allow AI to use tools when appropriate
      });
      
      // Add the assistant message
      setMessages(msgs => [...msgs, { 
        role: 'assistant', 
        content: result.text || 'No response received.'
      }]);
      
      // Handle tool results if any
      if (result.toolResults && result.toolResults.length > 0) {
        setToolResults(result.toolResults);
        // Notify parent component about invoice updates
        if (onInvoiceUpdate) {
          result.toolResults.forEach(result => onInvoiceUpdate(result));
        }
      }
      
      setLoading(false);
    } catch (e) {
      console.error('AI Chat Error:', e);
      antdMessage.error(e.message);
      setLoading(false);
    }
  };

  const renderMessage = (msg, idx) => {
    return (
      <List.Item key={idx} style={{ border: 'none', padding: '8px 0' }}>
        <div style={{ width: '100%' }}>
          {msg.role === 'user' && <Tag color="#1677ff">You</Tag>}
          {msg.role === 'assistant' && <Tag color="#52c41a">AI</Tag>}
          {msg.role === 'system' && <Tag color="#722ed1">System</Tag>}
          <Text style={{ whiteSpace: 'pre-wrap', color: '#333' }}>{msg.content}</Text>
        </div>
      </List.Item>
    );
  };

  const renderToolCall = (toolCall, idx) => {
    return (
      <List.Item key={`tool-${idx}`} style={{ border: 'none', padding: '8px 0' }}>
        <div style={{ width: '100%' }}>
          <Tag color="#fa8c16" icon={<ToolOutlined />}>
            {toolCall.tool}
          </Tag>
          <Text style={{ color: '#666', fontSize: '12px' }}>
            {JSON.stringify(toolCall.args, null, 2)}
          </Text>
        </div>
      </List.Item>
    );
  };

  const renderToolResult = (result, idx) => {
    return (
      <List.Item key={`result-${idx}`} style={{ border: 'none', padding: '8px 0' }}>
        <div style={{ width: '100%' }}>
          <Tag color="#52c41a" icon={<CheckCircleOutlined />}>
            Tool Result
          </Tag>
          <Card size="small" style={{ marginTop: 8, background: '#f6ffed' }}>
            <pre style={{ fontSize: '12px', margin: 0, whiteSpace: 'pre-wrap' }}>
              {JSON.stringify(result, null, 2)}
            </pre>
          </Card>
        </div>
      </List.Item>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div ref={listRef} style={{ flex: 1, overflowY: 'auto', marginBottom: 16, background: '#f4faff', borderRadius: 8, padding: 16, minHeight: 400 }}>
        <List
          dataSource={[
            ...messages.slice(1), // Skip system message
            ...toolCalls.map((tc, idx) => ({ type: 'tool-call', data: tc, idx })),
            ...toolResults.map((tr, idx) => ({ type: 'tool-result', data: tr, idx })),
            ...(currentStream ? [{ type: 'stream', content: currentStream }] : [])
          ]}
          renderItem={(item) => {
            if (item.type === 'tool-call') {
              return renderToolCall(item.data, item.idx);
            } else if (item.type === 'tool-result') {
              return renderToolResult(item.data, item.idx);
            } else if (item.type === 'stream') {
              return (
                <List.Item style={{ border: 'none', padding: '8px 0' }}>
                  <div style={{ width: '100%' }}>
                    <Tag color="#52c41a">AI</Tag>
                    <Text style={{ whiteSpace: 'pre-wrap', color: '#333' }}>
                      {item.content}
                      {loading && <span style={{ color: '#1677ff' }}>▋</span>}
                    </Text>
                  </div>
                </List.Item>
              );
            } else {
              return renderMessage(item, item.idx);
            }
          }}
        />
        {loading && !currentStream && (
          <Spin indicator={<LoadingOutlined style={{ fontSize: 24, color: '#1677ff' }} spin />} style={{ marginTop: 16 }} />
        )}
      </div>
      <Input.Group compact style={{ display: 'flex' }}>
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onPressEnter={handleSend}
          placeholder="Ask about invoices or request an action (e.g., 'Show me all invoices', 'Create an invoice for John Doe')..."
          style={{ flex: 1, borderRadius: 8, border: '1px solid #e6f0fa', background: '#fff' }}
          disabled={loading}
        />
        <Button 
          type="primary" 
          icon={<SendOutlined />} 
          onClick={handleSend} 
          style={{ background: '#1677ff', marginLeft: 8 }} 
          disabled={loading || !input.trim()}
        >
          Send
        </Button>
      </Input.Group>
    </div>
  );
} 
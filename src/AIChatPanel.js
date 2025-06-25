import React, { useState, useRef } from 'react';
import { Input, Button, List, Typography, Spin, message as antdMessage, Tag } from 'antd';
import { SendOutlined, LoadingOutlined } from '@ant-design/icons';
import { streamAIChat } from './api';

const { Text } = Typography;

export default function AIChatPanel() {
  const [messages, setMessages] = useState([
    { role: 'system', content: 'You are an AI assistant for invoice management. You can answer questions and perform invoice actions.' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streamed, setStreamed] = useState([]);
  const listRef = useRef();

  const handleSend = async () => {
    if (!input.trim()) return;
    const newMsg = { role: 'user', content: input };
    setMessages(msgs => [...msgs, newMsg]);
    setInput('');
    setLoading(true);
    try {
      const result = await streamAIChat({ messages: [...messages, newMsg] });
      setMessages(msgs => [...msgs, { role: 'assistant', content: result.text || 'No response.' }]);
    } catch (e) {
      antdMessage.error(e.message);
    }
    setLoading(false);
    setTimeout(() => {
      if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
    }, 100);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div ref={listRef} style={{ flex: 1, overflowY: 'auto', marginBottom: 16, background: '#f4faff', borderRadius: 8, padding: 16, minHeight: 400 }}>
        <List
          dataSource={[...messages.slice(1), ...streamed]}
          renderItem={(msg, idx) => (
            <List.Item key={idx} style={{ border: 'none', padding: '8px 0' }}>
              <div style={{ width: '100%' }}>
                {msg.role === 'user' && <Tag color="#1677ff">You</Tag>}
                {msg.role === 'assistant' && <Tag color="#b7e0ff">AI</Tag>}
                {msg.role === 'tool' && <Tag color="#e6f0fa">Tool Call</Tag>}
                {msg.role === 'tool-result' && <Tag color="#e6f0fa">Tool Result</Tag>}
                <Text style={{ whiteSpace: 'pre-wrap', color: '#333' }}>{msg.content}</Text>
              </div>
            </List.Item>
          )}
        />
        {loading && <Spin indicator={<LoadingOutlined style={{ fontSize: 24, color: '#1677ff' }} spin />} style={{ marginTop: 16 }} />}
      </div>
      <Input.Group compact style={{ display: 'flex' }}>
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onPressEnter={handleSend}
          placeholder="Ask about invoices or request an action..."
          style={{ flex: 1, borderRadius: 8, border: '1px solid #e6f0fa', background: '#fff' }}
          disabled={loading}
        />
        <Button type="primary" icon={<SendOutlined />} onClick={handleSend} style={{ background: '#1677ff', marginLeft: 8 }} disabled={loading}>
          Send
        </Button>
      </Input.Group>
    </div>
  );
} 
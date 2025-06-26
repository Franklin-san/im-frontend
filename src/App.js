import React, { useState, useEffect } from 'react';
import { Layout, Menu, Typography, message, Button } from 'antd';
import { FileTextOutlined, RobotOutlined, ReloadOutlined } from '@ant-design/icons';
import 'antd/dist/reset.css';
import './App.css';
import InvoicePanel from './InvoicePanel';
import AIChatPanel from './AIChatPanel';
import { fetchInvoices } from './api';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

function App() {
  const [refreshInvoices, setRefreshInvoices] = useState(0);
  const [aiInvoices, setAiInvoices] = useState(null); // Store invoices from AI toolResults
  const [allInvoices, setAllInvoices] = useState([]); // Store all invoices for reset
  const [isReconnecting, setIsReconnecting] = useState(false);

  // Load all invoices on mount or refresh
  useEffect(() => {
    async function loadAll() {
      try {
        const data = await fetchInvoices();
        setAllInvoices(data);
      } catch (e) {
        message.error('Failed to load all invoices');
      }
    }
    loadAll();
  }, [refreshInvoices]);

  // Handle QuickBooks reconnection
  const handleReconnect = async () => {
    setIsReconnecting(true);
    try {
      const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:3000';
      const reconnectUrl = `${API_BASE}/auth/start`;
      
      // Open the auth URL in a new window/tab
      window.open(reconnectUrl, '_blank', 'width=800,height=600');
      
      message.success('Reconnection window opened. Please complete the QuickBooks authorization.');
    } catch (error) {
      message.error('Failed to initiate reconnection: ' + error.message);
    } finally {
      setIsReconnecting(false);
    }
  };

  const handleInvoiceUpdate = (toolResult) => {
    // If toolResult is an array of invoices (from listInvoices), set as invoice data
    if (Array.isArray(toolResult) && toolResult.length && toolResult[0].DocNumber) {
      setAiInvoices(toolResult);
      message.success('Invoices loaded from AI!');
      return;
    }
    // If toolResult is a single invoice (from getInvoice), filter from allInvoices or add as new
    if (toolResult && toolResult.DocNumber) {
      // Try to find in allInvoices
      const found = allInvoices.find(inv => inv.Id === toolResult.Id);
      if (found) {
        setAiInvoices([found]);
      } else {
        setAiInvoices([toolResult]);
      }
      message.success('Invoice details loaded from AI!');
      return;
    }
    // Otherwise, fallback to refresh
    if (toolResult && (
      toolResult.Id || // Invoice was created/updated
      toolResult.message?.includes('deleted') || // Invoice was deleted
      toolResult.message?.includes('sent') // Invoice was emailed
    )) {
      setRefreshInvoices(prev => prev + 1);
      setAiInvoices(null); // Reset to all
      message.success('Invoice data updated!');
    }
  };

  // Handler to reset to all invoices
  const handleShowAll = () => {
    setAiInvoices(null);
    message.info('Showing all invoices');
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#f0f6ff' }}>
      <Header style={{ background: '#e6f0fa', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Title level={3} style={{ color: '#1677ff', margin: 0 }}>Invoice Manager AI</Title>
        <Button 
          type="primary" 
          icon={<ReloadOutlined />} 
          loading={isReconnecting}
          onClick={handleReconnect}
          style={{ 
            background: '#1677ff', 
            borderColor: '#1677ff',
            borderRadius: '6px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          {isReconnecting ? 'Reconnecting...' : 'Reconnect QuickBooks'}
        </Button>
      </Header>
      <Layout>
        <Sider width={1000} style={{ background: '#f4faff', borderRight: '1px solid #e6f0fa', padding: 0, minHeight: 'calc(100vh - 64px)' }}>
          <Menu mode="inline" defaultSelectedKeys={['invoices']} style={{ border: 'none', background: 'transparent', marginTop: 0 }}>
            <Menu.Item key="invoices" icon={<FileTextOutlined style={{ color: '#1677ff' }} />}>Invoices</Menu.Item>
          </Menu>
          <div style={{ padding: '24px 0 0 0', width: '100%' }}>
            <div style={{ color: '#1677ff', fontWeight: 500, marginBottom: 16, paddingLeft: 32 }}>Invoice Management</div>
            <div style={{ width: '100%' }}>
              <InvoicePanel key={refreshInvoices} aiInvoices={aiInvoices} allInvoices={allInvoices} onShowAll={handleShowAll} />
            </div>
          </div>
        </Sider>
        <Content style={{ padding: '32px 32px', background: '#f0f6ff', minHeight: 'calc(100vh - 64px)' }}>
          <div style={{ maxWidth: 1000, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
              <RobotOutlined style={{ fontSize: 32, color: '#1677ff', marginRight: 12 }} />
              <Title level={4} style={{ color: '#1677ff', margin: 0 }}>AI Chat Assistant</Title>
            </div>
            <div style={{ background: '#fff', borderRadius: 12, minHeight: 500, boxShadow: '0 2px 8px #e6f0fa', padding: 24 }}>
              <AIChatPanel onInvoiceUpdate={handleInvoiceUpdate} />
            </div>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}

export default App;

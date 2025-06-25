import React from 'react';
import { Layout, Menu, Typography } from 'antd';
import { FileTextOutlined, RobotOutlined } from '@ant-design/icons';
import 'antd/dist/reset.css';
import './App.css';
import InvoicePanel from './InvoicePanel';
import AIChatPanel from './AIChatPanel';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

function App() {
  return (
    <Layout style={{ minHeight: '100vh', background: '#f0f6ff' }}>
      <Header style={{ background: '#e6f0fa', padding: '0 24px', display: 'flex', alignItems: 'center' }}>
        <Title level={3} style={{ color: '#1677ff', margin: 0 }}>Invoice Manager AI</Title>
      </Header>
      <Layout>
        <Sider width={1000} style={{ background: '#f4faff', borderRight: '1px solid #e6f0fa', padding: 0, minHeight: 'calc(100vh - 64px)' }}>
          <Menu mode="inline" defaultSelectedKeys={['invoices']} style={{ border: 'none', background: 'transparent', marginTop: 0 }}>
            <Menu.Item key="invoices" icon={<FileTextOutlined style={{ color: '#1677ff' }} />}>Invoices</Menu.Item>
          </Menu>
          <div style={{ padding: '24px 0 0 0', width: '100%' }}>
            <div style={{ color: '#1677ff', fontWeight: 500, marginBottom: 16, paddingLeft: 32 }}>Invoice Management</div>
            <div style={{ width: '100%' }}>
              <InvoicePanel />
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
              <AIChatPanel />
            </div>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}

export default App;

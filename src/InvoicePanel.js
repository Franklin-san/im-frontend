import React, { useEffect, useState } from 'react';
import { Button, Table, Modal, Form, Input, message, Space, Typography, Popconfirm, Tag, Card, Row, Col, Divider, Descriptions, Avatar, Tooltip, Empty } from 'antd';
import { MailOutlined, DeleteOutlined, EyeOutlined, FileTextOutlined } from '@ant-design/icons';
import {
  fetchInvoices,
  fetchInvoice,
  deleteInvoice,
  emailInvoice,
} from './api';

const { Title } = Typography;

const FRANKLIN_LOGO = (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="20" cy="20" r="20" fill="#1677ff"/>
    <text x="50%" y="55%" textAnchor="middle" fill="#fff" fontSize="18" fontFamily="Arial" dy=".3em">F</text>
  </svg>
);

function EmailModal({ visible, onCancel, onSend, loading }) {
  const [email, setEmail] = useState('');
  useEffect(() => { if (!visible) setEmail(''); }, [visible]);
  return (
    <Modal
      open={visible}
      title="Send Invoice via Email"
      onCancel={onCancel}
      onOk={() => onSend(email)}
      okText="Send"
      confirmLoading={loading}
      destroyOnClose
    >
      <Input
        placeholder="Recipient Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        type="email"
      />
    </Modal>
  );
}

function InvoiceDetailModal({ invoice, visible, onClose }) {
  if (!invoice) return null;
  const customer = invoice.CustomerRef?.name || 'N/A';
  const customerId = invoice.CustomerRef?.value || 'N/A';
  const billEmail = invoice.BillEmail?.Address || 'N/A';
  const billAddr = invoice.BillAddr || {};
  const shipAddr = invoice.ShipAddr || {};
  const status = (() => {
    const balance = parseFloat(invoice.Balance || 0);
    const total = parseFloat(invoice.TotalAmt || 0);
    if (balance === 0) return <Tag color="success">Paid</Tag>;
    if (balance < total) return <Tag color="warning">Partial</Tag>;
    if (balance === total) return <Tag color="error">Unpaid</Tag>;
    return <Tag>Unknown</Tag>;
  })();
  const lineItems = (invoice.Line || []).filter(l => l.DetailType === 'SalesItemLineDetail');
  const columns = [
    { title: 'Description', dataIndex: 'Description', key: 'desc', render: t => t || '-' },
    { title: 'Qty', dataIndex: ['SalesItemLineDetail', 'Qty'], key: 'qty', align: 'right', render: v => v || '-' },
    { title: 'Unit Price', dataIndex: ['SalesItemLineDetail', 'UnitPrice'], key: 'unit', align: 'right', render: v => v ? `$${parseFloat(v).toFixed(2)}` : '-' },
    { title: 'Amount', dataIndex: 'Amount', key: 'amt', align: 'right', render: v => v ? `$${parseFloat(v).toFixed(2)}` : '-' },
  ];
  return (
    <Modal
      open={visible}
      title={null}
      onCancel={onClose}
      footer={null}
      width={800}
      destroyOnClose
      style={{ top: 32 }}
    >
      <Card bordered={false} style={{ background: '#f8faff' }}>
        <Row align="middle" gutter={16} style={{ marginBottom: 16 }}>
          <Col>
            <Avatar shape="square" size={48} icon={<FileTextOutlined />} src={FRANKLIN_LOGO} />
          </Col>
          <Col>
            <Title level={4} style={{ margin: 0, color: '#1677ff' }}>Franklin Corp</Title>
            <div style={{ fontSize: 16, fontWeight: 500 }}>Invoice #{invoice.DocNumber}</div>
            <div style={{ fontSize: 13, color: '#888' }}>ID: {invoice.Id} {status}</div>
          </Col>
        </Row>
        <Divider style={{ margin: '12px 0' }} />
        <Row gutter={24}>
          <Col span={12}>
            <Descriptions column={1} size="small" bordered labelStyle={{ width: 120 }}>
              <Descriptions.Item label="Invoice Date">{invoice.TxnDate ? new Date(invoice.TxnDate).toLocaleDateString() : '-'}</Descriptions.Item>
              <Descriptions.Item label="Due Date">{invoice.DueDate ? new Date(invoice.DueDate).toLocaleDateString() : '-'}</Descriptions.Item>
              <Descriptions.Item label="Total">${parseFloat(invoice.TotalAmt || 0).toFixed(2)}</Descriptions.Item>
              <Descriptions.Item label="Balance">${parseFloat(invoice.Balance || 0).toFixed(2)}</Descriptions.Item>
              <Descriptions.Item label="Status">{status}</Descriptions.Item>
            </Descriptions>
          </Col>
          <Col span={12}>
            <Descriptions column={1} size="small" bordered labelStyle={{ width: 120 }}>
              <Descriptions.Item label="Customer">{customer}</Descriptions.Item>
              <Descriptions.Item label="Customer ID">{customerId}</Descriptions.Item>
              <Descriptions.Item label="Email">{billEmail}</Descriptions.Item>
              <Descriptions.Item label="Billing Address">{billAddr.Line1 || ''} {billAddr.Line2 || ''} {billAddr.Line3 || ''}</Descriptions.Item>
              <Descriptions.Item label="Shipping Address">{shipAddr.Line1 || ''} {shipAddr.City || ''} {shipAddr.PostalCode || ''}</Descriptions.Item>
            </Descriptions>
          </Col>
        </Row>
        <Divider style={{ margin: '16px 0' }}>Line Items</Divider>
        <Table
          dataSource={lineItems}
          columns={columns}
          rowKey={(_, idx) => idx}
          pagination={false}
          size="small"
          style={{ background: '#fff', borderRadius: 8, marginBottom: 16 }}
        />
        <Row gutter={24} style={{ marginTop: 16 }}>
          <Col span={12}>
            <Descriptions column={1} size="small" bordered labelStyle={{ width: 120 }}>
              <Descriptions.Item label="Memo">{invoice.CustomerMemo?.value || '-'}</Descriptions.Item>
              <Descriptions.Item label="Invoice Link">
                {invoice.InvoiceLink ? <a href={invoice.InvoiceLink} target="_blank" rel="noopener noreferrer">View Online</a> : '-'}
              </Descriptions.Item>
            </Descriptions>
          </Col>
          <Col span={12}>
            <Descriptions column={1} size="small" bordered labelStyle={{ width: 120 }}>
              <Descriptions.Item label="Created">
                {invoice.MetaData?.CreateTime ? new Date(invoice.MetaData.CreateTime).toLocaleString() : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Last Updated">
                {invoice.MetaData?.LastUpdatedTime ? new Date(invoice.MetaData.LastUpdatedTime).toLocaleString() : '-'}
              </Descriptions.Item>
            </Descriptions>
          </Col>
        </Row>
      </Card>
    </Modal>
  );
}

const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.split(' ');
  return parts.length === 1 ? parts[0][0] : (parts[0][0] + parts[parts.length - 1][0]);
};

export default function InvoicePanel({ aiInvoices, allInvoices, onShowAll, refreshTrigger }) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [emailModal, setEmailModal] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(0);

  useEffect(() => {
    console.log('InvoicePanel useEffect triggered:', { aiInvoices, allInvoices, showAll });
    
    if (aiInvoices && Array.isArray(aiInvoices)) {
      console.log('Setting invoices from aiInvoices:', aiInvoices.length);
      setInvoices(aiInvoices);
      setShowAll(false);
    } else if (showAll && allInvoices && Array.isArray(allInvoices)) {
      console.log('Setting invoices from allInvoices:', allInvoices.length);
      setInvoices(allInvoices);
    } else {
      console.log('No specific invoices to show, loading all invoices...');
      // If no specific invoices are provided, load all invoices
      loadInvoices();
    }
    // eslint-disable-next-line
  }, [aiInvoices, allInvoices, showAll]);

  // Handle refresh triggers
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > lastRefresh) {
      console.log('Refresh trigger detected, loading fresh data...');
      setLastRefresh(refreshTrigger);
      if (!aiInvoices && !showAll) {
        loadInvoices();
      }
    }
  }, [refreshTrigger, lastRefresh, aiInvoices, showAll]);

  // Add a separate effect to handle manual refreshes
  useEffect(() => {
    // This will trigger when the component is re-mounted due to key change
    console.log('InvoicePanel component refreshed, loading fresh data...');
    if (!aiInvoices && !showAll) {
      loadInvoices();
    }
  }, []); // Empty dependency array means this runs once on mount

  const handleShowAllClick = () => {
    setShowAll(true);
    if (onShowAll) onShowAll();
    // Refresh data from the /invoices endpoint
    loadInvoices();
  };

  const loadInvoices = async () => {
    console.log('Loading invoices from API...');
    setLoading(true);
    try {
      const data = await fetchInvoices();
      console.log('Loaded invoices:', data.length);
      setInvoices(data);
    } catch (e) {
      console.error('Failed to load invoices:', e);
      message.error(e.message);
    }
    setLoading(false);
  };

  const handleView = async (record) => {
    setLoading(true);
    try {
      const data = await fetchInvoice(record.Id);
      setSelected(data);
    } catch (e) {
      message.error(e.message);
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    setLoading(true);
    try {
      await deleteInvoice(id);
      message.success('Invoice deleted');
      loadInvoices();
    } catch (e) {
      message.error(e.message);
    }
    setLoading(false);
  };

  const handleEmail = (record) => {
    setSelected(record);
    setEmailModal(true);
  };

  const handleSendEmail = async (email) => {
    setEmailLoading(true);
    try {
      await emailInvoice(selected.Id, email);
      message.success('Invoice sent');
      setEmailModal(false);
    } catch (e) {
      message.error(e.message);
    }
    setEmailLoading(false);
  };

  const columns = [
    {
      title: 'Invoice #',
      dataIndex: 'DocNumber',
      key: 'DocNumber',
      render: (text, record) => (
        <div style={{ fontWeight: 700, color: '#1677ff', fontSize: 16 }}>{text}
          <div style={{ fontSize: '12px', color: '#888', fontWeight: 400 }}>ID: {record.Id}</div>
        </div>
      )
    },
    {
      title: 'Customer',
      dataIndex: ['CustomerRef', 'name'],
      key: 'CustomerRef',
      render: (text, record) => {
        const email = record.BillEmail?.Address;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Avatar style={{ background: '#e6f0fa', color: '#1677ff', fontWeight: 600 }} size={32}>
              {getInitials(text)}
            </Avatar>
            <div>
              <Tooltip title={text}><div style={{ fontWeight: 500, maxWidth: 120, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{text || 'N/A'}</div></Tooltip>
              {email && <Tooltip title={email}><div style={{ fontSize: 12, color: '#888', maxWidth: 120, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{email}</div></Tooltip>}
            </div>
          </div>
        );
      }
    },
    {
      title: 'Date',
      dataIndex: 'TxnDate',
      key: 'TxnDate',
      render: (text) => text ? new Date(text).toLocaleDateString() : 'N/A'
    },
    {
      title: 'Due Date',
      dataIndex: 'DueDate',
      key: 'DueDate',
      render: (text) => text ? new Date(text).toLocaleDateString() : 'N/A'
    },
    {
      title: 'Total',
      dataIndex: 'TotalAmt',
      key: 'TotalAmt',
      render: (v) => <span style={{ fontWeight: 600 }}>${v ? parseFloat(v).toFixed(2) : '0.00'}</span>,
      align: 'right'
    },
    {
      title: 'Balance',
      dataIndex: 'Balance',
      key: 'Balance',
      render: (v) => `$${v ? parseFloat(v).toFixed(2) : '0.00'}`,
      align: 'right'
    },
    {
      title: 'Status',
      key: 'Status',
      render: (_, record) => {
        const balance = parseFloat(record.Balance || 0);
        const total = parseFloat(record.TotalAmt || 0);
        let status = 'Unknown';
        let color = 'default';
        if (balance === 0) { status = 'Paid'; color = 'success'; }
        else if (balance < total) { status = 'Partial'; color = 'warning'; }
        else if (balance === total) { status = 'Unpaid'; color = 'error'; }
        return <Tag color={color} style={{ fontWeight: 500 }}>{status}</Tag>;
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button icon={<EyeOutlined />} onClick={() => handleView(record)} size="small" style={{ borderRadius: 6 }}>View</Button>
          <Popconfirm title="Delete invoice?" onConfirm={() => handleDelete(record.Id)} okText="Yes" cancelText="No">
            <Button icon={<DeleteOutlined />} danger size="small" style={{ borderRadius: 6 }}>Delete</Button>
          </Popconfirm>
          <Button icon={<MailOutlined />} onClick={() => handleEmail(record)} size="small" style={{ borderRadius: 6 }}>Email</Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="invoice-panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Title level={5} style={{ color: '#1677ff', margin: 0, marginLeft: 32 }}>Invoices</Title>
        <div>
          <Button onClick={handleShowAllClick} style={{ marginRight: 32 }}>Show All Invoices</Button>
        </div>
      </div>
      <div style={{ width: '100%', overflowX: 'auto', padding: '0 32px' }}>
        <Table
          dataSource={invoices}
          columns={columns}
          rowKey="Id"
          loading={loading}
          pagination={{ pageSize: 6 }}
          style={{ width: '100%', borderRadius: 0, boxShadow: 'none', marginBottom: 8, background: '#f4faff' }}
          size="middle"
          onRow={record => ({ onClick: () => setSelected(record) })}
          rowClassName={(_, idx) => idx % 2 === 0 ? 'zebra-row' : ''}
          locale={{ emptyText: <Empty description={showAll ? 'No invoices found.' : 'No invoices to display. Use AI or click Show All.'} /> }}
        />
      </div>
      <EmailModal
        visible={emailModal}
        onCancel={() => setEmailModal(false)}
        onSend={handleSendEmail}
        loading={emailLoading}
      />
      <InvoiceDetailModal
        invoice={selected}
        visible={!!selected && !emailModal}
        onClose={() => setSelected(null)}
      />
    </div>
  );
} 
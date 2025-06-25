const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:3000';

// Invoice APIs
export async function fetchInvoices() {
  const res = await fetch(`${API_BASE}/invoices`);
  if (!res.ok) throw new Error('Failed to fetch invoices');
  return res.json();
}

export async function fetchInvoice(id) {
  const res = await fetch(`${API_BASE}/invoices/${id}`);
  if (!res.ok) throw new Error('Failed to fetch invoice');
  return res.json();
}

export async function createInvoice(invoice) {
  const res = await fetch(`${API_BASE}/invoices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(invoice),
  });
  if (!res.ok) throw new Error('Failed to create invoice');
  return res.json();
}

export async function updateInvoice(id, invoice) {
  const res = await fetch(`${API_BASE}/invoices/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(invoice),
  });
  if (!res.ok) throw new Error('Failed to update invoice');
  return res.json();
}

export async function deleteInvoice(id) {
  const res = await fetch(`${API_BASE}/invoices/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete invoice');
  return res.json();
}

export async function emailInvoice(id, email) {
  const res = await fetch(`${API_BASE}/invoices/${id}/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) throw new Error('Failed to email invoice');
  return res.json();
}

// AI Chat API (non-streaming)
export async function invokeAI({ messages, toolChoice = 'auto', maxSteps = 5, model }) {
  const res = await fetch(`${API_BASE}/ai/invoke`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, toolChoice, maxSteps, model }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to get AI response');
  }
  return await res.json();
}

// AI Chat API (streaming)
export async function streamAIChat({ messages, toolChoice = 'auto', maxSteps = 5, model, onChunk }) {
  const res = await fetch(`${API_BASE}/ai/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, toolChoice, maxSteps, model }),
  });
  
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to get AI response');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (onChunk) {
              onChunk(data);
            }
          } catch (e) {
            console.warn('Failed to parse chunk:', line);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
} 
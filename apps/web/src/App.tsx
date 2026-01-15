import { useState, useEffect } from 'react';

interface UIDirective {
  assistant_message: string;
  ui_directives: {
    show_blocks: string[];
    hide_blocks: string[];
    cta?: {
      label: string;
      action: string;
      payload?: any;
    };
    prefill_form?: Record<string, any>;
  };
  lead_patch?: Record<string, any>;
  next_action?: string;
}

function App() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [uiDirective, setUIDirective] = useState<UIDirective | null>(null);

  // Start session on mount
  useEffect(() => {
    fetch('/api/session/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
      .then((res) => res.json())
      .then((data) => {
        setSessionId(data.sessionId);
      })
      .catch((err) => console.error('Failed to start session:', err));
  }, []);

  const handleSend = async () => {
    if (!input.trim() || !sessionId || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      // Track event
      await fetch('/api/event/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          type: 'user_message',
          payload: { message: userMessage },
        }),
      });

      // Get agent response
      const response = await fetch('/api/agent/next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          userMessage,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const directive: UIDirective = await response.json();
      setUIDirective(directive);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: directive.assistant_message },
      ]);
    } catch (error) {
      console.error('Error:', error);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Omlouvám se, došlo k chybě.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h1 style={{ marginBottom: '20px' }}>AI Toolkit Demo</h1>

      <div
        style={{
          background: 'white',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '20px',
          minHeight: '400px',
          maxHeight: '500px',
          overflowY: 'auto',
        }}
      >
        {messages.length === 0 && (
          <p style={{ color: '#666' }}>Začněte konverzaci...</p>
        )}
        {messages.map((msg, idx) => (
          <div
            key={idx}
            style={{
              marginBottom: '12px',
              padding: '10px',
              background: msg.role === 'user' ? '#e3f2fd' : '#f5f5f5',
              borderRadius: '8px',
              textAlign: msg.role === 'user' ? 'right' : 'left',
            }}
          >
            <strong>{msg.role === 'user' ? 'Vy' : 'Asistent'}:</strong> {msg.content}
          </div>
        ))}
        {loading && (
          <div style={{ color: '#666', fontStyle: 'italic' }}>Přemýšlím...</div>
        )}
      </div>

      {uiDirective && (
        <div
          style={{
            background: '#fff3cd',
            border: '1px solid #ffc107',
            borderRadius: '8px',
            padding: '15px',
            marginBottom: '20px',
          }}
        >
          <h3>UI Directives:</h3>
          <p>
            <strong>Show blocks:</strong> {uiDirective.ui_directives.show_blocks.join(', ') || 'none'}
          </p>
          <p>
            <strong>Hide blocks:</strong> {uiDirective.ui_directives.hide_blocks.join(', ') || 'none'}
          </p>
          {uiDirective.ui_directives.cta && (
            <p>
              <strong>CTA:</strong> {uiDirective.ui_directives.cta.label} ({uiDirective.ui_directives.cta.action})
            </p>
          )}
          {uiDirective.next_action && (
            <p>
              <strong>Next action:</strong> {uiDirective.next_action}
            </p>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Napište zprávu..."
          style={{
            flex: 1,
            padding: '10px',
            border: '1px solid #ddd',
            borderRadius: '4px',
          }}
          disabled={loading || !sessionId}
        />
        <button
          onClick={handleSend}
          disabled={loading || !sessionId}
          style={{
            padding: '10px 20px',
            background: '#1976d2',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading || !sessionId ? 'not-allowed' : 'pointer',
          }}
        >
          Odeslat
        </button>
      </div>
    </div>
  );
}

export default App;

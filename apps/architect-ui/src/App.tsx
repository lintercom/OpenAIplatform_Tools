/**
 * Architect UI
 * 
 * Main application component
 */

import { useState, useEffect } from 'react';
import './App.css';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  question?: any;
}

interface Artifacts {
  blueprint?: any;
  topology?: any;
  workflows?: any;
  plan?: any;
  adrs?: any[];
}

function App() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [artifacts, setArtifacts] = useState<Artifacts | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'blueprint' | 'topology' | 'workflows' | 'plan' | 'adrs'>('plan');
  const [apiKey, setApiKey] = useState('');
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);

  // Initialize session
  useEffect(() => {
    if (!sessionId) {
      fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
        .then((res) => res.json())
        .then((data) => {
          setSessionId(data.sessionId);
          setHasApiKey(data.hasApiKey || false);
          if (!data.hasApiKey) {
            setShowApiKeyDialog(true);
          }
          setMessages([
            {
              id: '1',
              role: 'assistant',
              content: data.hasApiKey
                ? 'Ahoj! Jsem Architect - nástroj pro plánování systémové architektury. Pomůžu ti navrhnout systém postavený na tool-first architektuře. Začneme?'
                : 'Ahoj! Jsem Architect. Nejdřív potřebuji nastavit OpenAI API key. Klikni na tlačítko "Nastavit API Key" výše.',
            },
          ]);
        });
    }
  }, [sessionId]);

  // Check API key status
  useEffect(() => {
    if (sessionId && !hasApiKey) {
      fetch(`/api/sessions/${sessionId}/api-key-status`)
        .then((res) => res.json())
        .then((data) => {
          setHasApiKey(data.hasApiKey);
        });
    }
  }, [sessionId, hasApiKey]);

  const saveApiKey = async () => {
    if (!apiKey.trim() || !sessionId) return;

    try {
      const response = await fetch(`/api/sessions/${sessionId}/api-key`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
      });

      if (response.ok) {
        setHasApiKey(true);
        setShowApiKeyDialog(false);
        setApiKey('');
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'assistant',
            content: '✅ API key uložena! Nyní můžeme začít. Popiš mi, co chceš vytvořit.',
          },
        ]);
      } else {
        alert('Chyba při ukládání API key');
      }
    } catch (error) {
      console.error('Error saving API key:', error);
      alert('Chyba při ukládání API key');
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !sessionId || loading) return;

    if (!hasApiKey) {
      setShowApiKeyDialog(true);
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch(`/api/sessions/${sessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input }),
      });

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        question: data.question,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (data.artifacts) {
        setArtifacts(data.artifacts);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportArtifacts = async (format: 'json' | 'markdown') => {
    if (!sessionId || !artifacts) return;

    const response = await fetch(`/api/sessions/${sessionId}/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ format }),
    });

    const data = await response.json();

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'architect-plan.json';
      a.click();
    } else {
      const blob = new Blob([data.markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'architect-plan.md';
      a.click();
    }
  };

  return (
    <div className="app">
      {showApiKeyDialog && (
        <div className="api-key-dialog-overlay">
          <div className="api-key-dialog">
            <h2>Nastavit OpenAI API Key</h2>
            <p>Pro fungování Architect potřebuji OpenAI API key.</p>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="api-key-input"
            />
            <div className="api-key-buttons">
              <button onClick={saveApiKey} disabled={!apiKey.trim()}>
                Uložit
              </button>
              <button onClick={() => setShowApiKeyDialog(false)}>Zrušit</button>
            </div>
          </div>
        </div>
      )}

      <div className="chat-panel">
        <div className="chat-header">
          <h1>Architect</h1>
          {!hasApiKey && (
            <button
              className="api-key-button"
              onClick={() => setShowApiKeyDialog(true)}
            >
              Nastavit API Key
            </button>
          )}
        </div>
        <div className="chat-messages">
          {messages.map((msg) => (
            <div key={msg.id} className={`message ${msg.role}`}>
              <div className="message-content">{msg.content}</div>
              {msg.question && (
                <div className="question-hint">
                  <small>Odpovězte na otázku výše</small>
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="message assistant">
              <div className="message-content">Generuji...</div>
            </div>
          )}
        </div>
        <div className="chat-input">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Napište zprávu..."
            disabled={loading}
          />
          <button onClick={sendMessage} disabled={loading || !input.trim()}>
            Odeslat
          </button>
        </div>
      </div>

      <div className="artifacts-panel">
        <div className="artifacts-header">
          <div className="tabs">
            <button
              className={activeTab === 'blueprint' ? 'active' : ''}
              onClick={() => setActiveTab('blueprint')}
            >
              Blueprint
            </button>
            <button
              className={activeTab === 'topology' ? 'active' : ''}
              onClick={() => setActiveTab('topology')}
            >
              Tool Topology
            </button>
            <button
              className={activeTab === 'workflows' ? 'active' : ''}
              onClick={() => setActiveTab('workflows')}
            >
              Workflows
            </button>
            <button
              className={activeTab === 'plan' ? 'active' : ''}
              onClick={() => setActiveTab('plan')}
            >
              Implementation Plan
            </button>
            <button
              className={activeTab === 'adrs' ? 'active' : ''}
              onClick={() => setActiveTab('adrs')}
            >
              ADRs
            </button>
          </div>
          {artifacts && (
            <div className="export-buttons">
              <button onClick={() => exportArtifacts('json')}>Export JSON</button>
              <button onClick={() => exportArtifacts('markdown')}>Export Markdown</button>
            </div>
          )}
        </div>
        <div className="artifacts-content">
          {!artifacts ? (
            <div className="empty-state">
              <p>Artifakty se zobrazí po vygenerování plánu</p>
            </div>
          ) : (
            <div className="artifact-view">
              {activeTab === 'plan' && artifacts.plan && (
                <pre>{JSON.stringify(artifacts.plan, null, 2)}</pre>
              )}
              {activeTab === 'topology' && artifacts.topology && (
                <pre>{JSON.stringify(artifacts.topology, null, 2)}</pre>
              )}
              {activeTab === 'workflows' && artifacts.workflows && (
                <pre>{JSON.stringify(artifacts.workflows, null, 2)}</pre>
              )}
              {activeTab === 'adrs' && artifacts.adrs && (
                <pre>{JSON.stringify(artifacts.adrs, null, 2)}</pre>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;

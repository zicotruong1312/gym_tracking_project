import { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import { sendChatMessage } from '../services/chatService';

function ChatAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Xin chào! Tôi là HealthFlow Coach. Hỏi về dinh dưỡng, tập luyện hoặc giấc ngủ nhé.' },
  ]);
  const listRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || busy) return;
    const nextHistory = [...messages, { role: 'user', content: text }];
    setMessages(nextHistory);
    setInput('');
    setBusy(true);
    try {
      const res = await sendChatMessage(text, nextHistory.filter((m) => m.role === 'user' || m.role === 'assistant'));
      const reply = res.data?.data?.reply || 'Không có phản hồi.';
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch {
      toast.error('Không gửi được tin nhắn');
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Lỗi mạng hoặc server. Thử lại sau.' }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="healthflow-chat-fab"
        title="HealthFlow Coach (AI)"
        aria-label="Mở trợ lý AI"
        onClick={() => setOpen((v) => !v)}
      >
        <i className="bi bi-chat-dots-fill" />
      </button>

      {open && (
        <div className="healthflow-chat-panel" role="dialog" aria-label="HealthFlow Coach">
          <div className="healthflow-chat-header">
            <div className="healthflow-chat-title">HealthFlow Coach</div>
            <button type="button" className="healthflow-chat-close" aria-label="Đóng" onClick={() => setOpen(false)}>
              <i className="bi bi-x-lg" />
            </button>
          </div>
          <div className="healthflow-chat-messages" ref={listRef}>
            {messages.map((m, i) => (
              <div key={i} className={`healthflow-chat-bubble healthflow-chat-bubble--${m.role}`}>
                {m.content}
              </div>
            ))}
            {busy && <div className="healthflow-chat-bubble healthflow-chat-bubble--assistant">Đang trả lời…</div>}
          </div>
          <div className="healthflow-chat-input-row">
            <input
              type="text"
              className="healthflow-chat-input"
              placeholder="Hỏi về calo, tập, ngủ…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              disabled={busy}
            />
            <button type="button" className="healthflow-chat-send" onClick={handleSend} disabled={busy}>
              <i className="bi bi-send-fill" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default ChatAssistant;

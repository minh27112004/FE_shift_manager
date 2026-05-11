import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bot, Send, Sparkles, Calendar, Clock, User,
  Mic, Paperclip, MoreHorizontal, ThumbsUp, ThumbsDown, RefreshCw, ClipboardList
} from 'lucide-react';
import { cn } from '../lib/utils';
import api from '../lib/axios';

const SESSION_KEY = 'chatbot_session_id';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const WELCOME_MSG: Message = {
  id: '1',
  role: 'assistant',
  content: 'Xin chào! Tôi là ShiftMate AI. Tôi có thể giúp bạn:\n• Xem lịch làm việc của bạn\n• Tìm và đăng ký ca trống\n• Tra cứu lịch sử chấm công\n\nHôm nay tôi có thể giúp gì cho bạn?',
  timestamp: new Date(),
};

export default function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MSG]);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Restore session từ localStorage khi mount
  useEffect(() => {
    const savedId = localStorage.getItem(SESSION_KEY);
    api.get('chatbot/history/', savedId ? { params: { session_id: savedId } } : {})
      .then(res => {
        const { session_id, messages: history } = res.data;
        if (session_id) {
          setSessionId(session_id);
          localStorage.setItem(SESSION_KEY, String(session_id));
        }
        if (history && history.length > 0) {
          setMessages(history.map((m: any, i: number) => ({
            id: String(i),
            role: m.role as 'user' | 'assistant',
            content: m.content,
            timestamp: new Date(m.created_at),
          })));
        }
      })
      .catch(() => { /* không có history — giữ welcome msg */ })
      .finally(() => setIsLoadingHistory(false));
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userText = input.trim();
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'user',
      content: userText,
      timestamp: new Date(),
    }]);
    setInput('');
    setIsTyping(true);

    try {
      const res = await api.post('chatbot/chat/', {
        message: userText,
        session_id: sessionId,
      });

      const { reply, session_id } = res.data;
      if (session_id) {
        setSessionId(session_id);
        localStorage.setItem(SESSION_KEY, String(session_id));
      }

      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: reply || 'Xin lỗi, tôi không thể xử lý yêu cầu này.',
        timestamp: new Date(),
      }]);
    } catch {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Đã có lỗi xảy ra. Vui lòng thử lại sau.',
        timestamp: new Date(),
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleReset = async () => {
    if (sessionId) {
      await api.post('chatbot/reset/', { session_id: sessionId }).catch(() => {});
    }
    localStorage.removeItem(SESSION_KEY);
    setSessionId(null);
    setMessages([{ ...WELCOME_MSG, id: Date.now().toString(), timestamp: new Date() }]);
  };

  const suggestions = [
    { icon: Calendar,      text: 'Lịch làm việc tuần này của tôi' },
    { icon: Clock,         text: 'Có ca trống nào tuần này không?' },
    { icon: ClipboardList, text: 'Lịch sử chấm công tháng này' },
    { icon: Sparkles,      text: 'Tôi đã làm bao nhiêu giờ tháng này?' },
  ];

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col bg-[#fcf8f9]">
      {/* Header */}
      <div className="p-6 border-b border-slate-100 bg-white flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 bg-gradient-to-br from-[#005ac2] to-[#5f5c78] rounded-2xl flex items-center justify-center shadow-lg shadow-[#005ac2]/20">
            <Bot className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900 tracking-tight">Trợ lý ShiftMate AI</h1>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Đang trực tuyến</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            title="Bắt đầu cuộc trò chuyện mới"
            className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
          <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
            <MoreHorizontal className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Chat Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-8 scroll-smooth">
        {isLoadingHistory && (
          <div className="flex gap-4 mr-auto">
            <div className="h-10 w-10 rounded-xl bg-slate-200 shrink-0 animate-pulse" />
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-slate-200 rounded-xl w-48 animate-pulse" />
              <div className="h-4 bg-slate-200 rounded-xl w-32 animate-pulse" />
            </div>
          </div>
        )}
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={cn(
                "flex gap-4 max-w-3xl",
                msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
              )}
            >
              <div className={cn(
                "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
                msg.role === 'user' ? "bg-white text-slate-400" : "bg-[#005ac2] text-white"
              )}>
                {msg.role === 'user' ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
              </div>

              <div className="space-y-2">
                <div className={cn(
                  "p-4 rounded-2xl text-sm leading-relaxed shadow-sm whitespace-pre-wrap",
                  msg.role === 'user'
                    ? "bg-[#005ac2] text-white rounded-tr-none"
                    : "bg-white text-slate-700 rounded-tl-none border border-slate-100"
                )}>
                  {msg.content}
                </div>
                <div className={cn(
                  "flex items-center gap-3 px-1",
                  msg.role === 'user' ? "justify-end" : "justify-start"
                )}>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {msg.role === 'assistant' && (
                    <div className="flex gap-2">
                      <button className="text-slate-300 hover:text-[#005ac2] transition-colors"><ThumbsUp className="h-3 w-3" /></button>
                      <button className="text-slate-300 hover:text-red-500 transition-colors"><ThumbsDown className="h-3 w-3" /></button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isTyping && (
          <div className="flex gap-4 mr-auto">
            <div className="h-10 w-10 rounded-xl bg-[#005ac2] text-white flex items-center justify-center shrink-0 shadow-sm">
              <Bot className="h-5 w-5" />
            </div>
            <div className="bg-white border border-slate-100 p-4 rounded-2xl rounded-tl-none shadow-sm flex gap-1 items-center">
              <span className="w-1.5 h-1.5 bg-[#005ac2] rounded-full animate-bounce"></span>
              <span className="w-1.5 h-1.5 bg-[#005ac2] rounded-full animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-1.5 h-1.5 bg-[#005ac2] rounded-full animate-bounce [animation-delay:0.4s]"></span>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-6 shrink-0">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-wrap gap-2 mb-4">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => setInput(s.text)}
                className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:border-[#005ac2] hover:text-[#005ac2] transition-all flex items-center gap-2 shadow-sm"
              >
                <s.icon className="h-3.5 w-3.5" />
                {s.text}
              </button>
            ))}
          </div>

          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2">
              <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                <Paperclip className="h-5 w-5" />
              </button>
            </div>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Hỏi tôi về lịch làm, ca trống, chấm công..."
              className="w-full pl-14 pr-24 py-5 bg-white border border-slate-200 rounded-2xl text-sm font-medium shadow-xl shadow-slate-200/50 focus:outline-none focus:ring-4 focus:ring-[#005ac2]/10 focus:border-[#005ac2] transition-all"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <button className="p-2 text-slate-400 hover:text-[#005ac2] transition-colors">
                <Mic className="h-5 w-5" />
              </button>
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className={cn(
                  "h-10 w-10 rounded-xl flex items-center justify-center transition-all",
                  input.trim() ? "bg-[#005ac2] text-white shadow-lg shadow-[#005ac2]/20" : "bg-slate-100 text-slate-300"
                )}
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          </div>
          <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-4">
            ShiftMate AI có thể mắc sai sót. Hãy kiểm tra lại các thông tin quan trọng.
          </p>
        </div>
      </div>
    </div>
  );
}

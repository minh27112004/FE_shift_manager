import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bot, 
  Send, 
  Sparkles, 
  Calendar, 
  Clock, 
  User, 
  Mic, 
  Paperclip,
  MoreHorizontal,
  ThumbsUp,
  ThumbsDown,
  RefreshCw
} from 'lucide-react';
import { cn } from '../lib/utils';
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { useShifts } from '../context/ShiftContext';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || '' });

const createShiftTool: FunctionDeclaration = {
  name: "createShift",
  description: "Tạo một ca làm việc mới trong lịch trình.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      name: {
        type: Type.STRING,
        description: "Tên nhân viên hoặc tên ca làm (ví dụ: 'Nguyễn Văn A' hoặc 'Ca Sáng')",
      },
      date: {
        type: Type.STRING,
        description: "Ngày làm việc theo định dạng YYYY-MM-DD",
      },
      time: {
        type: Type.STRING,
        description: "Khoảng thời gian (ví dụ: '08:00 - 16:00')",
      },
      type: {
        type: Type.STRING,
        enum: ['primary', 'tertiary', 'error'],
        description: "Loại ca làm: 'primary' (mặc định), 'tertiary' (phụ), 'error' (khẩn cấp)",
      },
      label: {
        type: Type.STRING,
        description: "Nhãn hiển thị chi tiết (ví dụ: 'Ca sáng · 8:00–12:00 · 3/3')",
      }
    },
    required: ["name", "date", "time", "label"],
  },
};

export default function AIAssistant() {
  const { addShift } = useShifts();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Xin chào! Tôi là ShiftMate AI. Tôi có thể giúp bạn quản lý ca làm, kiểm tra lịch trình hoặc giải đáp các thắc mắc về bảng lương. Hôm nay tôi có thể giúp gì cho bạn?',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: [
          ...messages.map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }]
          })),
          { role: 'user', parts: [{ text: input }] }
        ],
        config: {
          systemInstruction: `Bạn là trợ lý ShiftMate AI chuyên nghiệp. 
          Ngày hiện tại là ${new Date().toISOString().split('T')[0]}.
          Bạn có khả năng tạo ca làm việc mới bằng công cụ createShift.
          Khi người dùng yêu cầu đăng ký hoặc tạo ca làm, hãy thu thập đủ thông tin: tên, ngày, giờ và nhãn chi tiết.
          Nếu thiếu thông tin, hãy hỏi lại người dùng một cách lịch sự.
          Sau khi gọi hàm createShift thành công, hãy xác nhận với người dùng rằng ca làm đã được thêm vào lịch.`,
          tools: [{ functionDeclarations: [createShiftTool] }],
        }
      });

      const functionCalls = response.functionCalls;
      if (functionCalls) {
        for (const call of functionCalls) {
          if (call.name === "createShift") {
            const args = call.args as any;
            addShift({
              name: args.name,
              date: args.date,
              time: args.time,
              type: args.type || 'primary',
              label: args.label
            });
            
            // Send a follow-up to confirm
            const confirmResponse = await ai.models.generateContent({
              model: "gemini-3.1-pro-preview",
              contents: [
                { role: 'user', parts: [{ text: input }] },
                { role: 'model', parts: [{ text: "Đang tạo ca làm..." }] },
                { role: 'user', parts: [{ text: `Hệ thống đã thực hiện hàm createShift với các tham số: ${JSON.stringify(args)}. Hãy xác nhận với người dùng.` }] }
              ]
            });

            const assistantMessage: Message = {
              id: Date.now().toString(),
              role: 'assistant',
              content: confirmResponse.text || "Tôi đã thêm ca làm việc vào lịch cho bạn rồi nhé!",
              timestamp: new Date()
            };
            setMessages(prev => [...prev, assistantMessage]);
          }
        }
      } else {
        const assistantMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: response.text || "Xin lỗi, tôi không thể xử lý yêu cầu này ngay bây giờ.",
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error("AI Error:", error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: "Đã có lỗi xảy ra khi kết nối với trí tuệ nhân tạo. Vui lòng thử lại sau.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const suggestions = [
    { icon: Calendar, text: 'Lịch làm việc tuần này của tôi' },
    { icon: Clock, text: 'Đăng ký ca sáng cho Nguyễn Văn A vào ngày 2023-10-25' },
    { icon: Sparkles, text: 'Gợi ý tối ưu hóa lịch trình' }
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
          <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
            <RefreshCw className="h-5 w-5" />
          </button>
          <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
            <MoreHorizontal className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Chat Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-8 scroll-smooth"
      >
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
                  "p-4 rounded-2xl text-sm leading-relaxed shadow-sm",
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
            <div className="bg-white border border-slate-100 p-4 rounded-2xl rounded-tl-none shadow-sm flex gap-1">
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
          {/* Suggestions */}
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
            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                <Paperclip className="h-5 w-5" />
              </button>
            </div>
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Hỏi tôi bất cứ điều gì về lịch trình của bạn..." 
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

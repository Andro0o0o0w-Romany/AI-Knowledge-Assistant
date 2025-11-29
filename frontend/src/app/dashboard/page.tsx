"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Loader2,
  Bot,
  User,
  Sparkles,
  FileText,
  ChevronDown,
  ChevronUp,
  Trash2,
  Clock,
  AlertCircle,
} from "lucide-react";
import { chatApi, documentsApi, ChatHistoryItem, SourceDocument } from "@/lib/api";
import { cn, formatRelativeTime, truncateText } from "@/lib/utils";
import toast from "react-hot-toast";

interface Message {
  id?: number;
  question: string;
  answer: string;
  sources?: SourceDocument[] | null;
  processing_time?: number | null;
  created_at?: string;
  isStreaming?: boolean;
}

export default function ChatPage() {
  const queryClient = useQueryClient();
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [expandedSources, setExpandedSources] = useState<Set<number>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Fetch documents count
  const { data: docsData } = useQuery({
    queryKey: ["documents"],
    queryFn: documentsApi.list,
  });

  // Fetch chat history
  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ["chatHistory"],
    queryFn: () => chatApi.getHistory(50),
  });

  // Load history into messages (reverse to show oldest first, newest at bottom)
  useEffect(() => {
    if (historyData?.messages) {
      setMessages(
        [...historyData.messages].reverse().map((msg) => ({
          id: msg.id,
          question: msg.question,
          answer: msg.answer,
          sources: msg.sources,
          processing_time: msg.processing_time,
          created_at: msg.created_at,
        }))
      );
    }
  }, [historyData]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Ask mutation
  const askMutation = useMutation({
    mutationFn: chatApi.ask,
    onMutate: (question) => {
      // Add optimistic message at the end (bottom of chat)
      const optimisticMessage: Message = {
        question,
        answer: "",
        isStreaming: true,
      };
      setMessages((prev) => [...prev, optimisticMessage]);
    },
    onSuccess: (data) => {
      // Replace optimistic message with real response (last message)
      setMessages((prev) => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = {
          question: data.question,
          answer: data.answer,
          sources: data.sources,
          processing_time: data.processing_time,
          isStreaming: false,
        };
        return newMessages;
      });
      queryClient.invalidateQueries({ queryKey: ["chatHistory"] });
    },
    onError: (error: any) => {
      // Remove optimistic message (last one)
      setMessages((prev) => prev.slice(0, -1));
      const message =
        error.response?.data?.detail || "Failed to get answer. Please try again.";
      toast.error(message);
    },
  });

  // Clear history mutation
  const clearHistoryMutation = useMutation({
    mutationFn: chatApi.clearHistory,
    onSuccess: () => {
      setMessages([]);
      queryClient.invalidateQueries({ queryKey: ["chatHistory"] });
      toast.success("Chat history cleared");
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || askMutation.isPending) return;

    const trimmedQuestion = question.trim();
    setQuestion("");
    askMutation.mutate(trimmedQuestion);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const toggleSources = (index: number) => {
    setExpandedSources((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const hasDocuments = (docsData?.total ?? 0) > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex-none bg-background-secondary border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-accent" />
              AI Assistant
            </h1>
            <p className="text-sm text-text-muted mt-1">
              Ask questions about your uploaded documents
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-text-muted">Knowledge base</p>
              <p className="font-medium text-accent">
                {docsData?.total_embeddings ?? 0} embeddings
              </p>
            </div>
            {messages.length > 0 && (
              <button
                onClick={() => clearHistoryMutation.mutate()}
                disabled={clearHistoryMutation.isPending}
                className="btn-ghost text-text-muted hover:text-error"
                title="Clear history"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6">
        {!hasDocuments && messages.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-full text-center"
          >
            <div className="p-4 bg-warning/10 rounded-2xl mb-4">
              <AlertCircle className="w-8 h-8 text-warning" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No documents uploaded</h2>
            <p className="text-text-secondary max-w-md mb-6">
              Upload some documents first to start asking questions. The AI will
              use your documents to provide accurate answers.
            </p>
            <a href="/dashboard/documents" className="btn-primary">
              Upload Documents
            </a>
          </motion.div>
        ) : messages.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-full text-center"
          >
            <div className="p-4 bg-accent/10 rounded-2xl mb-4">
              <Bot className="w-8 h-8 text-accent" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Start a conversation</h2>
            <p className="text-text-secondary max-w-md">
              Ask anything about your uploaded documents. The AI will search
              through your knowledge base and provide relevant answers.
            </p>
          </motion.div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-6">
            <AnimatePresence mode="popLayout">
              {messages.map((message, index) => (
                <motion.div
                  key={message.id || index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-4"
                >
                  {/* Question */}
                  <div className="flex gap-3 justify-end">
                    <div className="bg-accent/10 border border-accent/20 rounded-2xl rounded-tr-sm px-4 py-3 max-w-[80%]">
                      <p className="text-text-primary">{message.question}</p>
                    </div>
                    <div className="flex-none w-8 h-8 bg-accent/20 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-accent" />
                    </div>
                  </div>

                  {/* Answer */}
                  <div className="flex gap-3">
                    <div className="flex-none w-8 h-8 bg-surface-active rounded-full flex items-center justify-center">
                      <Bot className="w-4 h-4 text-text-secondary" />
                    </div>
                    <div className="flex-1 space-y-3">
                      <div className="bg-surface border border-border rounded-2xl rounded-tl-sm px-4 py-3">
                        {message.isStreaming ? (
                          <div className="flex items-center gap-2 text-text-muted">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Thinking...</span>
                          </div>
                        ) : (
                          <div className="prose prose-invert prose-sm max-w-none">
                            <p className="text-text-primary whitespace-pre-wrap">
                              {message.answer}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Metadata & Sources */}
                      {!message.isStreaming && (
                        <div className="flex items-center gap-4 text-sm text-text-muted">
                          {message.processing_time && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {message.processing_time.toFixed(2)}s
                            </span>
                          )}
                          {message.sources && message.sources.length > 0 && (
                            <button
                              onClick={() => toggleSources(index)}
                              className="flex items-center gap-1 hover:text-accent transition-colors"
                            >
                              <FileText className="w-3 h-3" />
                              {message.sources.length} sources
                              {expandedSources.has(index) ? (
                                <ChevronUp className="w-3 h-3" />
                              ) : (
                                <ChevronDown className="w-3 h-3" />
                              )}
                            </button>
                          )}
                          {message.created_at && (
                            <span>{formatRelativeTime(message.created_at)}</span>
                          )}
                        </div>
                      )}

                      {/* Expanded Sources */}
                      <AnimatePresence>
                        {expandedSources.has(index) &&
                          message.sources &&
                          message.sources.length > 0 && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="space-y-2 overflow-hidden"
                            >
                              {message.sources.map((source, sourceIndex) => (
                                <div
                                  key={sourceIndex}
                                  className="bg-surface-hover border border-border rounded-xl p-3"
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-accent">
                                      {source.document_name}
                                    </span>
                                    <span className="text-xs text-text-muted">
                                      {(source.relevance_score * 100).toFixed(0)}%
                                      match
                                    </span>
                                  </div>
                                  <p className="text-sm text-text-secondary">
                                    {truncateText(source.content, 300)}
                                  </p>
                                </div>
                              ))}
                            </motion.div>
                          )}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="flex-none bg-background-secondary border-t border-border p-4">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          <div className="relative">
            <textarea
              ref={inputRef}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                hasDocuments
                  ? "Ask a question about your documents..."
                  : "Upload documents first to ask questions"
              }
              disabled={!hasDocuments || askMutation.isPending}
              rows={1}
              className={cn(
                "input-field pr-14 resize-none min-h-[52px] max-h-32",
                !hasDocuments && "opacity-50 cursor-not-allowed"
              )}
            />
            <button
              type="submit"
              disabled={!question.trim() || !hasDocuments || askMutation.isPending}
              className={cn(
                "absolute right-2 top-1/2 -translate-y-1/2 p-2.5 rounded-lg transition-all duration-200",
                question.trim() && hasDocuments && !askMutation.isPending
                  ? "bg-accent text-white hover:bg-accent-light"
                  : "bg-surface-active text-text-muted"
              )}
            >
              {askMutation.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
          <p className="text-xs text-text-muted mt-2 text-center">
            Press Enter to send, Shift+Enter for new line
          </p>
        </form>
      </div>
    </div>
  );
}


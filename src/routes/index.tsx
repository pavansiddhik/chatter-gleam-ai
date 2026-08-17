import { createFileRoute } from "@tanstack/react-router";
import { useChat, type UIMessage } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { ArrowUp, Plus, RefreshCcw, Square } from "lucide-react";

const STORAGE_KEY = "ai-chat-messages";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AI Chat" },
      { name: "description", content: "Chat with an AI assistant" },
      { property: "og:title", content: "AI Chat" },
      { property: "og:description", content: "Chat with an AI assistant" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ChatPage,
});

function ChatPage() {
  const [chatKey, setChatKey] = useState(0);

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <span className="text-sm font-bold">AI</span>
          </div>
          <h1 className="text-lg font-semibold">AI Chat</h1>
        </div>
        <button
          onClick={() => {
            if (typeof window !== "undefined") {
              localStorage.removeItem(STORAGE_KEY);
            }
            setChatKey((k) => k + 1);
          }}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent"
        >
          <Plus className="h-4 w-4" />
          New chat
        </button>
      </header>
      <Chat key={chatKey} />
    </div>
  );
}

function Chat() {
  const [loaded, setLoaded] = useState(false);
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setInitialMessages(JSON.parse(stored));
      } catch {
        // ignore corrupt storage
      }
    }
    setLoaded(true);
  }, []);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (loaded) {
      textareaRef.current?.focus();
    }
  }, [loaded]);

  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/chat" }),
    []
  );

  const { messages, sendMessage, status, error, stop } = useChat({
    id: "ai-chat",
    messages: initialMessages,
    transport,
    onError: (err) => {
      console.error("Chat error:", err);
    },
  });

  useEffect(() => {
    if (status === "ready") {
      textareaRef.current?.focus();
    }
  }, [status]);

  useEffect(() => {
    if (!loaded) return;
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages, loaded]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  if (!loaded) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const isLoading = status === "submitted" || status === "streaming";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    await sendMessage({ text });
  };

  return (
    <>
      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-3xl space-y-6">
          {messages.length === 0 && (
            <div className="py-20 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <span className="text-lg font-bold">AI</span>
              </div>
              <h2 className="text-2xl font-semibold tracking-tight">What can I help you with?</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Ask anything and I&apos;ll do my best to answer.
              </p>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                <MessageContent message={message} />
              </div>
            </div>
          ))}

          {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-2xl bg-muted px-4 py-3 text-foreground">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" />
                  <div
                    className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground"
                    style={{ animationDelay: "0.15s" }}
                  />
                  <div
                    className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground"
                    style={{ animationDelay: "0.3s" }}
                  />
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="flex justify-center">
              <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <RefreshCcw className="h-4 w-4" />
                {error.message || "Something went wrong. Please try again."}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </main>

      <footer className="border-t border-border bg-background px-4 pb-4 pt-2">
        <form
          onSubmit={submit}
          className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-border bg-muted p-2 focus-within:ring-1 focus-within:ring-ring"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void submit(e);
              }
            }}
            placeholder="Ask a question..."
            rows={1}
            ref={textareaRef}
            className="max-h-40 min-h-[44px] flex-1 resize-none bg-transparent px-3 py-3 text-sm outline-none placeholder:text-muted-foreground"
            style={{ fieldSizing: "content" }}
            autoFocus
          />
          {isLoading ? (
            <button
              type="button"
              onClick={stop}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted-foreground/20 text-foreground transition-colors hover:bg-muted-foreground/30"
            >
              <Square className="h-4 w-4 fill-current" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          )}
        </form>
      </footer>
    </>
  );
}

function MessageContent({ message }: { message: UIMessage }) {
  const text = message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("");

  if (!text) return null;

  if (message.role === "user") {
    return <p className="whitespace-pre-wrap text-sm">{text}</p>;
  }

  return (
    <div className="prose prose-sm max-w-none text-sm dark:prose-invert">
      <ReactMarkdown>{text}</ReactMarkdown>
    </div>
  );
}

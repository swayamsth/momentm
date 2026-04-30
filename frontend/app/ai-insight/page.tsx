"use client";

import { useState } from "react";
import NavBar from "@/components/NavBar";
import Chat from "./Chat";

type AIResponse = {
  text: string;
};

export default function AIInsightPage() {
  const [response, setResponse] = useState<AIResponse | null>(null);
  const [chatMenuOpen, setChatMenuOpen] = useState(false);

  function handleChatResponse(data: AIResponse) {
    setResponse(data);
  }

  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="h-screen bg-zinc-950 flex flex-col overflow-hidden">
      <NavBar />
      <div className="flex flex-1 min-h-0 relative">
        {/* Fixed slim sidebar rail */}
        <aside className="w-14 shrink-0 border-r border-zinc-800 bg-secondary flex flex-col items-center py-4 z-30 relative">
          <button
            className="text-zinc-200 rounded-full p-2 hover:bg-zinc-800 transition"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
            </svg>
          </button>
          <button
            className="absolute bottom-4 h-9 w-9 flex items-center justify-center rounded-full bg-zinc-700 text-zinc-100 hover:bg-zinc-600 transition"
            aria-label="Settings"
            title="Settings"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 3v2.25m0 13.5V21m7.5-9.75h-2.25m-13.5 0H3m15.364-6.364l-1.591 1.591m-9.192 9.192l-1.591 1.591m12.02 0l-1.591-1.591m-9.192-9.192l-1.591-1.591" />
            </svg>
          </button>
        </aside>

        {/* Expandable menu panel */}
        <div className={`absolute left-14 top-0 h-full w-64 bg-secondary text-white border-r border-zinc-800 z-20 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="h-full flex flex-col justify-between py-6 px-4">
            <div>
              <button className="w-full mt-6 bg-zinc-700 hover:bg-zinc-600 rounded-lg py-2 px-3 mb-4 text-left font-semibold transition">+ New Chat</button>
              <div className="mb-6">
                <div className="text-xs uppercase tracking-wider text-zinc-400 mb-2">Previous Chats</div>
                <div className="space-y-2">
                  <button className="w-full bg-zinc-800 hover:bg-zinc-700 rounded-lg py-2 px-3 text-left transition">Chat 1</button>
                  <button className="w-full bg-zinc-800 hover:bg-zinc-700 rounded-lg py-2 px-3 text-left transition">Chat 2</button>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-center">
              <button className="w-10 h-10 flex items-center justify-center rounded-full bg-zinc-700 hover:bg-zinc-600 transition mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h3m-7.5 6h12m-9 6h6" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Main Chat Area */}
        <main className="flex-1 flex flex-col items-center justify-start bg-zinc-950 min-h-0 overflow-hidden relative py-6">
          <div className="absolute top-4 right-4 z-20 flex items-center gap-3">
            <button
              className="h-10 w-10 rounded-md text-zinc-100 hover:bg-zinc-800/60 transition flex items-center justify-center"
              title="Share convo"
              aria-label="Share convo"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V3.75m0 0 4.5 4.5M12 3.75l-4.5 4.5M3.75 14.25v3a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3v-3" />
              </svg>
            </button>
            <div className="relative">
              <button
                className="h-10 w-10 rounded-md text-zinc-100 hover:bg-zinc-800/60 transition flex items-center justify-center"
                onClick={() => setChatMenuOpen(prev => !prev)}
                aria-label="Open chat options"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm6 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm6 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
                </svg>
              </button>
              {chatMenuOpen && (
                <div className="absolute right-0 mt-2 w-36 rounded-md border border-zinc-700 bg-zinc-900/95 backdrop-blur-sm shadow-lg overflow-hidden">
                  <button className="block w-full text-left px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-800 transition">Pin</button>
                  <button className="block w-full text-left px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-800 transition">Rename</button>
                  <button className="block w-full text-left px-3 py-2 text-sm text-red-300 hover:bg-zinc-800 transition">Delete</button>
                </div>
              )}
            </div>
          </div>

          {/* Floating chat box */}
          <div className="w-full h-full flex flex-col">
            <div className="flex-1 min-h-0">
              <Chat onResponse={handleChatResponse} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

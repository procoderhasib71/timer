// src/app/community/page.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { ArrowLeft, Send, Users, MessageSquare, Hash } from "lucide-react";
import Link from "next/link";
import { auth, db } from "@/lib/firebaseClient";
import { onAuthStateChanged } from "firebase/auth";
import { useAccount } from "@/app/components/shared/AuthGate";
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, limit } from "firebase/firestore";

interface Message {
  id: string;
  text: string;
  uid: string;
  displayName: string;
  photoURL: string | null;
  createdAt: any;
}

interface Group {
  id: string;
  name: string;
  description: string;
}

const STUDY_GROUPS: Group[] = [
  { id: "hsc_warriors", name: "HSC 25/26 Warriors", description: "Discussion for HSC board exams and subjects." },
  { id: "medical_admission", name: "Medical Aspirants", description: "Preparation and tips for Medical Admission." },
  { id: "varsity_admission", name: "Varsity Unit-A", description: "Engineering and Varsity preparation." },
  { id: "mbbs_grinders", name: "MBBS Professional", description: "For medical students to discuss anatomy, pathology etc." }
];

export default function CommunityPage() {
  const { account } = useAccount();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get Current User
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Fetch Messages for Active Group
  useEffect(() => {
    if (!activeGroup || !currentUser) return;

    const messagesRef = collection(db, 'groups', activeGroup.id, 'messages');
    // শেষের ৫০টা মেসেজ (নতুন থেকে আনি, দেখাই পুরনো থেকে)
    const q = query(messagesRef, orderBy('createdAt', 'desc'), limit(50));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedMessages: Message[] = [];
      snapshot.forEach((doc) => {
        fetchedMessages.push({ id: doc.id, ...doc.data() } as Message);
      });
      setMessages(fetchedMessages.reverse());
    });

    return () => unsubscribe();
  }, [activeGroup, currentUser]);

  // Auto Scroll to bottom when new message arrives
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send Message function
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === "" || !currentUser || !activeGroup) return;

    const messageText = newMessage;
    setNewMessage(""); // Optimistic UI clear

    try {
      await addDoc(collection(db, 'groups', activeGroup.id, 'messages'), {
        text: messageText,
        uid: currentUser.uid,
        displayName: account?.name || currentUser.displayName || "A student",
        photoURL: currentUser.photoURL || null,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const formatMessageTime = (timestamp: any) => {
    if (!timestamp) return "Sending...";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // --- VIEW 1: GROUP LIST ---
  if (!activeGroup) {
    return (
      <div className="w-full min-h-[100dvh] bg-slate-50 dark:bg-[#0f172a] transition-colors duration-300">
        <div className="px-5 pt-8 pb-4 flex items-center justify-between sticky top-0 bg-slate-50/80 dark:bg-[#0f172a]/80 backdrop-blur-md z-30">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-2 -ml-2 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
              <ArrowLeft size={24} />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Community</h1>
              <p className="text-xs font-medium text-slate-500">Join Study Groups</p>
            </div>
          </div>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="bg-indigo-500 rounded-3xl p-6 text-white shadow-lg shadow-indigo-500/30 flex flex-col justify-between relative overflow-hidden mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="absolute -right-4 -top-4 opacity-20">
              <Users size={100} />
            </div>
            <h2 className="text-2xl font-extrabold mb-2 relative z-10">Connect & Learn</h2>
            <p className="text-sm font-medium text-indigo-100 relative z-10 max-w-[80%]">Join your specific study group to share notes, ask questions, and stay motivated together.</p>
          </div>

          <h3 className="text-sm font-extrabold tracking-wider text-slate-400 uppercase mb-2">Available Groups</h3>
          
          <div className="space-y-3">
            {STUDY_GROUPS.map((group, idx) => (
              <div 
                key={group.id} 
                onClick={() => setActiveGroup(group)}
                className="bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-white/5 rounded-2xl p-4 shadow-sm cursor-pointer hover:border-indigo-500/50 transition-all hover:scale-[1.01] animate-in fade-in slide-in-from-bottom-4"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl shrink-0">
                    <Hash size={24} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-slate-800 dark:text-white mb-1">{group.name}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{group.description}</p>
                  </div>
                  <div className="bg-slate-100 dark:bg-[#2c2c2e] text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-lg text-xs font-bold shrink-0">
                    Open
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // --- VIEW 2: ACTIVE CHAT ROOM ---
  return (
    <div className="w-full h-[100dvh] flex flex-col bg-slate-50 dark:bg-[#0f172a] transition-colors duration-300 relative">
      
      {/* Chat Header */}
      <div className="px-4 py-4 flex items-center justify-between bg-white dark:bg-[#1c1c1e] border-b border-slate-200 dark:border-white/5 shrink-0 shadow-sm z-30">
        <div className="flex items-center gap-3">
          <button onClick={() => setActiveGroup(null)} className="p-2 -ml-2 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
            <ArrowLeft size={24} />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-500/20 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Hash size={20} />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{activeGroup.name}</h1>
              <p className="text-[10px] font-medium text-slate-500 line-clamp-1">{activeGroup.description}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
        
        {/* Welcome message */}
        <div className="flex justify-center my-6">
          <div className="bg-slate-200/50 dark:bg-white/5 px-4 py-2 rounded-full text-xs font-medium text-slate-500 dark:text-slate-400 text-center">
            Welcome to the <span className="font-bold">{activeGroup.name}</span> community! 🚀
          </div>
        </div>

        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 opacity-50">
            <MessageSquare size={40} className="text-slate-400 mb-3" />
            <p className="text-sm font-medium text-slate-500">Be the first to say hello!</p>
          </div>
        )}

        {messages.map((msg, index) => {
          const isMe = msg.uid === currentUser?.uid;
          const showAvatar = index === 0 || messages[index - 1].uid !== msg.uid;

          return (
            <div key={msg.id} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
              <div className={`flex max-w-[80%] ${isMe ? 'flex-row-reverse' : 'flex-row'} gap-2`}>
                
                {/* Avatar */}
                {!isMe && showAvatar ? (
                  <div className="w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center shrink-0 font-bold text-xs shadow-sm overflow-hidden">
                    {msg.photoURL ? (
                      <img src={msg.photoURL} alt={msg.displayName} className="w-full h-full object-cover" />
                    ) : (
                      msg.displayName.charAt(0).toUpperCase()
                    )}
                  </div>
                ) : (
                  <div className="w-8 h-8 shrink-0"></div> // Spacer for alignment
                )}

                {/* Message Bubble */}
                <div className="flex flex-col">
                  {!isMe && showAvatar && (
                    <span className="text-[10px] font-bold text-slate-500 mb-1 ml-1">{msg.displayName}</span>
                  )}
                  <div 
                    className={`px-4 py-2.5 rounded-2xl text-sm shadow-sm ${
                      isMe 
                        ? 'bg-indigo-600 text-white rounded-tr-sm' 
                        : 'bg-white dark:bg-[#1c1c1e] border border-slate-200 dark:border-white/5 text-slate-800 dark:text-slate-200 rounded-tl-sm'
                    }`}
                  >
                    {msg.text}
                  </div>
                  <span className={`text-[9px] font-medium mt-1 text-slate-400 ${isMe ? 'text-right mr-1' : 'text-left ml-1'}`}>
                    {formatMessageTime(msg.createdAt)}
                  </span>
                </div>

              </div>
            </div>
          );
        })}
        {/* Empty div for auto-scrolling */}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white dark:bg-[#1c1c1e] border-t border-slate-200 dark:border-white/5 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shrink-0 z-30">
        {!currentUser ? (
          <div className="text-center p-3 bg-red-50 dark:bg-red-500/10 rounded-xl text-red-500 text-sm font-bold">
            Please log in to participate in the chat.
          </div>
        ) : (
          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <div className="flex-1 bg-slate-100 dark:bg-[#2c2c2e] rounded-full flex items-center px-4 py-1.5 border border-transparent focus-within:border-indigo-500/50 focus-within:bg-white dark:focus-within:bg-[#1c1c1e] transition-all">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={`Message #${activeGroup.name}...`}
                className="w-full bg-transparent border-none focus:outline-none text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 py-2.5"
              />
            </div>
            <button 
              type="submit" 
              disabled={!newMessage.trim()}
              className={`p-3 rounded-full shrink-0 transition-all ${newMessage.trim() ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 active:scale-95' : 'bg-slate-200 dark:bg-[#2c2c2e] text-slate-400 cursor-not-allowed'}`}
            >
              <Send size={20} className={newMessage.trim() ? 'ml-0.5' : ''} />
            </button>
          </form>
        )}
      </div>

    </div>
  );
}
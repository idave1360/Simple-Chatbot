"use client";

import Head from "next/head";
import { useEffect, useRef, useState } from "react";
import { Chat } from "@/components/Chat";
import { db } from "@/firebase";
import {
  collection,
  query,
  orderBy,
  getDocs,
  addDoc,
  deleteDoc,
} from "firebase/firestore";

const messageCollection = collection(db, "messages");

// 메시지를 Firestore에 저장하는 함수
const saveMessages = async (message) => {
  try {
    await addDoc(messageCollection, {
      ...message,
      timestamp: new Date()  // 메시지 저장 시 타임스탬프 추가
    });
  } catch (error) {
    console.error('Error saving message: ', error);
  }
};

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSend = async (message) => {
    if (loading) return; // 로딩 중이면 중복 전송 방지
    setLoading(true);

    const updatedMessages = [...messages, message];
    await saveMessages(message);
    setMessages(updatedMessages);  // 메시지를 Firestore에 저장한 후 상태 업데이트

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: updatedMessages,
      }),
    });

    if (!response.ok) {
      console.error('Error during fetch: ', response.statusText);
      setLoading(false);
      return;
    }

    const result = await response.json();
    await saveMessages(result);

    setMessages((prevMessages) => [...prevMessages, result]);
    setLoading(false);
  };

  const handleReset = async () => {
    const initialMessage = {
      role: "model",
      parts: [{ text: "자유롭게 지피티와의 대화를 시작해주세요" }],
      timestamp: new Date()
    };
    await saveMessages(initialMessage);
    setMessages([initialMessage]);  // 초기 메시지를 Firestore에 저장한 후 상태 업데이트
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const fetchMessages = async () => {
      const q = query(messageCollection, orderBy("timestamp"));
      const querySnapshot = await getDocs(q);
      const fetchedMessages = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setMessages(fetchedMessages);
    };

    fetchMessages();
  }, []);

  const clearMessages = async () => {
    const querySnapshot = await getDocs(messageCollection);
    querySnapshot.docs.forEach(async (doc) => {
      await deleteDoc(doc.ref);
    });
    handleReset();
  };

  return (
    <>
      <Head>
        <title>A Simple Chatbot</title>
        <meta name="description" content="A Simple Chatbot" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="flex flex-col h-screen">
        <div className="flex h-[50px] sm:h-[60px] border-b border-neutral-300 py-2 px-2 sm:px-8 items-center justify-between">
          <div className="font-bold text-3xl flex text-center">
            <a
              className="ml-2 hover:opacity-50"
              // href="https://code-scaffold.vercel.app"
            >
              A Simple Chatbot
            </a>
          </div>
        </div>

        <div className="flex-1 overflow-auto sm:px-10 pb-4 sm:pb-10">
          <div className="max-w-[800px] mx-auto mt-4 sm:mt-12">
            {/*
              메인 채팅 컴포넌트
              messages: 메시지 목록
              loading: 메시지 전송 중인지 여부
              onSendMessage: 메시지 전송 함수
            */}
            <Chat
              messages={messages}
              loading={loading}
              onSendMessage={handleSend}
            />
            {/* 메시지 목록의 끝으로 스크롤하기 위해 참조하는 엘리먼트 */}
            <div ref={messagesEndRef} />
            <button 
              className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded w-full mt-4" 
              onClick={clearMessages}
            >
              Clear Chat
            </button>
          </div>
        </div>

        <div className="flex h-[30px] sm:h-[50px] border-t border-neutral-300 py-2 px-8 items-center sm:justify-between justify-center"></div>
      </div>
    </>
  );
}

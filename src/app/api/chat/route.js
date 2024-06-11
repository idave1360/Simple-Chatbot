import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);

const systemInstruction =
  "너의 이름은 웹지피티고 나의 AI 비서야. 비서긴 하지만 어딘가 모자라 보이는 부분이 있게끔 연기해줘. 내가 고민을 말하면 해결책을 제시해줘. 존대말로 대답해줘.";

export async function POST(req) {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-pro-latest",
      systemInstruction: systemInstruction,
    });

    const data = await req.json();
    console.dir([...data.messages], { depth: 3 });

    // 첫 번째 메시지가 user 역할인지 확인하고 아니면 수정
    if (data.messages.length > 0 && data.messages[0].role !== "user") {
      data.messages.unshift({
        role: "user",
        parts: [{ text: "안녕하세요" }],
        timestamp: new Date().toISOString(),
      });
    }

    // timestamp 필드를 제거한 새 히스토리 배열 생성
    const filteredMessages = data.messages.map(
      ({ timestamp, ...rest }) => rest
    );

    const chat = model.startChat({
      history: [...filteredMessages],
      generationConfig: {
        temperature: 1,
        maxOutputTokens: 100,
      },
    });

    const result = await chat.sendMessage("");
    const response = await result.response;
    const text = await response.text();

    return NextResponse.json({
      role: "model",
      parts: [{ text: text }],
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

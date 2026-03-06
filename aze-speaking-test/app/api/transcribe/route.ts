import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audio = formData.get("audio") as File;

    if (!audio) {
      return NextResponse.json({ error: "No audio file" }, { status: 400 });
    }

    const response = await openai.audio.transcriptions.create({
      file: audio,
      model: "whisper-1",
      language: "en",
      prompt:
        "Transcribe exactly as spoken. Keep all grammar mistakes, wrong words, " +
        "and non-standard English. Do not correct or improve anything. " +
        "Examples: 'I no like', 'he go yesterday', 'more better', 'I am agree'.",
    });

    return NextResponse.json({ text: response.text });
  } catch (error) {
    console.error("Transcription error:", error);
    return NextResponse.json({ error: "Failed to transcribe" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM_PROMPT = `Você é um assistente de formatação de transcrições.
Receberá um texto transcrito de áudio/vídeo e deve organizá-lo em parágrafos bem definidos.

Regras:
- Divida o texto em parágrafos lógicos, respeitando mudanças de assunto ou raciocínio
- Mantenha EXATAMENTE as palavras originais — não corrija, não resuma, não adicione nada
- Separe os parágrafos com uma linha em branco (\n\n)
- Não adicione títulos, marcadores ou qualquer outro elemento
- Retorne apenas o texto formatado, sem comentários`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY não configurada." }, { status: 500 });
  }

  const { text } = await req.json() as { text?: string };
  if (!text?.trim()) {
    return NextResponse.json({ error: "Texto vazio." }, { status: 400 });
  }

  const openai = new OpenAI({ apiKey });

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: text },
    ],
    temperature: 0,
  });

  const formatted = completion.choices[0]?.message?.content?.trim() ?? text;
  return NextResponse.json({ text: formatted });
}

import Groq from 'groq-sdk'
import { NextRequest } from 'next/server'

let groq: Groq | null = null

function getGroqClient() {
    if (!groq) {
        groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
    }
    return groq
}

export async function POST(req: NextRequest) {
    try {
        const apiKey = process.env.GROQ_API_KEY
        if (!apiKey) {
            return new Response(JSON.stringify({ error: 'API key not configured' }), { status: 401 })
        }

        const { messages, image, fileContent, fileName, fileIsText } = await req.json()

        if (!messages || !Array.isArray(messages)) {
            return new Response('Invalid messages format', { status: 400 })
        }


        let systemContent = `You are Clabot, a brilliant and highly capable AI assistant. Follow these rules:

**Image Generation Requests:**
You CANNOT generate images directly. When someone asks you to generate, create, or draw an image (and they haven't already described what they want in detail), respond conversationally — say you can't generate images yourself but you're great at crafting prompts for AI image tools like Midjourney, DALL-E 3, Stable Diffusion, and Flux. Then ask them: "What would you like to create? Describe it to me and I'll craft detailed prompts for you."

If the user has ALREADY described what they want in their message (e.g. "generate a sunset over mountains"), then provide 3–5 highly detailed, creative, copy-paste-ready prompts tailored to their description, plus one formatted as JSON (with keys: prompt, negative_prompt, style, aspect_ratio).

**General Behavior:**
- When an image is provided, immediately analyze it in detail — describe content, context, colors, objects, emotions. Never ask 'how can I help?' — just analyze.
- When a file is attached, read it thoroughly and summarize or answer questions about it.
- Use clear formatting: **bold** for emphasis, bullet points for lists, headings for sections.
- Formatting Rules:
- NEVER write long paragraphs
- Use short sentences and line breaks
- Use bullet points where helpful
- Keep responses clean and easy to read
- Avoid robotic phrases like "As an AI assistant"
- Sound natural and conversational
Tone:
- Be friendly and human-like
- Keep answers concise but helpful
- Avoid unnecessary explanations
- Respond in the same language the user writes in.`

        if (fileContent && fileIsText && fileName) {
            systemContent += `\n\nThe user has attached a file named "${fileName}". Full file content:\n\n---FILE START---\n${fileContent}\n---FILE END---\n\nRead this file carefully. If the user hasn't asked a specific question, provide a smart summary of what the file contains.`
        } else if (fileName && !fileIsText) {
            systemContent += `\n\nThe user attached "${fileName}" which cannot be read as text (e.g. PDF, Word, binary). Politely explain you can read text-based files (.txt, .csv, .json, .py, .js, .ts, .md, etc.) and suggest copy-pasting the content.`
        }

        // Format messages — strip unknown fields (e.g. timestamp) and inject image into last user message
        const formattedMessages = messages.map((m: any, i: number) => {
            if (i === messages.length - 1 && image) {
                return {
                    role: m.role,
                    content: [
                        { type: 'text', text: m.content || 'What is in this image?' },
                        { type: 'image_url', image_url: { url: image } }
                    ]
                }
            }
            // Only send role + content — Groq rejects any extra properties
            return { role: m.role, content: m.content }
        })

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'meta-llama/llama-4-scout-17b-16e-instruct',
                messages: [
                    { role: 'system', content: systemContent },
                    ...formattedMessages,
                ],
                stream: true,
            }),
        })

        if (!response.ok) {
            const errorData = await response.json()
            return new Response(JSON.stringify(errorData), { status: response.status })
        }

        const encoder = new TextEncoder()
        const decoder = new TextDecoder()
        const reader = response.body?.getReader()

        const readable = new ReadableStream({
            async start(controller) {
                try {
                    while (reader) {
                        const { done, value } = await reader.read()
                        if (done) break
                        const chunk = decoder.decode(value)
                        const lines = chunk.split('\n')
                        for (const line of lines) {
                            if (line.trim() === '' || line.trim() === 'data: [DONE]') continue
                            if (line.startsWith('data: ')) {
                                try {
                                    const json = JSON.parse(line.replace(/^data: /, ''))
                                    const text = json.choices[0]?.delta?.content || ''
                                    if (text) controller.enqueue(encoder.encode(text))
                                } catch { /* skip invalid JSON */ }
                            }
                        }
                    }
                } catch (streamError) {
                    console.error('Streaming error:', streamError)
                } finally {
                    controller.close()
                }
            },
        })

        return new Response(readable, {
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        })
    } catch (error: any) {
        console.error('Server Error:', error)
        return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        })
    }
}
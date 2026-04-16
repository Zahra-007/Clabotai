import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
    try {
        const { base64 } = await req.json()

        if (!base64) {
            return NextResponse.json({ error: 'No PDF data provided' }, { status: 400 })
        }

        // Strip data URL prefix if present
        const raw = base64.replace(/^data:application\/pdf;base64,/, '')
        const buffer = Buffer.from(raw, 'base64')

        // Dynamic import to avoid SSR issues — handle both export patterns
        const pdfModule = await import('pdf-parse') as any
        const pdfParse = pdfModule.default || pdfModule
        const data = await pdfParse(buffer)

        return NextResponse.json({
            text: data.text,
            pages: data.numpages,
            info: data.info,
        })
    } catch (error: any) {
        console.error('PDF parse error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to parse PDF' },
            { status: 500 }
        )
    }
}

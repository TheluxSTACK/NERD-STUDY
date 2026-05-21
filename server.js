const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

// DeepSeek API
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions';

// 1. Extract PDF
app.post('/api/extract-pdf', upload.single('file'), async (req, res) => {
    try {
        const buffer = req.file.buffer;
        const data = await pdfParse(buffer);
        res.json({ text: data.text });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Generate Flashcard
app.post('/api/generate-flashcard', async (req, res) => {
    const { prompt, pdfText } = req.body;
    const context = pdfText || prompt;
    const messages = [
        { role: 'system', content: 'Kamu adalah asisten belajar. Buat flashcard dalam format: Pertanyaan: ... Jawaban: ... (pisahkan dengan baris baru).' },
        { role: 'user', content: `Buat flashcard dari teks berikut:\n${context}` }
    ];
    const response = await axios.post(DEEPSEEK_URL, {
        model: 'deepseek-chat',
        messages,
        temperature: 0.3
    }, {
        headers: { 'Authorization': `Bearer ${DEEPSEEK_API_KEY}` }
    });
    res.json({ flashcard: response.data.choices[0].message.content });
});

// 3. Generate Soal
app.post('/api/generate-soal', async (req, res) => {
    const { type, prompt, pdfText } = req.body;
    const context = pdfText || prompt;
    const messages = [
        { role: 'system', content: `Kamu adalah asisten belajar. Buat soal ${type === 'pg' ? 'pilihan ganda' : 'esai'} dari teks yang diberikan. Sertakan jawaban.` },
        { role: 'user', content: `Buat soal ${type} dari teks berikut:\n${context}` }
    ];
    const response = await axios.post(DEEPSEEK_URL, {
        model: 'deepseek-chat',
        messages,
        temperature: 0.3
    }, {
        headers: { 'Authorization': `Bearer ${DEEPSEEK_API_KEY}` }
    });
    res.json({ soal: response.data.choices[0].message.content });
});

// 4. Chat (dengan nama AI = "El Manco")
app.post('/api/chat', async (req, res) => {
    const { message, history } = req.body;
    const messages = [
        { role: 'system', content: 'Kamu adalah El Manco, asisten belajar yang ramah dan cerdas. Bantu menjawab pertanyaan dengan jelas dan mendukung.' },
        ...history.slice(-10),
        { role: 'user', content: message }
    ];
    const response = await axios.post(DEEPSEEK_URL, {
        model: 'deepseek-chat',
        messages,
        temperature: 0.5
    }, {
        headers: { 'Authorization': `Bearer ${DEEPSEEK_API_KEY}` }
    });
    res.json({ reply: response.data.choices[0].message.content });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
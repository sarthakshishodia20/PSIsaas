const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const CANDIDATE_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-2.5-flash',
  'gemini-3.8-flash',
];

async function generateEmbedding(text) {
  try {
    const embModel = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });
    const result = await embModel.embedContent({
      content: { parts: [{ text: text.trim() }] },
      outputDimensionality: 768,
    });
    return result.embedding.values;
  } catch (error) {
    console.error('Embedding generation error:', error);
    throw new Error('Failed to generate embedding: ' + error.message);
  }
}

async function generateAnswer(query, contextChunks, orgName = 'the Organization') {
  const contextText = contextChunks
    .map((chunk, idx) => {
      const docName = chunk.docName || chunk.doc_name || 'Document';
      const pageNumber = chunk.pageNumber || chunk.page_number || 1;
      return `[Source ${idx + 1}] (Document: "${docName}", Page: ${pageNumber}):\n${chunk.content}`;
    })
    .join('\n\n---\n\n');

  const prompt = `You are a helpful, professional, and accurate AI Knowledge Assistant representing "${orgName}".
Your job is to answer user inquiries strictly and accurately based ONLY on the provided document excerpts below.

CRITICAL RULES:
1. Base your entire answer ONLY on the provided Context excerpts.
2. If the user's question cannot be answered using the provided context, politely say:
   "I could not find information regarding this in the uploaded documents for ${orgName}. Please contact the administration for assistance."
3. DO NOT invent, assume, or extrapolate facts beyond what is stated in the context.
4. Always cite your sources clearly at the end or inline (e.g. mention the Document Name and Page Number).
5. Format your response cleanly using markdown (bullet points, bold text for key terms).

Context Excerpts:
---------------------
${contextText}
---------------------

User Question: "${query}"

Answer:`;

  let lastError = null;

  for (const modelName of CANDIDATE_MODELS) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (err) {
      console.warn(`Model ${modelName} failed, trying next fallback... (${err.message})`);
      lastError = err;
    }
  }

  throw new Error('All candidate models failed: ' + (lastError?.message || 'unknown'));
}

module.exports = {
  generateEmbedding,
  generateAnswer,
};

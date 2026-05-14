import { tool } from 'ai';
import { z } from 'zod';

export function createWebSearchTool() {
  return tool({
    description: 'Realiza uma pesquisa na web e retorna resultados relevantes.',
    parameters: z.object({
      query: z.string().describe('Consulta de pesquisa'),
      maxResults: z.number().optional().describe('Número máximo de resultados (padrão: 5)'),
    }),
    execute: async ({ query, maxResults = 5 }) => {
      // Brave Search API (free tier) - requires BRAVE_SEARCH_API_KEY env var
      const braveKey = process.env.BRAVE_SEARCH_API_KEY;
      const tavilyKey = process.env.TAVILY_API_KEY;

      if (tavilyKey) {
        return searchWithTavily(query, maxResults, tavilyKey);
      } else if (braveKey) {
        return searchWithBrave(query, maxResults, braveKey);
      } else {
        return {
          success: false,
          error: 'Nenhuma chave de API de pesquisa configurada. Configure TAVILY_API_KEY ou BRAVE_SEARCH_API_KEY.',
          results: [],
        };
      }
    },
  });
}

async function searchWithTavily(query: string, maxResults: number, apiKey: string) {
  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: apiKey, query, max_results: maxResults }),
  });
  if (!response.ok) return { success: false, error: `Tavily: ${response.statusText}`, results: [] };
  const data = await response.json() as { results: { title: string; url: string; content: string }[] };
  return { success: true, results: data.results ?? [], source: 'tavily' };
}

async function searchWithBrave(query: string, maxResults: number, apiKey: string) {
  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${maxResults}`;
  const response = await fetch(url, {
    headers: { 'Accept': 'application/json', 'X-Subscription-Token': apiKey },
  });
  if (!response.ok) return { success: false, error: `Brave: ${response.statusText}`, results: [] };
  const data = await response.json() as { web?: { results: { title: string; url: string; description: string }[] } };
  const results = (data.web?.results ?? []).map((r) => ({
    title: r.title,
    url: r.url,
    content: r.description,
  }));
  return { success: true, results, source: 'brave' };
}

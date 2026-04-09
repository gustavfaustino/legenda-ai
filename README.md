# LegendAI

LegendAI nasceu para resolver um problema real: traduzir legendas `.srt` de forma rápida, consistente e sem complicação.
Você envia o arquivo, escolhe idioma de origem e destino, e recebe a versão traduzida pronta para uso.

## Destaques

- Tradução em lotes com **Gemini 2.5 Flash (camada gratuita)**.
- Preservação de **numeração** e **timestamps** do arquivo SRT.
- Suporte a múltiplos idiomas em origem e destino.
- Campo de **glossário opcional** para manter termos importantes consistentes.
- Interface enxuta, amigável e 100% em português.

## Como funciona

1. O frontend recebe o arquivo `.srt` e divide em lotes.
2. Cada lote vira um prompt com regras de preservação de estrutura.
3. O backend chama o Gemini no servidor (sem expor chave no navegador).
4. O app reconstrói o SRT e inicia o download do arquivo traduzido.

## Estrutura do projeto

```text
srt-translator/
|- index.html
|- style.css
|- js/
|  |- main.js
|  |- llm.js
|  |- srt.js
|  \- ui.js
|- api/
|  |- providers.js
|  |- translate.js
|  \- lib/
|     \- providers.js
|- .env.example
|- package.json
|- vercel.json
\- README.md
```

## Rodando localmente

1. Entre na pasta do projeto:
   - `cd C:\Users\gusta\Desktop\DEV\mydev\legendAI\srt-translator`
2. Instale as dependências:
   - `npm install`
3. Crie `.env.local` com sua chave:
   - `GEMINI_API_KEY=sua_chave_aqui`
4. Suba local com Vercel:
   - `npx vercel dev --yes`
5. Acesse:
   - `http://localhost:3000`

## Deploy na Vercel

1. Suba este projeto no GitHub.
2. Importe o repositório na Vercel.
3. Configure `GEMINI_API_KEY` em **Project Settings -> Environment Variables**.
4. Faça o deploy.

## Idiomas e glossário

- Você pode ampliar os idiomas adicionando novas opções (`<option>`) nos selects de `index.html`.
- O glossário é recomendado quando há nomes, termos técnicos, gírias recorrentes ou vocabulário de universo específico.

## Segurança

- A chave da API fica apenas no backend (`/api/*`).
- O navegador nunca recebe `GEMINI_API_KEY`.
- O backend tem retry simples para lidar com rate limits temporários.

## Mensagem final

Feito com amor <3 (e muitas horas de sono)

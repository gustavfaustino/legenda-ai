export function parseSRT(text) {
  const blocks = [];
  const rawBlocks = text.trim().split(/\r?\n\r?\n/);

  for (const block of rawBlocks) {
    const lines = block.split(/\r?\n/);
    if (lines.length < 3) {
      continue;
    }

    blocks.push({
      idx: lines[0].trim(),
      time: lines[1].trim(),
      content: lines.slice(2).join("\n"),
    });
  }

  return blocks;
}

export function chunkBlocks(blocks, size) {
  const chunks = [];
  for (let i = 0; i < blocks.length; i += size) {
    chunks.push(blocks.slice(i, i + size));
  }
  return chunks;
}

export function buildPrompt(blocks, src, dst, glossary = "") {
  const body = blocks
    .map((block) => `[${block.idx}]\n${block.time}\n${block.content}`)
    .join("\n\n");
  const glossarySection = glossary
    ? `\nGlossary (prefer these terms):\n${glossary}\n`
    : "";

  return `You are a professional subtitle translator. Translate subtitles from ${src} to ${dst}.

Rules:
- Keep [number] markers exactly as-is and in the same order
- Keep timestamp lines exactly as-is (HH:MM:SS,mmm --> HH:MM:SS,mmm)
- Translate only subtitle text lines
- Preserve line breaks and HTML tags like <i>, <b>
- Keep terminology consistent across the whole batch
- If glossary terms are provided, prioritize them
- Return ONLY the translated blocks in the same format, no extra commentary
${glossarySection}

${body}`;
}

export function parseTranslation(text, originalBlocks) {
  const map = {};
  const sections = text.trim().split(/\n\n+/);
  const timestampRegex = /^\d{2}:\d{2}:\d{2},\d{3}\s-->\s\d{2}:\d{2}:\d{2},\d{3}$/;

  for (const section of sections) {
    const lines = section.split("\n");
    const marker = lines[0].match(/^\[(\d+)\]$/);
    if (marker) {
      const startAt = timestampRegex.test((lines[1] || "").trim()) ? 2 : 1;
      map[marker[1]] = lines.slice(startAt).join("\n");
    }
  }

  return originalBlocks
    .map((block) => `${block.idx}\n${block.time}\n${map[block.idx] || block.content}`)
    .join("\n\n");
}

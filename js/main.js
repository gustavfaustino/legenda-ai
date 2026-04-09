import { callLLM, fetchProviders, parseRetryMs } from "./llm.js";
import { buildPrompt, chunkBlocks, parseSRT, parseTranslation } from "./srt.js";
import {
  appendLog,
  bindFileUpload,
  bindTranslate,
  clearLog,
  getFormValues,
  getUI,
  setGeminiProgressStatus,
  setProgress,
  setProviderHint,
  setTranslateEnabled,
  showStatus,
  updateFileStats,
  updateProviderOptions,
} from "./ui.js";

const APP_CONFIG = {
  chunkSize: 220,
  maxAttempts: 3,
  pauseBetweenBatchesMs: 1200,
};

const state = {
  srtContent: "",
  fileName: "",
  providersLoaded: false,
};

const ui = getUI();

init();

async function init() {
  bindFileUpload(ui, handleFile);
  bindTranslate(ui, startTranslation);

  try {
    const providerData = await fetchProviders();
    updateProviderOptions(ui, providerData.providers);
    const enabledCount = providerData.providers.filter((p) => p.enabled).length;

    if (enabledCount === 0) {
      setProviderHint(ui, "Gemini indisponível. Configure GEMINI_API_KEY no Vercel.");
      showStatus(ui, "Gemini não está ativo no servidor.", "danger");
      return;
    }

    setProviderHint(ui, "Provedor fixo: Gemini 2.5 Flash (camada gratuita).");
    state.providersLoaded = true;
    showStatus(ui, "Tudo pronto. Envie seu .srt e vamos traduzir.", "info");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    setProviderHint(ui, "Falha ao carregar configuração do Gemini.");
    showStatus(ui, `Erro de inicialização: ${message}`, "danger");
  }
}

function handleFile(file) {
  if (!file || !file.name.toLowerCase().endsWith(".srt")) {
    showStatus(ui, "Selecione um arquivo .srt válido.", "danger");
    return;
  }

  state.fileName = file.name;

  const reader = new FileReader();
  reader.onload = (event) => {
    state.srtContent = event.target?.result || "";

    const blocks = parseSRT(state.srtContent);
    const previewBatches = chunkBlocks(blocks, 20);

    updateFileStats(ui, {
      chars: state.srtContent.length,
      blocks: blocks.length,
      batches: previewBatches.length,
      fileName: file.name,
      fileSizeKb: file.size / 1024,
    });

    setTranslateEnabled(ui, true);
    showStatus(ui, "Arquivo carregado com sucesso. Clique em traduzir quando quiser.", "info");
  };

  reader.readAsText(file, "UTF-8");
}

async function startTranslation() {
  const { src, dst } = getFormValues(ui);

  if (!state.providersLoaded) {
    showStatus(ui, "Aguarde a inicialização do Gemini no servidor.", "danger");
    return;
  }

  if (!state.srtContent) {
    showStatus(ui, "Carregue um arquivo .srt.", "danger");
    return;
  }

  setTranslateEnabled(ui, false);
  clearLog(ui);
  setProgress(ui, 0);

  const blocks = parseSRT(state.srtContent);
  const batches = chunkBlocks(blocks, APP_CONFIG.chunkSize);
  const translatedParts = [];

  for (let i = 0; i < batches.length; i += 1) {
    const batch = batches[i];
    const from = batch[0].idx;
    const to = batch[batch.length - 1].idx;

    setGeminiProgressStatus(ui, i + 1, batches.length, from, to);
    appendLog(ui, `[${i + 1}/${batches.length}] Legendas ${from}-${to}`);

    let attempt = 0;
    let success = false;

    while (!success && attempt < APP_CONFIG.maxAttempts) {
      try {
        const prompt = buildPrompt(batch, src, dst);
        const text = await callLLM({
          prompt,
        });
        translatedParts.push(parseTranslation(text, batch));
        appendLog(ui, "  ok");
        success = true;
      } catch (error) {
        attempt += 1;
        const message = error instanceof Error ? error.message : String(error);
        appendLog(ui, `  erro (${attempt}/${APP_CONFIG.maxAttempts}): ${message}`);

        if (attempt >= APP_CONFIG.maxAttempts) {
          showStatus(ui, `Falha no lote ${i + 1}: ${message}`, "danger");
          setTranslateEnabled(ui, true);
          return;
        }

        const waitMs = parseRetryMs(message);
        appendLog(ui, `  aguardando ${(waitMs / 1000).toFixed(0)}s...`);
        await sleep(waitMs);
      }
    }

    setProgress(ui, Math.round(((i + 1) / batches.length) * 100));

    if (i < batches.length - 1) {
      await sleep(APP_CONFIG.pauseBetweenBatchesMs);
    }
  }

  const finalText = `${translatedParts.join("\n\n")}\n`;
  downloadTranslatedFile(finalText, state.fileName);

  showStatus(ui, `Tradução concluída. ${blocks.length} legendas traduzidas e download iniciado.`, "success");
  appendLog(ui, "\nTudo certo. Aproveite seu arquivo traduzido.");
  setTranslateEnabled(ui, true);
}

function downloadTranslatedFile(content, originalName) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = originalName.replace(/\.srt$/i, "_pt.srt");
  anchor.click();

  URL.revokeObjectURL(url);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Frase anterior: Feito para traduzir as legendas do show que minha querida Ni ama 💜

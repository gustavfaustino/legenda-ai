export function getUI() {
  return {
    providerHint: document.getElementById("providerHint"),
    srcLang: document.getElementById("srcLang"),
    dstLang: document.getElementById("dstLang"),
    dropZone: document.getElementById("dropZone"),
    fileInput: document.getElementById("fileInput"),
    btn: document.getElementById("btn"),
    stats: document.getElementById("stats"),
    mChars: document.getElementById("mChars"),
    mBlocks: document.getElementById("mBlocks"),
    mBatches: document.getElementById("mBatches"),
    dropTitle: document.getElementById("dropTitle"),
    dropSub: document.getElementById("dropSub"),
    statusBox: document.getElementById("statusBox"),
    progressBar: document.getElementById("progressBar"),
    progressFill: document.getElementById("progressFill"),
    logBox: document.getElementById("logBox"),
  };
}

export function bindFileUpload(ui, onFileSelected) {
  ui.fileInput.addEventListener("change", (event) => {
    const [file] = event.target.files || [];
    onFileSelected(file);
  });

  ui.dropZone.addEventListener("dragover", (event) => {
    event.preventDefault();
    ui.dropZone.classList.add("over");
  });

  ui.dropZone.addEventListener("dragleave", () => {
    ui.dropZone.classList.remove("over");
  });

  ui.dropZone.addEventListener("drop", (event) => {
    event.preventDefault();
    ui.dropZone.classList.remove("over");
    const [file] = event.dataTransfer.files || [];
    onFileSelected(file);
  });
}

export function bindTranslate(ui, onTranslate) {
  ui.btn.addEventListener("click", onTranslate);
}

export function updateProviderOptions(ui, providers) {
  const gemini = providers.find((provider) => provider.id === "gemini");
  const enabled = Boolean(gemini?.enabled);

  if (enabled) {
    setProviderHint(ui, "Motor ativo: Gemini 2.5 Flash (camada gratuita).");
    return;
  }

  setProviderHint(ui, "Gemini indisponivel. Configure GEMINI_API_KEY no servidor.");
}

export function setProviderHint(ui, message) {
  ui.providerHint.textContent = message;
}

export function setGeminiProgressStatus(ui, currentBatch, totalBatches, fromIdx, toIdx) {
  showStatus(
    ui,
    `Gemini 2.5 Flash traduzindo: lote ${currentBatch}/${totalBatches} (blocos ${fromIdx}-${toIdx})`,
    "info",
  );
}

export function updateFileStats(ui, payload) {
  ui.mChars.textContent = payload.chars.toLocaleString("pt-BR");
  ui.mBlocks.textContent = payload.blocks.toLocaleString("pt-BR");
  ui.mBatches.textContent = payload.batches.toString();
  ui.stats.classList.add("visible");

  ui.dropTitle.textContent = payload.fileName;
  ui.dropSub.textContent = `${payload.fileSizeKb.toFixed(1)} KB`;
  ui.dropZone.classList.add("ready");
}

export function showStatus(ui, message, type) {
  ui.statusBox.className = `status ${type}`;
  ui.statusBox.textContent = message;
}

export function setProgress(ui, percent) {
  ui.progressBar.classList.add("visible");
  ui.progressFill.style.width = `${percent}%`;
}

export function clearLog(ui) {
  ui.logBox.textContent = "";
}

export function appendLog(ui, message) {
  ui.logBox.classList.add("visible");
  ui.logBox.textContent += `${message}\n`;
  ui.logBox.scrollTop = ui.logBox.scrollHeight;
}

export function setTranslateEnabled(ui, enabled) {
  ui.btn.disabled = !enabled;
}

export function getFormValues(ui) {
  return {
    src: ui.srcLang.value,
    dst: ui.dstLang.value,
  };
}

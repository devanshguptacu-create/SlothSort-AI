
"use strict";

const MODEL_URL =
  "https://router.huggingface.co/hf-inference/models/facebook/bart-large-mnli";

const CATEGORIES = [
  "Documents", "Images", "Videos", "Audio", "Code", "Archives", "Other"
];

const CATEGORY_LABELS = CATEGORIES.map(category =>
  category === "Other" ? "other files" : category.toLowerCase()
);

const $ = id => document.getElementById(id);

const tokenInput = $("hfToken");
const connectBtn = $("connectBtn");
const aiStatus = $("aiStatus");
const connectMessage = $("connectMessage");
const chooseBtn = $("chooseBtn");
const folderTitle = $("folderTitle");
const folderDescription = $("folderDescription");
const folderMessage = $("folderMessage");
const fileList = $("fileList");
const emptyState = $("emptyState");
const fileCount = $("fileCount");
const totalStat = $("totalStat");
const readyStat = $("readyStat");
const selectionLabel = $("selectionLabel");
const organizeBtn = $("organizeBtn");
const organizeMessage = $("organizeMessage");

let hfToken = "";
let directoryHandle = null;
let files = [];
let aiConnected = false;
let busy = false;

function message(element, text, error = false) {
  element.textContent = text;
  element.classList.toggle("error", error);
}

function setBusy(value) {
  busy = value;
  chooseBtn.disabled = value;
  connectBtn.disabled = value;
  updateStats();
}

function extension(name) {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot).toLowerCase() : "";
}

function fallbackCategory(name) {
  const ext = extension(name);
  const rules = {
    Documents: [".pdf", ".doc", ".docx", ".txt", ".ppt",
      ".pptx", ".xls", ".xlsx", ".csv", ".md", ".rtf"],
    Images: [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp"],
    Videos: [".mp4", ".mkv", ".mov", ".avi", ".webm"],
    Audio: [".mp3", ".wav", ".aac", ".flac", ".m4a", ".ogg"],
    Code: [".py", ".js", ".html", ".css", ".java", ".c", ".cpp",
      ".json", ".ts", ".php", ".jsx", ".tsx", ".sql"],
    Archives: [".zip", ".rar", ".7z", ".tar", ".gz"]
  };

  for (const [category, extensions] of Object.entries(rules)) {
    if (extensions.includes(ext)) return category;
  }

  return "Other";
}

function iconFor(category) {
  return {
    Documents: "📄",
    Images: "🖼️",
    Videos: "🎬",
    Audio: "🎧",
    Code: "💻",
    Archives: "📦",
    Other: "✨"
  }[category] || "📄";
}

async function classifyWithAI(filename) {
  const response = await fetch(MODEL_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${hfToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      inputs: filename,
      parameters: {
        candidate_labels: CATEGORY_LABELS,
        hypothesis_template: "This file belongs in the {} category."
      }
    })
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `Model request failed (${response.status}). ` +
      "Check your token, provider access and quota. " +
      details.slice(0, 180)
    );
  }

  const result = await response.json();

  if (!result || !Array.isArray(result.labels) ||
      !Array.isArray(result.scores) || !result.labels.length) {
    throw new Error("The model returned an unexpected response.");
  }

  const bestLabel = String(result.labels[0]).toLowerCase();

  const matched = CATEGORIES.find(category =>
    (category === "Other" ? "other files" : category.toLowerCase())
      === bestLabel
  );

  if (!matched) {
    throw new Error(`Unexpected model category: ${bestLabel}`);
  }

  return {
    category: matched,
    confidence: Number(result.scores[0]) || 0,
    source: "AI"
  };
}

async function testAI(token) {
  const response = await fetch(MODEL_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      inputs: "lecture-notes.pdf",
      parameters: {
        candidate_labels: CATEGORY_LABELS
      }
    })
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `Connection failed (${response.status}). ` +
      "Verify token permissions, model availability and quota. " +
      details.slice(0, 160)
    );
  }

  const result = await response.json();

  if (!Array.isArray(result.labels) || !result.labels.length) {
    throw new Error("The model response was not recognized.");
  }
}

connectBtn.addEventListener("click", async () => {
  const token = tokenInput.value.trim();

  if (!token) {
    message(connectMessage, "Paste your Hugging Face token first.", true);
    return;
  }

  connectBtn.disabled = true;
  message(connectMessage, "Checking model access…");

  try {
    await testAI(token);
    hfToken = token;
    aiConnected = true;
    aiStatus.textContent = "AI CONNECTED";
    aiStatus.classList.add("connected");
    message(connectMessage, "Connected. Your model is ready to classify filenames.");
    tokenInput.value = "";
    tokenInput.placeholder = "Token held in page memory";
  } catch (error) {
    hfToken = "";
    aiConnected = false;
    aiStatus.textContent = "NOT CONNECTED";
    aiStatus.classList.remove("connected");
    message(connectMessage, error.message, true);
  } finally {
    connectBtn.disabled = false;
  }
});

chooseBtn.addEventListener("click", async () => {
  if (!("showDirectoryPicker" in window)) {
    message(
      folderMessage,
      "Folder selection needs a supported desktop browser such as Chrome or Edge. Open this app through localhost or a secure HTTPS site.",
      true
    );
    return;
  }

  try {
    directoryHandle = await window.showDirectoryPicker({
      mode: "readwrite"
    });

    await scanFolder();
  } catch (error) {
    if (error.name !== "AbortError") {
      message(folderMessage, error.message || "Could not open this folder.", true);
    }
  }
});

async function scanFolder() {
  if (!directoryHandle) return;

  setBusy(true);
  files = [];
  renderFiles();
  folderTitle.textContent = "Taking a look around…";
  folderDescription.textContent = "Checking files in your selected folder.";
  message(folderMessage, "Reading folder entries…");
  message(organizeMessage, "");

  try {
    const entries = [];

    for await (const [name, handle] of directoryHandle.entries()) {
      if (handle.kind === "file" && !name.startsWith(".")) {
        entries.push({ name, handle });
      }
    }

    entries.sort((a, b) => a.name.localeCompare(b.name));

    if (entries.length > 100) {
      entries.length = 100;
      message(
        folderMessage,
        "Showing the first 100 files to keep the demo manageable."
      );
    } else {
      message(folderMessage, `${entries.length} files found.`);
    }

    folderTitle.textContent = directoryHandle.name;
    folderDescription.textContent =
      `${entries.length} files ready for review.`;

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      let suggestion = {
        category: fallbackCategory(entry.name),
        confidence: null,
        source: "Rules"
      };

      if (aiConnected && hfToken) {
        try {
          suggestion = await classifyWithAI(entry.name);
        } catch (error) {
          // A model may be temporarily unavailable or rate-limited.
          // Keep the app usable, but label the suggestion honestly.
          suggestion = {
            category: fallbackCategory(entry.name),
            confidence: null,
            source: "Rules"
          };
          message(
            folderMessage,
            `Some AI requests failed; remaining files use extension rules. ${error.message}`,
            true
          );
          aiConnected = false;
          aiStatus.textContent = "AI UNAVAILABLE";
          aiStatus.classList.remove("connected");
          hfToken = "";
        }
      }

      files.push({
        name: entry.name,
        category: suggestion.category,
        source: suggestion.source,
        confidence: suggestion.confidence,
        handle: entry.handle,
        selected: true
      });

      renderFiles();
      updateStats();
    }

    if (entries.length === 0) {
      folderTitle.textContent = "Nothing to sort yet.";
      folderDescription.textContent = "Choose another folder containing files.";
    } else if (aiConnected) {
      message(folderMessage, "AI suggestions are ready. Review each category.");
    } else if (files.some(file => file.source === "Rules")) {
      message(
        folderMessage,
        "Suggestions are ready. Categories marked RULES use file extensions, not AI."
      );
    }
  } catch (error) {
    message(folderMessage, error.message || "Could not scan this folder.", true);
  } finally {
    setBusy(false);
    renderFiles();
    updateStats();
  }
}

function renderFiles() {
  fileList.replaceChildren();
  emptyState.hidden = files.length > 0;

  for (const file of files) {
    const card = document.createElement("article");
    card.className = "file-card";

    const main = document.createElement("div");
    main.className = "file-card-main";

    const icon = document.createElement("div");
    icon.className = "file-icon";
    icon.textContent = iconFor(file.category);

    const info = document.createElement("div");
    info.className = "file-info";

    const name = document.createElement("div");
    name.className = "file-name";
    name.textContent = file.name;

    const detail = document.createElement("div");
    detail.className = "file-detail";
    detail.textContent = file.source === "AI"
      ? `Open-weight model suggestion · ${Math.round(file.confidence * 100)}% score`
      : "Extension-based suggestion · AI not used";

    info.append(name, detail);
    main.append(icon, info);

    const select = document.createElement("select");
    select.setAttribute("aria-label", `Category for ${file.name}`);

    for (const category of CATEGORIES) {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = category;
      option.selected = category === file.category;
      select.append(option);
    }

    select.addEventListener("change", () => {
      file.category = select.value;
      file.source = "Edited by you";
      file.confidence = null;
      renderFiles();
      updateStats();
    });

    card.append(main, select);
    fileList.append(card);
  }

  updateStats();
}

function updateStats() {
  const count = files.length;
  const selected = files.filter(file => file.selected).length;

  fileCount.textContent = `${count} FILE${count === 1 ? "" : "S"}`;
  totalStat.textContent = count;
  readyStat.textContent = selected;
  selectionLabel.textContent = selected
    ? `${selected} file${selected === 1 ? "" : "s"} selected`
    : "Nothing selected yet";

  organizeBtn.disabled = busy || !directoryHandle || selected === 0;
}

async function nextAvailableName(folderHandle, originalName) {
  const dot = originalName.lastIndexOf(".");
  const hasExtension = dot > 0;
  const stem = hasExtension ? originalName.slice(0, dot) : originalName;
  const ext = hasExtension ? originalName.slice(dot) : "";

  let candidate = originalName;
  let counter = 1;

  while (true) {
    try {
      await folderHandle.getFileHandle(candidate);
      candidate = `${stem}_${counter}${ext}`;
      counter++;
    } catch (error) {
      if (error.name === "NotFoundError") return candidate;
      throw error;
    }
  }
}

organizeBtn.addEventListener("click", async () => {
  const selected = files.filter(file => file.selected);

  if (!directoryHandle || selected.length === 0) return;

  const confirmed = window.confirm(
    `Move ${selected.length} selected files into category folders inside "${directoryHandle.name}"?\n\n` +
    "This changes your files. Test with copies first and keep a backup."
  );

  if (!confirmed) return;

  setBusy(true);
  let moved = 0;
  let failed = 0;
  const movedNames = new Set();

  try {
    for (const item of selected) {
      try {
        const sourceFile = await item.handle.getFile();
        const targetFolder = await directoryHandle.getDirectoryHandle(
          item.category,
          { create: true }
        );

        const targetName = await nextAvailableName(targetFolder, item.name);
        const targetHandle = await targetFolder.getFileHandle(
          targetName,
          { create: true }
        );

        const writable = await targetHandle.createWritable();

        try {
          await writable.write(sourceFile);
          await writable.close();
        } catch (error) {
          try { await writable.abort(); } catch {}
          try { await targetFolder.removeEntry(targetName); } catch {}
          throw error;
        }

        // Remove the original only after the copy was written successfully.
        await directoryHandle.removeEntry(item.name);

        moved++;
        movedNames.add(item.name);
      } catch (error) {
        failed++;
        console.error("Could not move file:", item.name, error);
      }
    }

    files = files.filter(file => !movedNames.has(file.name));
    renderFiles();

    message(
      organizeMessage,
      `Finished: ${moved} moved, ${failed} failed. Check the destination folders.`
    );

    folderDescription.textContent =
      `${files.length} files remain in the selected folder.`;
  } catch (error) {
    message(organizeMessage, error.message || "Organization failed.", true);
  } finally {
    setBusy(false);
    renderFiles();
  }
});

updateStats();

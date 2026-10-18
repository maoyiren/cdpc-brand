(() => {
  const $ = (s) => document.querySelector(s);
  const tabs = [...document.querySelectorAll(".tool-tab")];
  const textMode = $("#text-mode");
  const imageMode = $("#image-mode");
  const prompt = $("#prompt");
  const referenceInput = $("#reference-image");
  const editInstruction = $("#edit-instruction");
  const keyInput = $("#api-key");
  const modelSelect = $("#model");
  const sizeSelect = $("#size");
  const form = $("#skin-form");
  const generateBtn = $("#generate-btn");
  const status = $("#status");
  const resultState = $("#result-state");
  const resultImage = $("#result-image");
  const resultCanvas = $("#result-canvas");
  const downloadOriginal = $("#download-original");
  const downloadSkin = $("#download-skin");
  let mode = "text";
  let referenceData = null;
  let referenceMime = "image/png";
  let generatedUrl = null;
  let generatedBlob = null;
  let skinBlob = null;
  const setStatus = (message, kind = "") => {
    status.textContent = message;
    status.className = "status-message" + (kind ? " is-" + kind : "");
  };
  const setMode = (next) => {
    mode = next;
    tabs.forEach((tab) => {
      const active = tab.dataset.mode === mode;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", String(active));
    });
    textMode.hidden = mode !== "text";
    imageMode.hidden = mode !== "image";
    prompt.required = mode === "text";
    referenceInput.required = mode === "image";
    editInstruction.required = false;
    setStatus(mode === "text" ? "输入描述，生成一款新的像素皮肤。" : "上传参考图，描述希望改绘的方向。");
  };
  tabs.forEach((tab) => tab.addEventListener("click", () => setMode(tab.dataset.mode)));
  document.querySelectorAll("[data-prompt]").forEach((button) => button.addEventListener("click", () => {
    prompt.value = button.dataset.prompt;
    prompt.focus();
  }));
  $("#toggle-key").addEventListener("click", () => {
    const visible = keyInput.type === "password";
    keyInput.type = visible ? "text" : "password";
    $("#toggle-key").textContent = visible ? "隐藏" : "显示";
  });
  referenceInput.addEventListener("change", () => {
    const file = referenceInput.files && referenceInput.files[0];
    referenceData = null;
    if (!file) { $("#reference-preview").innerHTML = "<span>选择 PNG、JPG 或 WebP 图片</span>"; return; }
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      referenceInput.value = "";
      setStatus("图片格式不支持，请使用 PNG、JPG 或 WebP。", "error");
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      referenceInput.value = "";
      setStatus("图片不能超过 12 MB。", "error");
      return;
    }
    referenceMime = file.type;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      referenceData = dataUrl.split(",")[1];
      $("#reference-preview").innerHTML = "";
      const img = document.createElement("img");
      img.src = dataUrl;
      img.alt = "上传的参考图预览";
      $("#reference-preview").appendChild(img);
    };
    reader.onerror = () => setStatus("读取参考图失败，请重新选择。", "error");
    reader.readAsDataURL(file);
  });
  function extractImage(payload) {
    if (payload && payload.output_image && payload.output_image.data) {
      return { data: payload.output_image.data, mime: payload.output_image.mime_type || "image/png" };
    }
    const steps = Array.isArray(payload?.steps) ? payload.steps : [];
    for (let i = steps.length - 1; i >= 0; i--) {
      const blocks = steps[i]?.content || steps[i]?.summary || [];
      for (let j = blocks.length - 1; j >= 0; j--) {
        if (blocks[j]?.type === "image" && blocks[j]?.data) {
          return { data: blocks[j].data, mime: blocks[j].mime_type || "image/png" };
        }
      }
    }
    return null;
  }
  function buildPrompt() {
    const size = Number(sizeSelect.value);
    const textureRequest = size === 64
      ? "Create a Minecraft-compatible 64 by 64 skin texture sheet, not a character portrait. The entire canvas must be exactly a flat 64x64 pixel UV texture layout for the standard modern Minecraft player skin, with front/back/side/top/bottom body-part panels arranged in the standard skin UV map, crisp square pixels, no perspective, no shadows outside the texture, no mockup, no text, no border, no scene. Preserve clear pixel boundaries and a limited palette."
      : "Create a polished pixel-art Minecraft-style character skin concept, full character centered, crisp square pixels, no text, no logo, simple background.";
    if (mode === "text") return textureRequest + "\nTheme and design brief: " + prompt.value.trim() + "\nOriginal design only. Do not use any copyrighted named character.";
    return textureRequest + "\nUse the provided reference image as visual inspiration. Requested changes: " + (editInstruction.value.trim() || "Adapt the visual theme into an original blocky pixel-art skin design.") + "\nCreate an original design and do not reproduce logos or copyrighted characters.";
  }
  function base64ToBlob(base64, mime) {
    const binary = atob(base64);
    const chunks = [];
    for (let i = 0; i < binary.length; i += 1024) {
      const part = binary.slice(i, i + 1024);
      const bytes = new Uint8Array(part.length);
      for (let j = 0; j < part.length; j++) bytes[j] = part.charCodeAt(j);
      chunks.push(bytes);
    }
    return new Blob(chunks, { type: mime || "image/png" });
  }
  async function make64Png(blob) {
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
    canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, 64, 64);
    ctx.drawImage(bitmap, 0, 0, 64, 64);
    bitmap.close();
    return await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  }
  function downloadBlob(blob, filename) {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  downloadOriginal.addEventListener("click", () => downloadBlob(generatedBlob, "cdpc-ai-skin-concept.png"));
  downloadSkin.addEventListener("click", () => downloadBlob(skinBlob, "cdpc-skin-64x64.png"));
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const apiKey = keyInput.value.trim();
    if (!apiKey) { setStatus("请先填写 Gemini API Key。", "error"); keyInput.focus(); return; }
    if (mode === "text" && !prompt.value.trim()) { setStatus("请描述你想生成的皮肤。", "error"); prompt.focus(); return; }
    if (mode === "image" && !referenceData) { setStatus("请先选择一张参考图。", "error"); referenceInput.focus(); return; }
    generateBtn.disabled = true;
    generateBtn.innerHTML = "<span>◌</span> 正在生成…";
    resultState.textContent = "生成中";
    resultState.classList.remove("is-ready");
    setStatus("正在请求 Gemini 图像生成模型。生成时间取决于模型和网络，请稍候。");
    try {
      const input = mode === "text"
        ? buildPrompt()
        : [{ type: "text", text: buildPrompt() }, { type: "image", mime_type: referenceMime, data: referenceData }];
      const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          model: modelSelect.value,
          input,
          response_format: { type: "image", mime_type: "image/png", aspect_ratio: "1:1", image_size: Number(sizeSelect.value) === 64 ? "1K" : (Number(sizeSelect.value) === 512 ? "05.K" : "1K") }
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const apiMessage = payload?.error?.message || payload?.message || ("HTTP " + response.status);
        throw new Error(apiMessage);
      }
      const output = extractImage(payload);
      if (!output) throw new Error("接口已响应，但没有找到图片结果。请检查模型权限或重试。");
      generatedBlob = base64ToBlob(output.data, output.mime);
      if (generatedUrl) URL.revokeObjectURL(generatedUrl);
      generatedUrl = URL.createObjectURL(generatedBlob);
      resultImage.src = generatedUrl;
      resultImage.hidden = false;
      const empty = resultCanvas.querySelector(".empty-result");
      if (empty) empty.remove();
      skinBlob = await make64Png(generatedBlob);
      downloadOriginal.disabled = false;
      downloadSkin.disabled = false;
      resultState.textContent = "生成完成";
      resultState.classList.add("is-ready");
      setStatus("生成成功。你可以下载原图，或下载缩放后的 64×64 PNG 草稿。", "success");
    } catch (error) {
      console.error("CDPC AI skin generation failed:", error);
      let message = error && error.message ? error.message : "未知错误";
      if (/Failed to fetch|NetworkError/i.test(message)) message = "网络请求失败。请检查网络、API Key、浏览器跨域限制后重试。";
      setStatus("生成失败：" + message, "error");
      resultState.textContent = "生成失败";
    } finally {
      generateBtn.disabled = false;
      generateBtn.innerHTML = "<span>✦</span> 生成皮肤 <span>→</span>";
    }
  });
  setMode("text");
})();
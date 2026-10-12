async function loadWorks() {
  try {
    const response = await fetch("/api/works");
    if (!response.ok) return [];
    return response.json();
  } catch {
    return [];
  }
}

function createMediaPreview(work) {
  if (!work.url && work.externalUrl) {
    const linkCard = document.createElement("a");
    linkCard.className = "work-fallback link-fallback";
    linkCard.href = work.externalUrl;
    linkCard.target = "_blank";
    linkCard.rel = "noreferrer";

    const label = document.createElement("strong");
    label.textContent = "URL";

    const linkText = document.createElement("span");
    linkText.textContent = work.externalUrl;

    linkCard.append(label, linkText);
    return linkCard;
  }

  if (!work.url) {
    const noteCard = document.createElement("div");
    noteCard.className = "work-fallback";

    const label = document.createElement("strong");
    label.textContent = "Draft";

    const note = document.createElement("span");
    note.textContent = "待补充素材";

    noteCard.append(label, note);
    return noteCard;
  }

  if (work.mimeType?.startsWith("image/")) {
    const image = document.createElement("img");
    image.src = work.url;
    image.alt = work.title;
    image.loading = "lazy";
    return image;
  }

  if (work.mimeType?.startsWith("video/")) {
    const video = document.createElement("video");
    video.src = work.url;
    video.controls = true;
    video.controlsList = "nodownload noplaybackrate";
    video.disablePictureInPicture = true;
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    return video;
  }

  const documentCard = document.createElement("a");
  documentCard.className = "work-fallback";
  documentCard.href = work.url;
  documentCard.target = "_blank";
  documentCard.rel = "noreferrer";

  const label = document.createElement("strong");
  label.textContent = "PDF";

  const fileName = document.createElement("span");
  fileName.textContent = work.fileName || work.title;

  documentCard.append(label, fileName);
  return documentCard;
}

function createWorkCard(work, options = {}) {
  const card = document.createElement("article");
  card.className = "work-card";

  const media = document.createElement("div");
  media.className = "work-media";
  media.appendChild(createMediaPreview(work));

  const content = document.createElement("div");
  content.className = "work-content";

  const typeLabel = document.createElement("span");
  typeLabel.textContent = work.type;

  const heading = document.createElement("h3");
  heading.textContent = work.title;

  const description = document.createElement("p");
  description.textContent = work.description;

  content.append(typeLabel, heading, description);

  if (work.role || work.result || work.notes) {
    const meta = document.createElement("dl");
    meta.className = "work-meta";

    [
      ["职责", work.role],
      ["结果", work.result],
      ["备注", work.notes],
    ].forEach(([label, value]) => {
      if (!value) return;
      const item = document.createElement("div");
      const term = document.createElement("dt");
      const detail = document.createElement("dd");
      term.textContent = label;
      detail.textContent = value;
      item.append(term, detail);
      meta.appendChild(item);
    });

    content.appendChild(meta);
  }

  if (work.externalUrl) {
    const externalLink = document.createElement("a");
    externalLink.className = "work-link";
    externalLink.href = work.externalUrl;
    externalLink.target = "_blank";
    externalLink.rel = "noreferrer";
    externalLink.textContent = "打开项目网址";
    content.append(externalLink);
  }

  if (options.canDelete) {
    const removeButton = document.createElement("button");
    removeButton.className = "work-remove";
    removeButton.type = "button";
    removeButton.textContent = "删除";
    removeButton.addEventListener("click", async () => {
      await fetch(`/api/works/${encodeURIComponent(work.id)}`, { method: "DELETE" });
      renderAdmin();
    });
    content.append(removeButton);
  }

  card.append(media, content);
  return card;
}

async function updateWorkCount() {
  const count = document.querySelector("#workCount");
  if (count) count.textContent = String((await loadWorks()).length);
}

async function renderPublicWorks() {
  const section = document.querySelector("#savedWorksSection");
  const grid = document.querySelector("#publicWorkGrid");
  if (!section || !grid) return;

  const works = await loadWorks();
  grid.innerHTML = "";
  section.hidden = works.length === 0;

  works.slice(0, 12).forEach((work) => {
    grid.appendChild(createWorkCard(work));
  });
}

async function renderAdmin() {
  const libraryGrid = document.querySelector("#libraryGrid");
  const recentWorkGrid = document.querySelector("#recentWorkGrid");
  const previewEmpty = document.querySelector("#previewEmpty");
  if (!libraryGrid) return;

  const works = await loadWorks();
  libraryGrid.innerHTML = "";
  recentWorkGrid.innerHTML = "";

  works.forEach((work) => {
    libraryGrid.appendChild(createWorkCard(work, { canDelete: true }));
  });

  works.slice(0, 4).forEach((work) => {
    recentWorkGrid.appendChild(createWorkCard(work, { canDelete: true }));
  });

  if (previewEmpty) previewEmpty.hidden = works.length > 0;
  updateWorkCount();
}

async function handleUpload(event) {
  event.preventDefault();

  const fileInput = document.querySelector("#workFiles");
  const typeInput = document.querySelector("#workType");
  const seriesInput = document.querySelector("#workSeries");
  const urlInput = document.querySelector("#workUrl");
  const titleInput = document.querySelector("#workTitle");
  const descInput = document.querySelector("#workDesc");
  const roleInput = document.querySelector("#workRole");
  const resultInput = document.querySelector("#workResult");
  const notesInput = document.querySelector("#workNotes");
  const status = document.querySelector("#uploadStatus");

  if (!fileInput.files.length && !urlInput.value.trim() && !titleInput.value.trim() && !seriesInput.value.trim()) return;

  const formData = new FormData();
  Array.from(fileInput.files).forEach((file) => formData.append("files", file));
  formData.append("type", typeInput.value);
  formData.append("series", seriesInput.value);
  formData.append("externalUrl", urlInput.value);
  formData.append("title", titleInput.value);
  formData.append("description", descInput.value);
  formData.append("role", roleInput.value);
  formData.append("result", resultInput.value);
  formData.append("notes", notesInput.value);

  if (status) status.textContent = "正在保存文件...";
  const response = await fetch("/api/works", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    if (status) status.textContent = "上传失败，请检查文件后重试。";
    return;
  }

  event.target.reset();
  if (status) status.textContent = "已加入作品库。";
  renderAdmin();
}

async function downloadJson() {
  const works = await loadWorks();
  const blob = new Blob([JSON.stringify(works, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "portfolio-works.json";
  link.click();
  URL.revokeObjectURL(link.href);
}

function initAdmin() {
  const uploadForm = document.querySelector("#uploadForm");
  const exportButton = document.querySelector("#exportJson");
  const clearButton = document.querySelector("#clearLibrary");

  if (!uploadForm) return;

  uploadForm.addEventListener("submit", handleUpload);
  exportButton?.addEventListener("click", downloadJson);
  clearButton?.addEventListener("click", () => {
    alert("清空全部作品需要手动删除 data/works.json 和 data/uploads 中的文件，避免误删大量视频。");
  });
  renderAdmin();
}

function initVideoModal() {
  const modal = document.querySelector("#videoModal");
  const player = document.querySelector("#videoModalPlayer");
  if (!modal || !player) return;

  let activePreview = null;

  function closeModal() {
    modal.hidden = true;
    player.pause();
    player.removeAttribute("src");
    player.load();
    document.body.classList.remove("is-video-modal-open");
    document.dispatchEvent(new CustomEvent("portfolio:resume-previews"));

    if (activePreview) {
      activePreview = null;
    }
  }

  function openVideoModal(previewVideo) {
    const source =
      previewVideo.dataset.modalSrc ||
      previewVideo.currentSrc ||
      previewVideo.getAttribute("src");
    if (!source) return;

    activePreview = previewVideo;
    document.dispatchEvent(new CustomEvent("portfolio:pause-previews"));
    player.src = source;
    player.muted = false;
    player.controls = true;
    player.controlsList = "nodownload noplaybackrate";
    player.disablePictureInPicture = true;
    modal.hidden = false;
    document.body.classList.add("is-video-modal-open");
    player.focus();
    player.play().catch(() => {});
  }

  document.addEventListener("click", (event) => {
    const closeTarget = event.target.closest("[data-video-modal-close]");
    if (closeTarget) {
      closeModal();
      return;
    }

    const mediaCard = event.target.closest(".idea-board, .game-card");
    const previewVideo = event.target.closest("video") || mediaCard?.querySelector("video");
    if (!previewVideo || previewVideo === player || previewVideo.closest("#videoModal")) return;
    event.preventDefault();
    openVideoModal(previewVideo);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.hidden) closeModal();
  });
}

function initVideoHints() {
  const previewVideos = document.querySelectorAll("video[data-modal-src]");

  previewVideos.forEach((video) => {
    const host = video.parentElement;
    if (!host || host.querySelector(":scope > .video-view-hint")) return;

    host.classList.add("video-hint-host");

    const hint = document.createElement("div");
    hint.className = "video-view-hint";
    hint.setAttribute("aria-hidden", "true");

    const icon = document.createElement("i");
    icon.textContent = "▶";

    const label = document.createElement("b");
    label.textContent = "点击观看完整视频";

    hint.append(icon, label);
    host.appendChild(hint);
  });
}

function initLazyVideoPreviews() {
  const previewVideos = Array.from(document.querySelectorAll("video")).filter(
    (video) => !video.closest("#videoModal")
  );
  if (!previewVideos.length) return;

  const visibleVideos = new Set();
  const hoverVideos = new Set();
  const maxVisiblePlaying = 3;
  let previewsPaused = false;

  function prepareVideo(video) {
    video.removeAttribute("autoplay");
    video.preload = "none";
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.pause();
    video.addEventListener("loadedmetadata", () => {
      if (!video.dataset.firstFrameReady && video.readyState >= 1) {
        video.dataset.firstFrameReady = "true";
        video.currentTime = Math.min(0.05, video.duration || 0);
      }
    }, { once: true });
  }

  function loadVideo(video) {
    if (!video.dataset.previewLoaded) {
      video.dataset.previewLoaded = "true";
      video.load();
    }
  }

  function pauseVideo(video) {
    if (!video.paused) video.pause();
  }

  function playVideo(video) {
    loadVideo(video);
    video.play().catch(() => {});
  }

  function syncPlayback(priorityVideo = null) {
    if (previewsPaused) {
      previewVideos.forEach(pauseVideo);
      return;
    }

    const candidates = [
      ...hoverVideos,
      ...visibleVideos,
    ].filter((video, index, arr) => arr.indexOf(video) === index);
    if (priorityVideo && candidates.includes(priorityVideo)) {
      candidates.unshift(priorityVideo);
    }

    const hoverAllowed = new Set(hoverVideos);
    const allowed = new Set([
      ...hoverVideos,
      ...candidates.filter((video) => !hoverAllowed.has(video)).slice(0, maxVisiblePlaying),
    ]);
    previewVideos.forEach((video) => {
      if (allowed.has(video)) {
        playVideo(video);
      } else {
        if (visibleVideos.has(video)) loadVideo(video);
        pauseVideo(video);
      }
    });
  }

  previewVideos.forEach((video) => {
    prepareVideo(video);
    const hoverTarget = video.closest(
      ".idea-board, .best-card, .recent-shot, .game-card, .early-showcase, .ai-output-card, figure"
    ) || video;

    hoverTarget.addEventListener("mouseenter", () => {
      hoverVideos.add(video);
      syncPlayback(video);
    });
    hoverTarget.addEventListener("mouseleave", () => {
      hoverVideos.delete(video);
      syncPlayback();
    });
  });

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target;
          if (entry.isIntersecting && entry.intersectionRatio > 0.28) {
            visibleVideos.add(video);
          } else {
            visibleVideos.delete(video);
          }
        });
        syncPlayback();
      },
      { rootMargin: "180px 0px", threshold: [0, 0.28, 0.55] }
    );

    previewVideos.forEach((video) => observer.observe(video));
  } else {
    previewVideos.forEach((video) => visibleVideos.add(video));
    syncPlayback();
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      previewVideos.forEach(pauseVideo);
    } else {
      syncPlayback();
    }
  });

  document.addEventListener("portfolio:pause-previews", () => {
    previewsPaused = true;
    previewVideos.forEach(pauseVideo);
  });

  document.addEventListener("portfolio:resume-previews", () => {
    previewsPaused = false;
    syncPlayback();
  });
}

function initImageModal() {
  const modal = document.querySelector("#imageModal");
  const imageViewer = document.querySelector("#imageModalViewer");
  if (!modal || !imageViewer) return;

  function closeModal() {
    modal.hidden = true;
    imageViewer.hidden = true;
    imageViewer.removeAttribute("src");
    imageViewer.alt = "";
    document.body.classList.remove("is-image-modal-open");
  }

  function openImageModal(image) {
    const source = image.currentSrc || image.getAttribute("src");
    if (!source) return;

    imageViewer.src = source;
    imageViewer.alt = image.alt || "作品图片预览";
    imageViewer.hidden = false;
    modal.hidden = false;
    document.body.classList.add("is-image-modal-open");
  }

  document.addEventListener("click", (event) => {
    const closeTarget = event.target.closest("[data-image-modal-close]");
    if (closeTarget) {
      closeModal();
      return;
    }

    const previewImage = event.target.closest("img");
    if (
      !previewImage ||
      previewImage === imageViewer ||
      previewImage.closest("#imageModal") ||
      previewImage.closest(".game-icon")
    ) return;
    event.preventDefault();
    openImageModal(previewImage);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.hidden) closeModal();
  });
}

function initVideoProtection() {
  document.addEventListener("contextmenu", (event) => {
    if (event.target.closest("video, img")) event.preventDefault();
  });
}

renderPublicWorks();
initAdmin();
initVideoHints();
initLazyVideoPreviews();
initVideoModal();
initImageModal();
initVideoProtection();

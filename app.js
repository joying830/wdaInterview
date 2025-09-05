// ---------- CONFIGURE THIS URL to your Apps Script JSON endpoint ----------
const API_URL = 'https://script.google.com/macros/s/AKfycbwLysHgtHsozkodXaC6lj_0l9kdevkmnaO_1MXI69Dh9yB4vE6bddxPe4y_gZyrFPqQ/exec';

// 狀態變數
let isFirstLoad = true;
let currentSlideIdx = 0;

// 在 URL 後面加上 timestamp，確保每次請求都是新的
async function fetchData() {
  const url = `${API_URL}?t=${Date.now()}`;
  const resp = await fetch(url, { cache: 'no-store' });
  return resp.json();
}

/* =========================
 * 1. 背景：光點＋線條（Canvas）
 * ========================= */
function initBgCanvas() {
  const canvas = document.getElementById('bgCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const drawDecor = (w, h) => {
    ctx.clearRect(0, 0, w, h);

    const lineColor = 'rgba(246,197,74,0.28)';
    const dotCore   = 'rgba(246,197,74,0.90)';
    const dotHalo   = 'rgba(246,197,74,0.20)';

    const area = w * h;
    const lineCount = Math.max(22, Math.floor(area / 65000));
    const dotCount  = Math.max(38, Math.floor(area / 42000));

    // 線條
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1;
    for (let i = 0; i < lineCount; i++) {
      const horiz = Math.random() > 0.5;
      const len = 110 + Math.random() * 250;

      if (horiz) {
        const y = Math.random() * h;
        const x = Math.random() * (w - len);
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + len, y); ctx.stroke();

        if (Math.random() < 0.1) {
          const cx = x + len * (0.2 + Math.random() * 0.6);
          const vlen = 60 + Math.random() * 140;
          const dir = Math.random() > 0.5 ? 1 : -1;
          ctx.beginPath(); ctx.moveTo(cx, y); ctx.lineTo(cx, y + dir * vlen); ctx.stroke();
        }
      } else {
        const x = Math.random() * w;
        const y = Math.random() * (h - len);
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + len); ctx.stroke();

        if (Math.random() < 0.1) {
          const cy = y + len * (0.2 + Math.random() * 0.6);
          const hlen = 60 + Math.random() * 140;
          const dir = Math.random() > 0.5 ? 1 : -1;
          ctx.beginPath(); ctx.moveTo(x, cy); ctx.lineTo(x + dir * hlen, cy); ctx.stroke();
        }
      }
    }

    // 光點
    for (let i = 0; i < dotCount; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const r = 2 + Math.random() * 3.2;
      const haloR = r * (1.9 + Math.random() * 0.8);
      const g = ctx.createRadialGradient(x, y, 0, x, y, haloR);
      g.addColorStop(0, dotHalo);
      g.addColorStop(1, 'rgba(246,197,74,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, haloR, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = dotCore;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
  };

  const resizeCanvas = () => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    canvas.style.width = vw + 'px';
    canvas.style.height = vh + 'px';
    canvas.width = Math.floor(vw * dpr);
    canvas.height = Math.floor(vh * dpr);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    drawDecor(vw, vh);
  };

  resizeCanvas();
  window.addEventListener('resize', () => {
    clearTimeout(window.__bgResizeTimer);
    window.__bgResizeTimer = setTimeout(resizeCanvas, 200);
  });
}

/* =========================
 * 2. 讀取資料並渲染
 * ========================= */
async function loadData() {
  try {
    const { title, slides } = await fetchData();
    const titleEl = document.querySelector('.main-page-title');
    if (titleEl) titleEl.textContent = title;

    if (isFirstLoad) {
      renderSlides(slides);
      startCarousel();
      isFirstLoad = false;
    } else {
      updateSlidesData(slides);
    }
  } catch (e) {
    console.error('載入資料失敗：', e);
  }
}

/* =========================
 * 3a. 首次把整個輪播結構建好
 * ========================= */
function renderSlides(slides) {
  const container = document.getElementById('slideshowMasterContainer');
  container.innerHTML = '';
  slides.forEach((slide, i) => {
    const slideEl = document.createElement('div');
    slideEl.className = 'column-group-slide' + (i === 0 ? ' active' : '');
    slideEl.id = `slide-group-${i}`;

    const page = document.createElement('div');
    page.className = 'page-container-in-slide';

    slide.columnsData.forEach(col => {
      const colEl = document.createElement('div');
      colEl.className = 'column';
      let inner = `<div class="column-title">${col.title}</div>
                   <div class="column-content">`;

      if (col.error) {
        inner += `<p class="error-message">讀取「${col.title}」失敗：${col.error}</p>`;
      } else if (col.staticMessage) {
        inner += `<p class="static-message-content">${col.staticMessage}</p>`;
      } else if (col.data && col.data.length) {
        inner += `<table>
            <thead>
              <tr>
                <th>姓名</th>
                <th>完成<br>面試</th>
              </tr>
            </thead>
            <tbody>
              ${col.data.map(row => `
                <tr>
                  <td>${row.B}</td>
                  <td class="${row.C==='V'?'text-successGreen':''}">${row.C}</td>
                </tr>`).join('')}
            </tbody>
          </table>`;
      } else {
        inner += `<p class="no-data">（目前沒有「${col.originalSheetName}」的資料）</p>`;
      }

      inner += `</div>`;
      colEl.innerHTML = inner;
      page.appendChild(colEl);
    });

    slideEl.appendChild(page);
    container.appendChild(slideEl);
  });
}

/* =========================
 * 3b. 後續只更新每格的資料，不重置輪播
 * ========================= */
function updateSlidesData(slides) {
  slides.forEach((slide, i) => {
    const slideEl = document.getElementById(`slide-group-${i}`);
    if (!slideEl) return;

    slide.columnsData.forEach((col, j) => {
      const colEl = slideEl.querySelectorAll('.column')[j];
      if (!colEl) return;
      const contentEl = colEl.querySelector('.column-content');

      let inner = '';
      if (col.error) {
        inner = `<p class="error-message">讀取「${col.title}」失敗：${col.error}</p>`;
      } else if (col.staticMessage) {
        inner = `<p class="static-message-content">${col.staticMessage}</p>`;
      } else if (col.data && col.data.length) {
        inner = `<table>
          <thead>
            <tr>
              <th>姓名</th>
              <th>完成<br>面試</th>
            </tr>
          </thead>
          <tbody>
            ${col.data.map(row => `
              <tr>
                <td>${row.B}</td>
                <td class="${row.C==='V'?'text-successGreen':''}">${row.C}</td>
              </tr>`).join('')}
          </tbody>
        </table>`;
      } else {
        inner = `<p class="no-data">（目前沒有「${col.originalSheetName}」的資料）</p>`;
      }

      contentEl.innerHTML = inner;
    });
  });
}

/* =========================
 * 4. 自動捲動 & 輪播
 * ========================= */
const SLIDE_DURATION  = 30000, SCROLL_INTERVAL = 50;
let _scrollIntervals = [];

function clearAutoScroll() {
  _scrollIntervals.forEach(id => clearInterval(id));
  _scrollIntervals = [];
}
function startAutoScrollOnSlide(slideEl) {
  clearAutoScroll();
  const cols = Array.from(slideEl.querySelectorAll('.column-content'))
                    .filter(c => c.scrollHeight > c.clientHeight);
  if (!cols.length) return;

  const maxScroll = Math.max(...cols.map(c => c.scrollHeight - c.clientHeight));
  const ticks     = SLIDE_DURATION / SCROLL_INTERVAL;
  const step      = Math.ceil(maxScroll / ticks);

  cols.forEach(c => {
    const id = setInterval(() => {
      if (c.scrollTop + c.clientHeight < c.scrollHeight) {
        c.scrollTop = Math.min(c.scrollTop + step, c.scrollHeight - c.clientHeight);
      } else {
        c.scrollTop = 0;
      }
    }, SCROLL_INTERVAL);
    _scrollIntervals.push(id);
  });
}
function startCarousel() {
  const slides = document.querySelectorAll('.column-group-slide');
  const show = i => {
    slides.forEach((el, j) => {
      const active = i === j;
      el.classList.toggle('active', active);
      el.setAttribute('aria-hidden', active ? 'false' : 'true');
      if (active) startAutoScrollOnSlide(el);
    });
    currentSlideIdx = i;
  };
  show(0);
  if (slides.length > 1) {
    setInterval(() => {
      show((currentSlideIdx + 1) % slides.length);
    }, SLIDE_DURATION);
  }
}

/* =========================
 * 5. Init
 * ========================= */
document.addEventListener('DOMContentLoaded', () => {
  initBgCanvas();
  loadData();
  setInterval(loadData, 60000);  // 每 60 秒重新抓一次資料
});

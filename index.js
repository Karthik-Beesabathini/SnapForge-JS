document.body.classList.add('loading');

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    const preloader = document.getElementById('preloader');
    preloader.classList.add('hidden');
    document.body.classList.remove('loading');
  }, 1900);

  initCamera();

  if (isMobile) {
    const flipBtn = document.createElement('button');
    flipBtn.className = 'flip-camera-btn';
    flipBtn.title = 'Flip Camera';
    flipBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 7H4M4 7l3-3M4 7l3 3M4 17h16M16 17l3 3M16 17l3-3" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>Flip`;
    flipBtn.addEventListener('click', flipCamera);

    const cardHeader = document.querySelector('.card-header');
    const select = document.getElementById('numPhotos');
    cardHeader.insertBefore(flipBtn, select);
  }

  document.addEventListener('keydown', (e) => {
    if (e.code === 'Enter' || e.code === 'VolumeUp' || e.code === 'VolumeDown') {
      e.preventDefault();
      const btn = document.getElementById('captureBtn');
      if (!btn.disabled) takePhoto();
    }
  });

  document.getElementById('borderToggle').addEventListener('change', (e) => {
    document.querySelector('.border-toggle-text').style.opacity = e.target.checked ? '1' : '0.45';
  });
});

const themeToggle = document.getElementById('themeToggle');

const savedTheme = localStorage.getItem('snapforge-theme');
if (savedTheme === 'dark') {
  document.documentElement.classList.add('dark');
  themeToggle.checked = true;
}

themeToggle.addEventListener('change', () => {
  if (themeToggle.checked) {
    document.documentElement.classList.add('dark');
    localStorage.setItem('snapforge-theme', 'dark');
  } else {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('snapforge-theme', 'light');
  }
});

const video = document.getElementById('livePreview');
const captureCanvas = document.getElementById('captureCanvas');
let stream = null;
let currentFacingMode = 'user';

const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1);

async function initCamera(facingMode = 'user') {
  if (stream) {
    stream.getTracks().forEach(t => t.stop());
  }
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false
    });
    video.srcObject = stream;
    video.style.transform = facingMode === 'user' ? 'scaleX(-1)' : 'scaleX(1)';
  } catch (err) {
    console.error('Camera error:', err);
    alert('Could not access camera. Please allow camera permissions and try again.');
  }
}

async function flipCamera() {
  currentFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
  await initCamera(currentFacingMode);
}

function captureFrame() {
  const ctx = captureCanvas.getContext('2d');
  captureCanvas.width = video.videoWidth;
  captureCanvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0, captureCanvas.width, captureCanvas.height);

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.src = captureCanvas.toDataURL('image/jpeg', 0.92);
  });
}

let collectedPhotos = [];

window.takePhoto = function () {
  const numPhotos = parseInt(document.getElementById('numPhotos').value);
  document.getElementById('captureBtn').disabled = true;
  document.getElementById('downloadBtn').disabled = true;
  collectedPhotos = [];

  const container = document.getElementById('photoRectangles');
  container.innerHTML = '';

  for (let i = 0; i < numPhotos; i++) {
    const rect = document.createElement('div');
    rect.className = 'photo-rectangle';
    rect.id = `rect-${i}`;
    rect.textContent = `Photo ${i + 1}`;
    container.appendChild(rect);
  }

  captureSequence(numPhotos, 0);
};

function captureSequence(numPhotos, photoIndex) {
  if (photoIndex >= numPhotos) {
    makeCollage(collectedPhotos);
    return;
  }

  const currentRect = document.getElementById(`rect-${photoIndex}`);
  currentRect.classList.add('active');

  let countdown = 3;
  const countdownDiv = document.getElementById('countdown');
  countdownDiv.style.display = 'block';
  countdownDiv.textContent = countdown;

  const countdownInterval = setInterval(async () => {
    countdown--;
    if (countdown > 0) {
      countdownDiv.textContent = countdown;
    } else {
      clearInterval(countdownInterval);
      countdownDiv.style.display = 'none';

      const flash = document.getElementById('flash');
      flash.classList.add('active');
      setTimeout(() => flash.classList.remove('active'), 300);

      const img = await captureFrame();
      collectedPhotos.push(img);
      currentRect.classList.remove('active');
      currentRect.classList.add('captured');
      setTimeout(() => captureSequence(numPhotos, photoIndex + 1), 500);
    }
  }, 1000);
}

function makeCollage(images) {
  if (images.length === 0) return;
  const count = images.length;
  const w = images[0].width;
  const h = images[0].height;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  const bordersOn = document.getElementById('borderToggle').checked;
  const gap = bordersOn ? 18 : 0;
  const radius = bordersOn ? 22 : 0;
  const bg = '#ffffff';

  function roundedImage(img, x, y, iw, ih) {
    ctx.save();
    ctx.beginPath();
    if (radius > 0) {
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + iw - radius, y);
      ctx.quadraticCurveTo(x + iw, y, x + iw, y + radius);
      ctx.lineTo(x + iw, y + ih - radius);
      ctx.quadraticCurveTo(x + iw, y + ih, x + iw - radius, y + ih);
      ctx.lineTo(x + radius, y + ih);
      ctx.quadraticCurveTo(x, y + ih, x, y + ih - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
    } else {
      ctx.rect(x, y, iw, ih);
    }
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(img, x, y, iw, ih);
    ctx.restore();
  }

  if (count === 6) {
    canvas.width  = w * 3 + gap * 4;
    canvas.height = h * 2 + gap * 3;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    images.forEach((img, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      roundedImage(img, gap + col * (w + gap), gap + row * (h + gap), w, h);
    });
  } else if (count === 4) {
    canvas.width  = w * 2 + gap * 3;
    canvas.height = h * 2 + gap * 3;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    images.forEach((img, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      roundedImage(img, gap + col * (w + gap), gap + row * (h + gap), w, h);
    });
  } else if (count === 3) {
    canvas.width  = w * 3 + gap * 4;
    canvas.height = h + gap * 2;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    images.forEach((img, i) => {
      roundedImage(img, gap + i * (w + gap), gap, w, h);
    });
  } else if (count === 2) {
    canvas.width  = w * 2 + gap * 3;
    canvas.height = h + gap * 2;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    images.forEach((img, i) => {
      roundedImage(img, gap + i * (w + gap), gap, w, h);
    });
  }

  const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
  const resultImg = document.getElementById('result');
  resultImg.src = dataUrl;
  resultImg.style.display = 'block';

  document.getElementById('emptyState').style.display = 'none';
  document.getElementById('photoRectangles').innerHTML = '';
  document.getElementById('captureBtn').disabled = false;
  document.getElementById('downloadBtn').disabled = false;
}

window.downloadPhoto = function () {
  const img = document.getElementById('result').src;
  const a = document.createElement('a');
  a.href = img;
  a.download = 'collage.jpg';
  a.click();
};
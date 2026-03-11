document.body.classList.add('loading');

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    const preloader = document.getElementById('preloader');
    preloader.classList.add('hidden');
    document.body.classList.remove('loading');
  }, 1900);

  initCamera();
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

if (isMobile) {
  const flipBtn = document.createElement('button');
  flipBtn.className = 'flip-camera-btn';
  flipBtn.title = 'Flip Camera';
  flipBtn.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 7H4M4 7l3-3M4 7l3 3M4 17h16M16 17l3 3M16 17l3-3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
  flipBtn.addEventListener('click', flipCamera);
  document.querySelector('.capture-overlay').appendChild(flipBtn);
}

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

  if (count === 6) {
    canvas.width = w * 3; canvas.height = h * 2;
    images.forEach((img, i) => ctx.drawImage(img, (i % 3) * w, Math.floor(i / 3) * h, w, h));
  } else if (count === 4) {
    canvas.width = w * 2; canvas.height = h * 2;
    images.forEach((img, i) => ctx.drawImage(img, (i % 2) * w, Math.floor(i / 2) * h, w, h));
  } else if (count === 3) {
    canvas.width = w * 3; canvas.height = h;
    images.forEach((img, i) => ctx.drawImage(img, i * w, 0, w, h));
  } else if (count === 2) {
    canvas.width = w * 2; canvas.height = h;
    images.forEach((img, i) => ctx.drawImage(img, i * w, 0, w, h));
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
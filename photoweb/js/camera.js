const camera = document.querySelector('#camera');
const photo = document.querySelector('#photo');
const frameImage = document.querySelector('.frame-image');
const output = document.querySelector('#output');
const context = output.getContext('2d');

const startPanel = document.querySelector('#start');
const errorMessage = document.querySelector('#error');
const countdown = document.querySelector('#countdown');
const flash = document.querySelector('#flash');
const shootControls = document.querySelector('#shootControls');
const resultControls = document.querySelector('#resultControls');

let mediaStream;
let facingMode = 'user';
let photoBlob;
let photoUrl;

const OUTPUT_WIDTH = 1080;
const OUTPUT_HEIGHT = 1440;

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.style.display = 'block';
}

function hideError() {
  errorMessage.style.display = 'none';
}

async function openCamera() {
  hideError();

  if (!navigator.mediaDevices?.getUserMedia) {
    showError('このブラウザではカメラを使用できません。SafariまたはChromeで開いてください。');
    return;
  }

  mediaStream?.getTracks().forEach((track) => track.stop());

  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: facingMode },
        width: { ideal: 1920 },
        height: { ideal: 1440 }
      },
      audio: false
    });

    camera.srcObject = mediaStream;
    camera.classList.toggle('is-mirrored', facingMode === 'user');
    await camera.play();
    startPanel.hidden = true;
  } catch (error) {
    showError('カメラを起動できませんでした。ブラウザの設定でカメラを許可してください。');
  }
}

function getCoverCrop(sourceWidth, sourceHeight, targetWidth, targetHeight) {
  const sourceRatio = sourceWidth / sourceHeight;
  const targetRatio = targetWidth / targetHeight;

  if (sourceRatio > targetRatio) {
    const width = sourceHeight * targetRatio;
    return [(sourceWidth - width) / 2, 0, width, sourceHeight];
  }

  const height = sourceWidth / targetRatio;
  return [0, (sourceHeight - height) / 2, sourceWidth, height];
}

function drawSpacedText(text, x, y, font, color, spacing) {
  context.save();
  context.font = font;
  context.fillStyle = color;
  context.textBaseline = 'middle';
  context.shadowColor = 'rgba(0, 17, 54, .75)';
  context.shadowBlur = 18;

  const characters = [...text];
  const widths = characters.map((character) => context.measureText(character).width);
  const totalWidth = widths.reduce((total, width) => total + width, 0) + spacing * (characters.length - 1);
  let positionX = x - totalWidth / 2;

  characters.forEach((character, index) => {
    context.fillText(character, positionX, y);
    positionX += widths[index] + spacing;
  });

  context.restore();
}

function drawFrameCopy() {
  drawSpacedText('WE DID IT!', OUTPUT_WIDTH / 2, 87, '900 29px system-ui, sans-serif', '#dbe8ff', 7);

  context.save();
  context.fillStyle = '#ffffff';
  context.font = '950 76px "Noto Sans JP", system-ui, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.shadowColor = 'rgba(0, 17, 54, .75)';
  context.shadowBlur = 18;
  context.fillText('祝 黒字化達成', OUTPUT_WIDTH / 2, 154);
  context.restore();

  drawSpacedText('THANK YOU, EVERYONE!', OUTPUT_WIDTH / 2, OUTPUT_HEIGHT - 79, '900 28px system-ui, sans-serif', '#ffffff', 5);
}

async function runCountdown() {
  for (const number of [3, 2, 1]) {
    countdown.textContent = number;
    countdown.classList.add('is-visible');
    await new Promise((resolve) => setTimeout(resolve, 650));
  }
  countdown.classList.remove('is-visible');
}

async function takePhoto() {
  if (!mediaStream || camera.readyState < 2) return;

  document.querySelector('#shutter').disabled = true;
  await runCountdown();

  if (!frameImage.complete) {
    await frameImage.decode();
  }

  const crop = getCoverCrop(
    camera.videoWidth,
    camera.videoHeight,
    OUTPUT_WIDTH,
    OUTPUT_HEIGHT
  );

  context.clearRect(0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);
  context.save();

  if (facingMode === 'user') {
    context.translate(OUTPUT_WIDTH, 0);
    context.scale(-1, 1);
  }

  context.drawImage(camera, ...crop, 0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);
  context.restore();
  context.drawImage(frameImage, 0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);
  drawFrameCopy();

  photoBlob = await new Promise((resolve) => output.toBlob(resolve, 'image/jpeg', 0.94));
  photoUrl = URL.createObjectURL(photoBlob);
  photo.src = photoUrl;
  photo.style.display = 'block';
  camera.style.display = 'none';

  flash.classList.remove('is-active');
  void flash.offsetWidth;
  flash.classList.add('is-active');

  shootControls.hidden = true;
  resultControls.hidden = false;
  document.querySelector('#shutter').disabled = false;
}

function retakePhoto() {
  photo.style.display = 'none';
  camera.style.display = 'block';
  shootControls.hidden = false;
  resultControls.hidden = true;

  if (photoUrl) URL.revokeObjectURL(photoUrl);
  photo.removeAttribute('src');
  photoBlob = undefined;
  photoUrl = undefined;
}

async function savePhoto() {
  if (!photoBlob) return;

  const filename = `kuroji-celebration-${Date.now()}.jpg`;
  const file = new File([photoBlob], filename, { type: 'image/jpeg' });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: '黒字化記念フォト' });
      return;
    } catch (error) {
      if (error.name === 'AbortError') return;
    }
  }

  const download = document.createElement('a');
  download.href = photoUrl;
  download.download = filename;
  document.body.appendChild(download);
  download.click();
  download.remove();
}

document.querySelector('#startCamera').addEventListener('click', openCamera);
document.querySelector('#switchCamera').addEventListener('click', async () => {
  facingMode = facingMode === 'user' ? 'environment' : 'user';
  await openCamera();
});
document.querySelector('#shutter').addEventListener('click', takePhoto);
document.querySelector('#retake').addEventListener('click', retakePhoto);
document.querySelector('#save').addEventListener('click', savePhoto);

window.addEventListener('pagehide', () => {
  mediaStream?.getTracks().forEach((track) => track.stop());
  if (photoUrl) URL.revokeObjectURL(photoUrl);
});

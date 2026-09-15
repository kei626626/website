const camera = document.querySelector('#camera');
const photo = document.querySelector('#photo');
const frameImage = document.querySelector('.frame-image');
const output = document.querySelector('#output');
const context = output.getContext('2d');

const frameSelection = document.querySelector('#frameSelection');
const cameraApp = document.querySelector('#cameraApp');
const errorMessage = document.querySelector('#error');
const flash = document.querySelector('#flash');
const shootControls = document.querySelector('#shootControls');
const resultControls = document.querySelector('#resultControls');

let mediaStream;
let facingMode = 'environment';
let activeFacingMode = 'environment';
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
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { exact: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1440 }
        },
        audio: false
      });
    } catch (exactCameraError) {
      mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1440 }
        },
        audio: false
      });
    }

    camera.srcObject = mediaStream;
    activeFacingMode = mediaStream.getVideoTracks()[0]?.getSettings().facingMode || facingMode;
    camera.classList.toggle('is-mirrored', activeFacingMode === 'user');
    await camera.play();
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

async function takePhoto() {
  if (!mediaStream || camera.readyState < 2) return;

  document.querySelector('#shutter').disabled = true;

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

  if (activeFacingMode === 'user') {
    context.translate(OUTPUT_WIDTH, 0);
    context.scale(-1, 1);
  }

  context.drawImage(camera, ...crop, 0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);
  context.restore();
  context.drawImage(frameImage, 0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);

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

async function selectFrame(framePath) {
  facingMode = 'environment';
  activeFacingMode = 'environment';
  frameImage.src = framePath;
  frameSelection.hidden = true;
  cameraApp.hidden = false;
  shootControls.hidden = false;
  resultControls.hidden = true;
  await openCamera();
}

function backToFrameSelection() {
  mediaStream?.getTracks().forEach((track) => track.stop());
  mediaStream = undefined;
  camera.srcObject = null;
  hideError();

  if (photoUrl) URL.revokeObjectURL(photoUrl);
  photo.removeAttribute('src');
  photo.style.display = 'none';
  camera.style.display = 'block';
  photoBlob = undefined;
  photoUrl = undefined;

  cameraApp.hidden = true;
  frameSelection.hidden = false;
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

document.querySelectorAll('.frame-option').forEach((button) => {
  button.addEventListener('click', () => selectFrame(button.dataset.frame));
});
document.querySelector('#switchCamera').addEventListener('click', async () => {
  facingMode = facingMode === 'user' ? 'environment' : 'user';
  await openCamera();
});
document.querySelector('#shutter').addEventListener('click', takePhoto);
document.querySelector('#backBeforeShoot').addEventListener('click', backToFrameSelection);
document.querySelector('#retake').addEventListener('click', retakePhoto);
document.querySelector('#save').addEventListener('click', savePhoto);
document.querySelector('#backToIndex').addEventListener('click', backToFrameSelection);

window.addEventListener('pagehide', () => {
  mediaStream?.getTracks().forEach((track) => track.stop());
  if (photoUrl) URL.revokeObjectURL(photoUrl);
});

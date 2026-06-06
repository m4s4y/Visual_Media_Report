
import Canvas from "./canvas.js";

const WIDTH = 1280;
const HEIGHT = 720;

let contourOn = false;


class App {
  canvas = new Canvas(WIDTH, HEIGHT);

  constructor() {

  }
};

// create application instance
const app = new App();

// let mediaPlane = document.getElementById('media');
let konvaPlane = document.getElementById('konva');
let opencvPlane = document.getElementById('opencv');


// color picker
let colorPicker = document.getElementById('color-picker');
colorPicker.value = '#FFFFFF'
window.color = '#FFFFFF';
colorPicker.addEventListener('change', e => {
  // console.log(e.target.value);
  window.color = e.target.value;
});


// thickness
window.thickness = 5
let thickness = document.getElementById('thickness');
thickness.value = '40';
thickness.addEventListener('change', e => {
  // console.log(e.target.value);
  let val = e.target.value / 10;
  val += 1;
  window.thickness = val;
})

const selectButton = document.getElementById('select_button');
let isSelecting = false;
const drawButton = document.getElementById('draw_button');
const frameButton = document.getElementById('frame_button');
const saveButton = document.getElementById('save_button');
const emitButton = document.getElementById('emit_button');
const motionButton = document.getElementById('motion_dropdown');
const actionButton = document.getElementById('action_dropdown');
const contourButton = document.getElementById('contour_button');


drawButton.setAttribute('disabled', 'true');
frameButton.setAttribute('disabled', 'true');
saveButton.setAttribute('disabled', 'true');
emitButton.setAttribute('disabled', 'true');
motionButton.setAttribute('disabled', 'true');
actionButton.setAttribute('disabled', 'true');

const disableAll = () => {
  selectButton.setAttribute('disabled', 'true');
  drawButton.setAttribute('disabled', 'true');
  frameButton.setAttribute('disabled', 'true');
  saveButton.setAttribute('disabled', 'true');
  emitButton.setAttribute('disabled', 'true');
  motionButton.setAttribute('disabled', 'true');
  actionButton.setAttribute('disabled', 'true');
}
// hook buttons and handler
// --- 修正後の select 関数 ---
const select = () => {
  if (isSelecting) {
    // 【キャンセル処理】既にSelectモードなら、元のDrawモードに戻す
    isSelecting = false;
    opencvPlane.style.zIndex = "0"; // 映像レイヤーを後ろに下げる
    konvaPlane.style.zIndex = "1";  // お絵かきレイヤーを前に戻す
    
    // Selectボタンの見た目を元に戻し、Drawボタン等も必要に応じて有効化
    selectButton.classList.remove('active'); // （※もしCSSにactiveクラスがあれば）
    console.log("Selectモードをキャンセルしました");
  } else {
    // 【選択処理】Selectモードに入る
    isSelecting = true;
    opencvPlane.style.zIndex = "1";
    konvaPlane.style.zIndex = "0";
    
    disableAll(); 
    // 【重要】キャンセルできるように、Selectボタンだけは有効（disabled解除）にしておく
    selectButton.removeAttribute('disabled');
    
    console.log("Selectモードに入りました。対象をクリックするか、もう一度Selectを押してキャンセルしてください");
  }
}
selectButton?.addEventListener('click', select)

// --- 修正後の draw 関数（自動的にSelectモードを解除する連携） ---
const draw = () => {
  isSelecting = false; // お絵かきモードに入るのでフラグを折る
  opencvPlane.style.zIndex = "0";
  konvaPlane.style.zIndex = "1";
}
drawButton?.addEventListener('click', draw)

// this function should add a new frame
const frame = () => {
  app.canvas.add_frame(bodyParts);
}
frameButton?.addEventListener('click', frame)


// register button event handlers
const save = () => {
  app.canvas.add_frame(bodyParts);
  app.canvas.finish_animation("bind");
  disableAll();
  selectButton.removeAttribute('disabled');
}
saveButton?.addEventListener('click', save)


const emit = () => {
  app.canvas.add_frame(bodyParts);
  app.canvas.finish_animation();
  app.canvas.mode = "emit";

  disableAll();
}
emitButton?.addEventListener('click', emit)

const motion = (e) => {
  app.canvas.new_motion(e.target.innerHTML.toLowerCase());
  disableAll();
  selectButton.removeAttribute('disabled');
  document.getElementById('motion_button').classList.remove("show");
}
document.getElementById('motion_button')?.addEventListener('click', motion)


const action = (e) => {
  app.canvas.add_frame(bodyParts);
  app.canvas.action_setup(e.target.innerHTML);
  disableAll();
  selectButton.removeAttribute('disabled');
  document.getElementById('action_button').classList.remove("show");
}
document.getElementById('action_button')?.addEventListener('click', action)


const contour = (e) => {
  if (e.target.innerHTML === 'Full Body') {
    contourOn = !contourOn;
  }
  else if (e.target.innerHTML === 'Line Around') {
    app.canvas.new_contour('line around');
  }
  else if (e.target.innerHTML === "Bottom Up") {
    app.canvas.new_contour('bottom up');
  }
}
contourButton?.addEventListener('click', contour)


const undo = () => {
  app.canvas.undo();
}
document.getElementById('undo_button').addEventListener('click', undo)



// end of buttons' registration
const inputVideo = document.getElementById('input_video');
const inputVideo2 = document.getElementById('input_video_2');
const videoElement = document.getElementById("input_video");
const canvasElement = document.getElementById("output_canvas");
const canvasCtx = canvasElement.getContext("2d");
const cvOutput = document.getElementById("canvasOutput");


const MIN_VISIBILITY = 0.8;

// --- 【追加】属人化ハイブリッド追跡用の変数 ---
let TARGET_COLOR_LOW = null;  // 追跡する色の下限 (HSV)
let TARGET_COLOR_HIGH = null; // 追跡する色の上限 (HSV)
const DISTANCE_THRESHOLD = 300; // 本人だと判定する距離の閾値（ピクセル）
// ----------------------------------------------

let bodyParts;

window.contourThickness = 5;
let fpsCountDown = 5;

cvOutput.addEventListener("click", (e) => {
  let theClosetPart;

  // loop through all the body parts to find the closet part to the clicking point
  for (let i = 0; i < bodyParts.length; i++) {
    let thisPart = bodyParts[i];

    // check if the part is visible at all
    if (thisPart.visibility > MIN_VISIBILITY) {
      if (!theClosetPart) {
        theClosetPart = i;
      }
      else {
        let dis1 = Math.pow(bodyParts[theClosetPart].x * WIDTH - e.layerX, 2) + Math.pow(bodyParts[theClosetPart].y * HEIGHT - e.layerY, 2);
        let dis2 = Math.pow(thisPart.x * WIDTH - e.layerX, 2) + Math.pow(thisPart.y * HEIGHT - e.layerY, 2);


        if (dis2 < dis1) {
          theClosetPart = i;
        }
      }
    }
  }

  if (theClosetPart) {
    // --- 【追加】骨格構造から「胸」の位置を計算し、服の色を自動抽出する ---
    if (bodyParts[11] && bodyParts[12] && bodyParts[23] && bodyParts[24]) {
      // 1. 両肩(11,12)と両腰(23,24)の中間点（胸）の座標を計算
      let chestX = Math.floor(((bodyParts[11].x + bodyParts[12].x + bodyParts[23].x + bodyParts[24].x) / 4) * WIDTH);
      let chestY = Math.floor(((bodyParts[11].y + bodyParts[12].y + bodyParts[23].y + bodyParts[24].y) / 4) * HEIGHT);

      // 2. 安全に元の映像(inputVideo)から色を取得するための不可視キャンバスを作成
      let tempCanvas = document.createElement('canvas');
      tempCanvas.width = WIDTH;
      tempCanvas.height = HEIGHT;
      let tempCtx = tempCanvas.getContext('2d');
      tempCtx.drawImage(videoElement, 0, 0, WIDTH, HEIGHT);
      
      // 3. 胸の座標のピクセル色（RGB）を取得
      let pixelData = tempCtx.getImageData(chestX, chestY, 1, 1).data;
      let r = pixelData[0], g = pixelData[1], b = pixelData[2];

      // 4. RGBをHSVに変換（OpenCV.jsを使用）
      let rgbMat = new cv.Mat(1, 1, cv.CV_8UC3);
      rgbMat.data.set([r, g, b]);
      let hsvMat = new cv.Mat();
      cv.cvtColor(rgbMat, hsvMat, cv.COLOR_RGB2HSV);
      
      let h = hsvMat.data[0], s = hsvMat.data[1], v = hsvMat.data[2];

      // 5. 取得した服の色をアンカーとして登録（Hは±15、SとVは影を考慮して広めに）
      TARGET_COLOR_LOW = [Math.max(0, h - 15), Math.max(40, s - 60), Math.max(40, v - 60), 0];
      TARGET_COLOR_HIGH = [Math.min(180, h + 15), 255, 255, 0];

      console.log(`服の色（胸の位置）を登録: RGB(${r},${g},${b}) -> HSV(${h},${s},${v})`);
      
      rgbMat.delete(); hsvMat.delete(); // メモリ解放
    } else {
      console.warn("胴体の関節が認識できないため、服の色の登録をスキップしました");
    }
    // -------------------------------------------------------------
    app.canvas.select(theClosetPart, bodyParts[theClosetPart]);
    drawButton.removeAttribute('disabled');
    motionButton.removeAttribute('disabled');
    draw();
  }
})

let cap = new cv.VideoCapture(videoElement);

// event loop
function onResults(results) {
  if (!results.poseLandmarks) {
    return;
  }

  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  canvasCtx.drawImage(
    results.segmentationMask,
    0,
    0,
    canvasElement.width,
    canvasElement.height
  );


  // get
  let contourData = canvasCtx.getImageData(0, 0, canvasElement.width, canvasElement.height);

  let src = cv.matFromImageData(contourData);
  let dst = new cv.Mat(canvasElement.height, canvasElement.width, cv.CV_8UC4);
  cap.read(dst);

  cv.cvtColor(src, src, cv.COLOR_RGBA2GRAY, 0);
  let contours = new cv.MatVector();
  let hierarchy = new cv.Mat();
  cv.findContours(src, contours, hierarchy, cv.RETR_CCOMP, cv.CHAIN_APPROX_SIMPLE);

  let maxArea = 0;
  let maxCnt = null;
  for (let i = 0; i < contours.size(); i++) {
    let cnt = contours.get(i);
    let area = cv.contourArea(cnt, false);

    if (area > maxArea) {
      maxArea = area
      maxCnt = cnt
    }
  }

  let contourPoints = []

  if (maxCnt) {
    contourPoints = [...maxCnt.data32S];
  }

  if (contourOn && maxCnt) {
    let toDraw = new cv.MatVector();
    toDraw.push_back(maxCnt);
    let color = new cv.Scalar(Math.round(Math.random() * 255), Math.round(Math.random() * 255),
      Math.round(Math.random() * 255));


    for (let i = 0; i < toDraw.size(); ++i) {
      cv.drawContours(dst, toDraw, i, color, window.contourThickness, cv.LINE_8, new cv.Mat(), 0);
      if (window.contourThickness < 0) {
        if (fpsCountDown > 0) {
          fpsCountDown -= 1;
        }
        else {
          fpsCountDown = 5;
          window.contourThickness = 5;
        }
      }
    }

    toDraw.delete();
  }

  cv.imshow('canvasOutput', dst);
  src.delete();
  dst.delete();
  contours.delete();
  hierarchy.delete();


  canvasCtx.restore();
  bodyParts = results.poseLandmarks;

  // --- 【追加】アンカー距離による属人化フィルタリング ---
  let shouldUpdate = true; // 描画を更新してよいかどうかのフラグ

  // ターゲット色が登録されており、かつ骨格が検出されている場合のみチェック
  if (TARGET_COLOR_LOW !== null && bodyParts && bodyParts[11] && bodyParts[12]) {
    
    // 1. OpenCVで現在のフレームからターゲット色の重心（アンカー）を探す
    let frameMat = new cv.Mat(canvasElement.height, canvasElement.width, cv.CV_8UC4);
    cap.read(frameMat);
    let hsv = new cv.Mat();
    cv.cvtColor(frameMat, hsv, cv.COLOR_RGBA2RGB);
    cv.cvtColor(hsv, hsv, cv.COLOR_RGB2HSV);
    
    // --- 【ここを修正】hsv.CV_8UC3 を cv.CV_8UC3 に変更し、安全なScalarに変換 ---
    let lowColor = new cv.Scalar(TARGET_COLOR_LOW[0], TARGET_COLOR_LOW[1], TARGET_COLOR_LOW[2], 0);
    let highColor = new cv.Scalar(TARGET_COLOR_HIGH[0], TARGET_COLOR_HIGH[1], TARGET_COLOR_HIGH[2], 0);
    
    let low = new cv.Mat(hsv.rows, hsv.cols, cv.CV_8UC3, lowColor);
    let high = new cv.Mat(hsv.rows, hsv.cols, cv.CV_8UC3, highColor);
    // --------------------------------------------------------------------------
    
    let mask = new cv.Mat();
    cv.inRange(hsv, low, high, mask); // 色の抽出
    
    let colorContours = new cv.MatVector();
    let colorHierarchy = new cv.Mat();
    cv.findContours(mask, colorContours, colorHierarchy, cv.RETR_CCOMP, cv.CHAIN_APPROX_SIMPLE);
    
    let anchorX = -1, anchorY = -1;
    let maxColorArea = 0;
    let maxColorCnt = null;
    
    for (let i = 0; i < colorContours.size(); i++) {
      let cnt = colorContours.get(i);
      let area = cv.contourArea(cnt, false);
      if (area > maxColorArea) {
        maxColorArea = area;
        maxColorCnt = cnt;
      }
    }
    
    if (maxColorCnt && maxColorArea > 500) { // ノイズ除去
      let M = cv.moments(maxColorCnt, false);
      if (M.m00 !== 0) {
        anchorX = Math.floor(M.m10 / M.m00);
        anchorY = Math.floor(M.m01 / M.m00);
      }
    }
    
    frameMat.delete(); hsv.delete(); low.delete(); high.delete(); mask.delete(); colorContours.delete(); colorHierarchy.delete();

    // 2. アンカーが見つかった場合、MediaPipeの人物中心（両肩の中点）との距離を測る
    if (anchorX !== -1 && anchorY !== -1) {
      let midShoulderX = ((bodyParts[11].x + bodyParts[12].x) / 2) * WIDTH;
      let midShoulderY = ((bodyParts[11].y + bodyParts[12].y) / 2) * HEIGHT;
      
      let distance = Math.sqrt(Math.pow(midShoulderX - anchorX, 2) + Math.pow(midShoulderY - anchorY, 2));
      
      // 3. 距離が閾値を超えていたら「別人（IDスイッチ）」とみなして更新を止める
      if (distance > DISTANCE_THRESHOLD) {
        shouldUpdate = false;
      }
    } else {
      // ターゲット色が見つからない（画面外に出た等）場合も更新を止める
      shouldUpdate = false;
    }
  }
  // -------------------------------------------------------------

  // 【修正】shouldUpdate が true の時だけ、既存の描画更新処理を走らせる
  if (shouldUpdate) {
    app.canvas.update_highlights(bodyParts);
    app.canvas.update(bodyParts, contourPoints);
  }
}

const pose = new Pose({
  locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
  }
});

pose.setOptions({
  modelComplexity: 1,
  smoothLandmarks: true,
  enableSegmentation: true,
  smoothSegmentation: true,
  minDetectionConfidence: 0.8,
  minTrackingConfidence: 0.8
});


pose.onResults(onResults);
window.pose = pose

window.inputVideo = inputVideo
inputVideo.oncanplay = () => {
  inputVideo.play()
  window.init()
}

const videoSlider = document.getElementById('video-slider')
const videoButton = document.getElementById('video-button')
videoButton.onclick = () => {
  if (inputVideo.paused) {
    inputVideo.play()
  } else {
    inputVideo.pause()
  }
}
videoSlider.oninput = (event) => {
  videoSlider.value = event.target.value
  inputVideo.currentTime = videoSlider.value / 100 * inputVideo.duration
}

window.init = () => {
  pose.initialize()
  pose.reset()
  setInterval(async () => {
    try {
      await pose.send({ image: inputVideo })
      let current = inputVideo.currentTime / inputVideo.duration
      // console.log(current)
      videoSlider.value = current * 100
    } catch (err) {
      console.log('error')
    }
  }, 100)
}

// setTimeout(() => {
//   console.log('start')
//   window.init()
// }, 3000)

/*
const camera = new Camera(inputVideo2, {
  onFrame: async () => {
    window.input = inputVideo
    await pose.send({ image: new Image() });
  },
  width: WIDTH,
  height: HEIGHT,
  facingMode: 'environment'
});

camera.start();
*/
const video = document.getElementById("camera");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let wakeLock = null;

async function keepAwake() {
    try {
        if ("wakeLock" in navigator) {
            wakeLock = await navigator.wakeLock.request("screen");
        }
    } catch (e) {}
}

async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: {
                    ideal: "environment"
                },
                width: {
                    ideal: 1920
                },
                height: {
                    ideal: 1080
                }
            },
            audio: false
        });

        video.srcObject = stream;

        await video.play();

        keepAwake();

        resizeCanvas();

        requestAnimationFrame(render);

    } catch (e) {

        alert("카메라를 사용할 수 없습니다.");

        console.log(e);

    }
}

function resizeCanvas() {

    canvas.width = window.innerWidth;

    canvas.height = window.innerHeight;

}

window.addEventListener("resize", resizeCanvas);

document.addEventListener("visibilitychange", () => {

    if (document.visibilityState === "visible") {

        keepAwake();

    }

});

let t = 0;

const DISTORTION = 0.02;

const SPIRAL = 0.008;

const ZOOM = 1.01;

function render() {

    t += 0.01;

    ctx.clearRect(0,0,canvas.width,canvas.height);

    const w = canvas.width;
    const h = canvas.height;

    const cx = w / 2;
    const cy = h / 2;

    const dx = Math.sin(t * 0.7) * 2;
    const dy = Math.cos(t * 0.6) * 2;

    ctx.save();

    ctx.translate(cx, cy);

    ctx.rotate(Math.sin(t * 0.2) * SPIRAL);

    ctx.scale(ZOOM + Math.sin(t) * DISTORTION, ZOOM + Math.cos(t) * DISTORTION);

    ctx.translate(-cx + dx, -cy + dy);

    ctx.drawImage(video, 0, 0, w, h);

    ctx.restore();
        // 가장자리 왜곡(약한 소용돌이 느낌)
    const img = ctx.getImageData(0, 0, w, h);
    const data = img.data;

    const copy = new Uint8ClampedArray(data);

    for (let y = 0; y < h; y += 2) {

        for (let x = 0; x < w; x += 2) {

            const rx = x - cx;
            const ry = y - cy;

            const r = Math.sqrt(rx * rx + ry * ry);

            // 화면 가장자리만 왜곡
            const amount = Math.min(r / Math.max(w, h), 1);

            const angle = amount * amount * 0.06;

            const sx = Math.cos(angle) * rx - Math.sin(angle) * ry + cx;
            const sy = Math.sin(angle) * rx + Math.cos(angle) * ry + cy;

            const ix = Math.floor(sx);
            const iy = Math.floor(sy);

            if (ix >= 0 && iy >= 0 && ix < w && iy < h) {

                const src = (iy * w + ix) * 4;
                const dst = (y * w + x) * 4;

                data[dst] = copy[src];
                data[dst + 1] = copy[src + 1];
                data[dst + 2] = copy[src + 2];
                data[dst + 3] = 255;

            }

        }

    }

    ctx.putImageData(img, 0, 0);

    requestAnimationFrame(render);

}

startCamera();
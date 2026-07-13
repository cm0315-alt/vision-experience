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

const DISTORTION = 0.01;

const SPIRAL = 0.03;

const ZOOM = 1.015;

function render() {

    t += 0.01;

    ctx.clearRect(0,0,canvas.width,canvas.height);

    const w = canvas.width;
    const h = canvas.height;

    const cx = w / 2;
    const cy = h / 2;

    const dx = Math.sin(t * 0.7) * 0.15;
    const dy = Math.cos(t * 0.6) * 0.15;

const angle = Math.sin(t * 0.35) * 0.012;

const scale =
    1.015 +
    Math.sin(t * 0.5) * 0.004;

ctx.save();

ctx.translate(cx, cy);

ctx.rotate(angle);

ctx.scale(scale, scale);

ctx.translate(-cx + dx, -cy + dy);

ctx.drawImage(video,0,0,w,h);

ctx.restore();
        // 가장자리 왜곡(약한 소용돌이 느낌)
    const img = ctx.getImageData(0, 0, w, h);

    ctx.putImageData(img, 0, 0);

    requestAnimationFrame(render);

}

startCamera();
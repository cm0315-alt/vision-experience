const video = document.getElementById("camera");
const canvas = document.getElementById("canvas");

// 1. WebGL 컨텍스트 초기화
const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
if (!gl) {
    alert("이 브라우저는 WebGL을 지원하지 않습니다.");
}

let wakeLock = null;

async function keepAwake() {
    try {
        if ("wakeLock" in navigator) {
            wakeLock = await navigator.wakeLock.request("screen");
        }
    } catch (e) {}
}

// 2. WebGL 셰이더 소스 정의
const vsSource = `
    attribute vec2 position;
    varying vec2 vUv;
    void main() {
        vUv = position * 0.5 + 0.5;
        gl_Position = vec4(position, 0.0, 1.0);
    }
`;

const fsSource = `
    precision mediump float;
    varying vec2 vUv;
    uniform sampler2D uTexture;
    uniform float uTime;

    void main() {
        vec2 uv = vUv - 0.5;
        float dist = length(uv);

        // --- 시지각 장애 체험용 나선형 소용돌이 공식 ---
        float twistStrength = 1.8; // 숫자가 클수록 더 심하게 비틀어집니다.
        float angle = dist * twistStrength + sin(uTime * 0.5) * 0.15;
        
        float s = sin(angle);
        float c = cos(angle);
        
        vec2 distortedUv = vec2(uv.x * c - uv.y * s, uv.x * s + uv.y * c);

        // 실시간으로 시각 정보의 위치가 미세하게 엇나가도록 파동(Wave) 추가
        distortedUv.x += sin(uTime * 1.2) * 0.01;
        distortedUv.y += cos(uTime * 1.0) * 0.01;

        // 외곽 여백이 잘려 나가는 것을 방지하기 위한 강제 줌인
        distortedUv *= 0.90;

        distortedUv += 0.5;

        if (distortedUv.x >= 0.0 && distortedUv.x <= 1.0 && distortedUv.y >= 0.0 && distortedUv.y <= 1.0) {
            gl_FragColor = texture2D(uTexture, distortedUv);
        } else {
            gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
        }
    }
`;

// 3. 셰이더 컴파일 및 빌드 함수
function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

const vertexShader = createShader(gl, gl.VERTEX_SHADER, vsSource);
const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fsSource);

const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);

if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("WebGL 프로그램 링크 실패");
}
gl.useProgram(program);

// 4. 화면용 사각형 버퍼 데이터 설정
const positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1,  1, -1, -1,  1,
    -1,  1,  1, -1,  1,  1,
]), gl.STATIC_DRAW);

const positionLocation = gl.getAttribLocation(program, "position");
gl.enableVertexAttribArray(positionLocation);
gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

// 5. 실시간 카메라용 비디오 텍스처 초기화
const texture = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, texture);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

const timeLocation = gl.getUniformLocation(program, "uTime");

async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: { ideal: "environment" },
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            },
            audio: false
        });

        video.srcObject = stream;
        await video.play();

        keepAwake();
        resizeCanvas();
        requestAnimationFrame(render);
    } catch (e) {
        alert("카메라 권한이 필요하거나 사용할 수 없습니다.");
        console.log(e);
    }
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
}

window.addEventListener("resize", resizeCanvas);

document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
        keepAwake();
    }
});

let startTime = performance.now();

// 6. 실시간 렌더링 루프 (60fps)
function render() {
    const currentTime = (performance.now() - startTime) * 0.001;

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);

    gl.uniform1f(timeLocation, currentTime);

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    requestAnimationFrame(render);
}

startCamera();
const video = document.getElementById("camera");

let wakeLock = null;

// 화면 안 꺼짐
async function keepAwake() {
    try {
        if ("wakeLock" in navigator) {
            wakeLock = await navigator.wakeLock.request("screen");
            console.log("Wake Lock 활성화");
        }
    } catch (err) {
        console.log(err);
    }
}

// 후면 카메라 실행
async function startCamera() {

    try {

        const stream = await navigator.mediaDevices.getUserMedia({

            video:{

                facingMode:{
                    ideal:"environment"
                },

                width:{ideal:1920},
                height:{ideal:1080}

            },

            audio:false

        });

        video.srcObject = stream;

    }

    catch(err){

        alert("카메라를 사용할 수 없습니다.");

        console.log(err);

    }

}

startCamera();

keepAwake();

// 화면이 다시 활성화되면 Wake Lock 재설정
document.addEventListener("visibilitychange", () => {

    if(document.visibilityState==="visible"){

        keepAwake();

    }

});
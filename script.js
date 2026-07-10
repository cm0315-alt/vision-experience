const video = document.getElementById("camera");

navigator.mediaDevices.getUserMedia({

    video:{
        facingMode:"environment"
    }

})

.then(stream=>{

    video.srcObject=stream;

})

.catch(()=>{

    alert("카메라 권한을 허용해주세요.");

});
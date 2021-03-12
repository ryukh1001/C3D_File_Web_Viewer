// Global var
const requestAnimationFrame = window.requestAnimationFrame ||
                            window.mozRequestAnimationFrame ||
                            window.webkitRequestAnimationFrame ||
                            window.msRequestAnimationFrame;
const cancelAnimationFrame = window.cancelAnimationFrame ||
                            window.mozCancelAnimationFrame;

const topId = "top";
const rightId = "right";
const offsetHeight = $("#" + topId).height();
const offsetWidth = $("#" + rightId).width();

// Viewer Class
Viewer = function() {
    this.canvas = null;
    this.renderer = null;
    this.camera = null;
    this.controller = null;
    this.display_frame_rate = null;
    this.mocap_frame_rate = null;
    this.frames = [];
    this.paused = false;
    this.frameNum = null;
}

Viewer.prototype.Init = function() {    //초기화
    const width = $(window).width() - offsetWidth;
    const height = $(window).height() - offsetHeight;

    const canvasId = "canvas";
    this.canvas = $('#' + canvasId)[0]; // this.canvas = document.getElementById(canvasId); // 동일

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas });
    this.renderer.setSize( width, height );
    document.body.appendChild(this.renderer.domElement);

    // 카메라 ( 카메라 수직 시야 각도, 가로세로 종횡비율, 시야거리 시작지점, 시야거리 끝지점
    this.camera = new THREE.PerspectiveCamera( 45, width/height, 0.1, 10 );
    // 카메라 위치 설정
    this.camera.position.z = 2;
    // 카메라와 마우스 상호작용을 위해 OrbitControls를 설정
    this.controller = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.paused = false;
    this.frameNum = 0;
}

Viewer.prototype.MakeScene = function(points) {   // 모델링 함수: Scene 생성
    // 3차원 Scene 생성
    const scene = new THREE.Scene();

    // 빛을 생성
    const light1 = new THREE.DirectionalLight(0xffffff, 1);
    light1.position.set( 2, 2, 2 );
    scene.add( light1 );

    // 빛을 생성
    const light2 = new THREE.DirectionalLight(0xffffff, 1);
    light2.position.set( -2, -2, -2 );
    scene.add( light2 );

    // Axis
    const axesHelper = new THREE.AxesHelper(0.1);
    axesHelper.position.y = -0.5;
    scene.add(axesHelper);

    // Grid Floor
    const floor = new THREE.GridHelper(2, 20);
    floor.position.y = -0.5;
    scene.add(floor);

    // Spheres
    // Sphere Geometry
    const geometry = new THREE.SphereGeometry(0.003, 32, 32);
    // Sphere Material
    const material = new THREE.MeshPhongMaterial({color: 0xFFE800});

    for(var i=0; i<points.length; i++) {
        let sphere = new THREE.Mesh(geometry, material);

        const x = points[i][0] / 4000;					// 좌표계 변환 -0.5 ~ 0.5
        const y = (points[i][2] / 4000 * 2 - 1) / 2;		// (원본 데이터 가로,세로,높이 4m 가정)
        const z = -points[i][1] / 4000;
        
        sphere.position.set(x, y, z);
        scene.add(sphere);
    }

    return scene;
}

// hot to pass parameter to requestAnimationFrame
// 참고: https://stackoverflow.com/questions/19893336/how-can-i-pass-argument-with-requestanimationframe
Viewer.prototype.Animate = function() {
    if(this.mocap_frame_rate < this.display_frame_rate) {
        setTimeout(function() {
            requestAnimationFrame(this.Animate.bind(this));
            const points = this.frames[this.frameNum];
            console.log("this.frames: ", this.frames);
            console.log("this.frameNum: ", this.frameNum);
            console.log(points);
            const scene = MakeScene(points);
            
            if(!this.paused) {
                // play(not paused)
                this.frameNum += 1;
            }

            if(this.frameNum >= this.frames.length) {	// go back to first frame
                this.frameNum = 0;
            }
            this.controller.update();	// 카메라 컨트롤
            this.renderer.render(scene, this.camera);
        }, 1000 / this.mocap_frame_rate)
    } else {
        requestAnimationFrame(this.Animate.bind(this)); //const 안대나??
        const k = Math.round(this.frames.length * this.display_frame_rate / this.mocap_frame_rate);
        const d = (this.frames.length - 1) / (k - 1);
        const points = this.frames[parseInt(this.frameNum)];
        const scene = MakeScene(points);

        if(!this.paused) {
            // play(not paused)
            this.frameNum += d;
        }

        if(this.frameNum >= this.frames.length) {	// go back to first frame
            this.frameNum = 0;
        }

        this.controller.update();	// 카메라 컨트롤
        this.renderer.render(scene, this.camera);
    }
}

// Pause = function() {
//     if(!viewer.paused) {
//         // If it is playing, set it to pause
//         viewer.paused = true;
//         $("#pausebtn").css({"background-image":"url(images/button_play.png)"}); 		
//     } else {
//         // If it is paused, set it to play
//         viewer.paused = false;
//         $("#pausebtn").css({"background-image":"url(images/button_pause.png)"}); 
//     }
// }

function pause() {
    if(!viewer.paused) {
        // If it is playing, set it to pause
        viewer.paused = true;
        $("#pausebtn").css({"background-image":"url(images/button_play.png)"}); 		
    } else {
        // If it is paused, set it to play
        viewer.paused = false;
        $("#pausebtn").css({"background-image":"url(images/button_pause.png)"}); 
    }
}

// Stop = function() {
//     viewer.frameNum = 0;
//     viewer.paused = true;
//     $("#pausebtn").css({"background-image":"url(images/button_play.png)"});
// }

function stop() {
    viewer.frameNum = 0;
    viewer.paused = true;
    $("#pausebtn").css({"background-image":"url(images/button_play.png)"});
}

// 크로스브라우징 코드 예시
// var agent = navigator.userAgent.toLowerCase();
// //파일초기화
// if ( (navigator.appName == 'Netscape' && navigator.userAgent.search('Trident') != -1) || (agent.indexOf("msie") != -1) ) {
//     $("#file3").replaceWith($("#file3").clone(true));
// }else{
//     $("#file3").val("");
// }

// play
function play() {
    $("#playbtn").css("display", "none");
    $("#pausebtn").css("display", "inline-block");
    viewer.Animate();
}


// Check Display Frame Rate
const times = [];

function check_disFrameRate() {
    const check_req = requestAnimationFrame(check_disFrameRate);
    const now = performance.now();
    times.push(now);
    if(times[0] <= now - 1000) {
        while(times[0] <= now - 1000) { // times에 now - 1000 보다 작은 값이 들어가있는 문제...(이유 모름) => 문제 해결
            times.shift();
        }
        cancelAnimationFrame(check_req);
        viewer.display_frame_rate = times.length;
        
        $("#checkbtn").attr("disabled", true);
        $("#checkbtn").attr("value", viewer.display_frame_rate);
        $("#playbtn").attr("disabled", false);
    }
}

// check file format
function chk_file_format(file) {
    console.log("File Changed");
    const file_format = file.value.split(".")[1];
    if(file_format != "c3d") {
        file.value = "";
        alert("C3D 파일 포맷이 아닙니다.");
    }
}

// upload file
function upload_file() {
    const form_data = new FormData($("#file_upload")[0]);
    $.ajax({
        type: "POST",
        url: "/upload",
        data: form_data,
        contentType: false,
        cache: false,
        processData: false,
        success: function(data) {
            this.mocap_frame_rate = data.frame_rate;
            this.frames = data.frames;
            console.log(this.frames);
        }
    })
}

// 메뉴와 컨텐츠의 높이를 윈도우 높이에서 헤더 부분을 뺀 크기로 지정합니다.
function resizeContents() {
    const setWidth = $(window).width() - offsetWidth;
    const setHeight = $(window).height() - offsetHeight;

    $("#right").height(setHeight);
    $("#canvas").width(setWidth);
    $("#canvas").height(setHeight);
    
    viewer.camera.aspect = setWidth / setHeight;
    viewer.camera.updateProjectionMatrix();

    viewer.renderer.setSize(setWidth, setHeight);

    console.log("success");
}

var viewer = new Viewer();
viewer.Init();

$(document).ready(function(){
	// var viewer = new Viewer();
	// viewer.Init();	

    // resize 이벤트가 발생할때마다 사이즈를 조절합니다.
    $(window).resize(resizeContents);

    // 처음 페이지가 뜰때 사이즈 조정 부분 입니다.
    resizeContents();
});
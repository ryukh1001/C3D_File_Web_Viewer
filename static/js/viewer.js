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

// Mocap Data Class
Mocap = function() {
    this.frame_rate = null;
    this.frames = [];
}

Mocap.prototype.Init = function(frame_rate, frames) { 
    this.frame_rate = frame_rate;
    this.frames = frames;
}

// Viewer Class
Viewer = function() {
    this.canvas = null;
    this.renderer = null;
    this.camera = null;
    this.controller = null;
    this.frame_rate = null;
    this.paused = false;
    this.frameNum = null;
    this.d = null;
}

Viewer.prototype.Init = function() {    //초기화
    const width = $(window).width() - offsetWidth;
    const height = $(window).height() - offsetHeight;

    const canvasId = "canvas";
    this.canvas = document.getElementById(canvasId);

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

Viewer.prototype.ClearCanvas = function() {
    this.renderer.clear();
    this.Init();
}

Viewer.prototype.CreateScene = function(points) {   // 모델링 함수: Scene 생성
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

Viewer.prototype.UpdateScene = function(Mocap) {
    const points = Mocap.frames[parseInt(this.frameNum)];
    const scene = this.CreateScene(points);
    if(!this.paused) {
        this.frameNum += this.d;
    } 
    if(this.frameNum >= Mocap.frames.length) {
        this.frameNum = 0;
    }
    this.controller.update();	// 카메라 컨트롤
    this.renderer.render(scene, this.camera);    
}

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

function stop() {
    viewer.frameNum = 0;
    viewer.paused = true;
    $("#pausebtn").css({"background-image":"url(images/button_play.png)"});
}

function play() {
    try {
        Animate();
        $("#playbtn").css("display", "none");
        $("#pausebtn").css({"background-image":"url(images/button_pause.png)"}); 
        $("#pausebtn").css("display", "inline-block");
    } catch(err) {
        alert("Select File first");
    }
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
        viewer.frame_rate = times.length;
        
        $("#checkbtn").attr("disabled", true);
        $("#checkbtn").attr("value", viewer.frame_rate);
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

let animate_req = null;
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
            // Progress Bar 추가
            $("#playbtn").css("display", "inline-block");
            $("#pausebtn").css("display", "none");

            cancelAnimationFrame(animate_req);
            viewer.ClearCanvas();

            mocap.Init(data.frame_rate, data.frames);
            if(mocap.frame_rate < viewer.frame_rate) {
                viewer.d = 1;
                Animate = function() {
                    const interval = 1000 / mocap.frame_rate;
                    setTimeout(function() {
                        animate_req = requestAnimationFrame(Animate); // Animate만 사용시 => 애니메이션 끊김현상 발생
                        viewer.UpdateScene(mocap);
                    }, interval);
                }
            } else {
                const k = Math.round(mocap.frames.length * viewer.frame_rate / mocap.frame_rate);
                viewer.d = (mocap.frames.length - 1) / (k - 1);
                Animate = function() {
                    animate_req = requestAnimationFrame(Animate);
                    viewer.UpdateScene(mocap);
                }
            }
        }
    })
}

// 메뉴와 컨텐츠의 높이를 윈도우 높이에서 헤더 부분을 뺀 크기로 지정
function resizeContents() {
    const setWidth = $(window).width() - offsetWidth;
    const setHeight = $(window).height() - offsetHeight;

    $("#right").height(setHeight);
    $("#canvas").width(setWidth);
    $("#canvas").height(setHeight);
    
    viewer.camera.aspect = setWidth / setHeight;
    viewer.camera.updateProjectionMatrix();
    viewer.renderer.setSize(setWidth, setHeight);
}

var mocap = new Mocap();
var viewer = new Viewer();
viewer.Init();

$(document).ready(function(){
    // resize 이벤트가 발생할때마다 사이즈를 조절
    $(window).resize(resizeContents);
    resizeContents();   // 필요?
});
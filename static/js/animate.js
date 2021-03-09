
const requestAnimationFrame = window.requestAnimationFrame ||
                            window.mozRequestAnimationFrame ||
                            window.webkitRequestAnimationFrame ||
                            window.msRequestAnimationFrame;
const cancelAnimationFrame = window.cancelAnimationFrame ||
                            window.mozCancelAnimationFrame;

const offsetHeight = $("#top").height();
const offsetWidth = $("#right").width();

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
            mocap_frame_rate = data.frame_rate;
            frames = data.frames;
            console.log(mocap_frame_rate);
            console.log(frames);
        }
    })
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
// 크로스브라우징 코드 예시
// var agent = navigator.userAgent.toLowerCase();
// //파일초기화
// if ( (navigator.appName == 'Netscape' && navigator.userAgent.search('Trident') != -1) || (agent.indexOf("msie") != -1) ) {
//     $("#file3").replaceWith($("#file3").clone(true));
// }else{
//     $("#file3").val("");
// }

$(document).ready(function(){
    // resize 이벤트가 발생할때마다 사이즈를 조절합니다.
    $(window).resize(resizeContents);

    // 처음 페이지가 뜰때 사이즈 조정 부분 입니다.
    resizeContents();
});

// play
function play() {
    $("#playbtn").css("display", "none");
    $("#pausebtn").css("display", "inline-block");
    start();
}

// pause and resume playing fuction
let paused = false;
function pause() {
    if(!paused) {
        // If it is playing, set it to pause
        paused = true;
        $("#pausebtn").css({"background-image":"url(images/button_play.png)"}); 		
    } else {
        // If it is paused, set it to play
        paused = false;
        $("#pausebtn").css({"background-image":"url(images/button_pause.png)"}); 
    }
}

// stop
function stop() {
    n = 0;
    paused = true;
    $("#pausebtn").css({"background-image":"url(images/button_play.png)"});
}

// Check Display Frame Rate
let times = [];
let display_frame_rate = 0;

function check_disFrameRate() {
    const check_req = requestAnimationFrame(check_disFrameRate);
    const now = performance.now();
    times.push(now);
    if(times[0] <= now - 1000) {
        while(times[0] <= now - 1000) { // times에 now - 1000 보다 작은 값이 들어가있는 문제...(이유 모름) => 문제 해결
            times.shift();
        }
        cancelAnimationFrame(check_req);
        display_frame_rate = times.length;
        times = [];
        $("#checkbtn").attr("disabled", true);
        $("#checkbtn").attr("value", display_frame_rate);
        $("#playbtn").attr("disabled", false);
    }
}

// 메뉴와 컨텐츠의 높이를 윈도우 높이에서 헤더 부분을 뺀 크기로 지정합니다.
function resizeContents() {
    const setWidth = $(window).width() - offsetWidth;
    const setHeight = $(window).height() - offsetHeight;

    $("#canvas").width(setWidth);
    $("#canvas").height(setHeight);
    
    camera.aspect = setWidth / setHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(setWidth, setHeight);
}

// Get Data From Server
let mocap_frame_rate = 0;
let frames = [];

// 캔버스 정의
const canvas = $("#canvas")[0];

// 캔버스 크기 설정
const width = $(window).width() - offsetWidth;
const height = $(window).height() - offsetHeight;

$("#canvas").css("width", width);
$("#canvas").css("height", height);

const renderer = new THREE.WebGLRenderer({
    canvas
});

renderer.setSize( width, height );
document.body.appendChild(renderer.domElement);

// 카메라 ( 카메라 수직 시야 각도, 가로세로 종횡비율, 시야거리 시작지점, 시야거리 끝지점
const camera = new THREE.PerspectiveCamera( 45, width/height, 0.1, 10 );

// 카메라 위치 설정
camera.position.z = 2;

// 모델링 함수: Scene 생성
function makeScene(points) {
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

// 카메라와 마우스 상호작용을 위해 OrbitControls를 설정
const controls = new THREE.OrbitControls(camera, renderer.domElement);
var n = 0;
// const display_frame_rate = 60;	// 모니터 주사율

// 렌더링 함수: 애니메이션 구현
function start() {
    if(mocap_frame_rate < display_frame_rate) {
        setTimeout(function() {
            let animate_req = requestAnimationFrame(start);
            const points = frames[n];
            const scene = makeScene(points);
            
            if(!paused) {
                // play(not paused)
                n += 1;
            }

            if(n >= frames.length) {	// 처음부터 재시작
                n = 0;
            }
            controls.update();	// 카메라 컨트롤
            renderer.render(scene, camera);
        }, 1000 / mocap_frame_rate)
    } else {
        let animate_req = requestAnimationFrame(start); //const 안대나??
        const k = Math.round(frames.length * display_frame_rate / mocap_frame_rate);
        const d = (frames.length - 1) / (k - 1);
        const points = frames[parseInt(n)];
        const scene = makeScene(points);

        if(!paused) {
            // play(not paused)
            n += d;
        }

        if(n >= frames.length) {	// 처음부터 재시작
            n = 0;
        }

        controls.update();	// 카메라 컨트롤
        renderer.render(scene, camera);
    }
}
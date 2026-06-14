// 출발지를 연신내 GTX 광장 좌표로 처음부터 고정
let currentLocation = "37.6188881,126.920832"; 

const destinationInput = document.getElementById('destination-input');
const statusText = document.getElementById('status-text');
const subText = document.getElementById('sub-text');
const backgroundView = document.getElementById('background-view');
const controlBox = document.querySelector('.control-box');

const DEFAULT_SUB_TEXT = '마이크를 누르거나, <br>직접 입력해 주세요.';

// ==========================================
// [1] 음성 인식 기능
// ==========================================
const micBtn = document.getElementById('mic-btn');
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.lang = 'ko-KR';
    
    micBtn.addEventListener('click', () => {
        statusText.innerText = "듣고 있습니다...";
        recognition.start();
    });

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        destinationInput.value = transcript;
        statusText.innerText = `"${transcript}"(으)로 안내할까요?`;
        subText.innerHTML = `
            <button id="confirm-btn">✅ 맞아요</button>
            <button id="retry-btn">🔄 다시 말할게요</button>
        `;

        document.getElementById('confirm-btn').addEventListener('click', () => {
            subText.innerHTML = DEFAULT_SUB_TEXT;
            searchBtn.click();
        });

        document.getElementById('retry-btn').addEventListener('click', () => {
            subText.innerHTML = DEFAULT_SUB_TEXT;
            destinationInput.value = '';
            statusText.innerText = "듣고 있습니다...";
            recognition.start();
        });
    };

    recognition.onerror = () => {
        statusText.innerText = "음성을 인식하지 못했습니다.";
        subText.innerHTML = DEFAULT_SUB_TEXT;
    };
} else {
    micBtn.addEventListener('click', () => alert("음성 인식을 지원하지 않는 브라우저입니다."));
}

// ==========================================
// [2] 카카오맵 띄우기 및 길 안내 기능 (최대 보안 보완판)
// ==========================================
const searchBtn = document.getElementById('search-btn');

searchBtn.addEventListener('click', () => {
    const destination = destinationInput.value;
    
    if (!currentLocation) {
        alert("출발지 정보가 존재하지 않습니다.");
        return;
    }
    if (destination.trim() === "") {
        alert("목적지를 입력해 주세요.");
        return;
    }

    statusText.innerText = "경로 탐색 중...";
    
    // 외곽에서부터 kakao 객체가 존재하는지 완벽히 가둡니다.
    try {
        if (typeof kakao === 'undefined') {
            throw new Error("카카오 라이브러리(kakao)를 아예 불러오지 못했습니다.\n\n[예상 원인]\n1. 카카오 개발자 센터에서 '저장' 버튼을 안 누름\n2. index.html에 적은 발급키가 틀림\n3. 인터넷 연결 끊김");
        }
        if (!kakao.maps) {
            throw new Error("카카오 맵(kakao.maps) 객체가 생성되지 않았습니다.");
        }

        // 안전하게 로딩 시작
        kakao.maps.load(() => {
            try {
                const [lat, lng] = currentLocation.split(',');
                const startPos = new kakao.maps.LatLng(parseFloat(lat), parseFloat(lng));

                backgroundView.innerHTML = '<div id="map" style="width:100%; height:100%;"></div>';
                const mapContainer = document.getElementById('map');
                const mapOption = { center: startPos, level: 5 };
                
                const map = new kakao.maps.Map(mapContainer, mapOption);

                const startMarker = new kakao.maps.Marker({
                    position: startPos,
                    map: map
                });

                if (!kakao.maps.services || !kakao.maps.services.Places) {
                    throw new Error("카카오 장소 검색(services) 기능이 차단되었습니다.");
                }

                const ps = new kakao.maps.services.Places();
                
                ps.keywordSearch(destination, (data, status) => {
                    if (status === kakao.maps.services.Status.OK) {
                        const destPos = new kakao.maps.LatLng(data[0].y, data[0].x);
                        
                        const destMarker = new kakao.maps.Marker({
                            position: destPos,
                            map: map
                        });
                        
                        const bounds = new kakao.maps.LatLngBounds();
                        bounds.extend(startPos);
                        bounds.extend(destPos);
                        map.setBounds(bounds);
                        
                        const polyline = new kakao.maps.Polyline({
                            path: [startPos, destPos],
                            strokeWeight: 6,
                            strokeColor: '#059669',
                            strokeOpacity: 0.8,
                            strokeStyle: 'solid'
                        });
                        polyline.setMap(map);
                        
                        controlBox.style.display = 'none';
                        statusText.style.fontSize = '1.8rem';
                        statusText.innerText = `도착지: ${data[0].place_name}`;
                        subText.innerText = "초록색 선을 따라 이동하세요.";

                    } else if (status === kakao.maps.services.Status.ZERO_RESULT) {
                        alert("목적지를 찾을 수 없습니다. 조금 더 정확히 입력해 주세요.");
                        resetToHome();
                    } else {
                        alert("검색 중 오류가 발생했습니다. (상태코드: " + status + ")");
                        resetToHome();
                    }
                });
            } catch (innerError) {
                console.error(innerError);
                alert("지도 생성 실패: " + innerError.message);
                resetToHome();
            }
        });
    } catch (outerError) {
        // kakao 자체가 없을 때 여기로 튕겨 나와 팝업을 띄웁니다.
        console.error(outerError);
        alert(outerError.message);
        resetToHome();
    }
});

// ==========================================
// [공통 유틸] 에러 및 제한 발생 시 초기 화면 리셋 함수
// ==========================================
function resetToHome() {
    backgroundView.innerHTML = '<p class="placeholder-text">여기에 지도가 표시됩니다.</p>';
    statusText.innerText = "어디로 갈까요?";
    subText.innerHTML = DEFAULT_SUB_TEXT;
}
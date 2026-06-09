let currentLocation = null;
const destinationInput = document.getElementById('destination-input');
const statusText = document.getElementById('status-text');
const subText = document.getElementById('sub-text');
const backgroundView = document.getElementById('background-view');
const controlBox = document.querySelector('.control-box');

const DEFAULT_SUB_TEXT = '마이크를 누르거나, <br>직접 입력해 주세요.';

// [1] 음성 인식 기능
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

// [2] QR 스캔 (현위치 파악) 기능
const cameraBtn = document.getElementById('camera-btn');

cameraBtn.addEventListener('click', () => {
    backgroundView.innerHTML = '<div id="reader" style="width:100%; height:100%;"></div>';
    const html5QrCode = new Html5Qrcode("reader");
    statusText.innerText = "QR 코드를 비춰주세요.";

    html5QrCode.start(
        { facingMode: "environment" }, 
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
            html5QrCode.stop().then(() => {
                const parts = decodedText.split(',');
                if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) {
                    alert("올바른 위치 QR이 아닙니다.");
                    backgroundView.innerHTML = '<p class="placeholder-text">여기에 지도가 표시됩니다.</p>';
                    statusText.innerText = "어디로 갈까요?";
                    subText.innerHTML = DEFAULT_SUB_TEXT;
                    return;
                }
                currentLocation = decodedText;
                statusText.innerText = "위치 확인 완료!";
                subText.innerText = "이제 목적지를 말씀해 주세요.";
                backgroundView.innerHTML = '<p class="placeholder-text">현 위치가 파악되었습니다.</p>';
            });
        },
        (errorMessage) => {}
    ).catch((err) => {
        alert("카메라 권한을 확인해주세요.");
    });
});

// [3] 카카오맵 띄우기 및 길 안내 기능
const searchBtn = document.getElementById('search-btn');

searchBtn.addEventListener('click', () => {
    const destination = destinationInput.value;
    
    if (!currentLocation) {
        alert("먼저 카메라로 QR코드를 스캔해 출발지를 설정해 주세요.");
        return;
    }
    if (destination.trim() === "") {
        alert("목적지를 입력해 주세요.");
        return;
    }

    statusText.innerText = "경로 탐색 중...";
    
    const [lat, lng] = currentLocation.split(',');
    const startPos = new kakao.maps.LatLng(lat, lng);

    backgroundView.innerHTML = '<div id="map" style="width:100%; height:100%;"></div>';
    const mapContainer = document.getElementById('map');
    const mapOption = { center: startPos, level: 5 };
    
    const map = new kakao.maps.Map(mapContainer, mapOption);

    const startMarker = new kakao.maps.Marker({
        position: startPos,
        map: map
    });

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

        } else {
            alert("목적지를 찾을 수 없습니다. 조금 더 정확히 말씀해 주세요.");
            statusText.innerText = "어디로 갈까요?";
        }
    });
});
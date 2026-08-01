import { state } from './state.js';
import { elements, updateStatus } from './ui.js';

export function updateCurrentGPS() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            state.gpsCoords = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            console.log("📍 [GPS 싱크] 현재 실시간 좌표 업데이트 완료");
            
            if (state.useRealtimeGPS && state.startMarker && state.map) {
                const newStartLatLng = new kakao.maps.LatLng(state.gpsCoords.lat, state.gpsCoords.lng);
                state.startMarker.setPosition(newStartLatLng);
            }
        }, function(error) { 
            console.error(error); 
        }, { enableHighAccuracy: true });
    }
}

export function toggleGPS() {
    updateCurrentGPS(); 

    if (!state.gpsCoords) {
        alert("아직 GPS 위치를 잡고 있습니다. 잠시 후 다시 눌러주세요!");
        return;
    }

    state.useRealtimeGPS = !state.useRealtimeGPS;

    const btn = elements.gpsToggleBtn;
    if (state.useRealtimeGPS) {
        if (btn) {
            btn.classList.add('active');
            btn.innerText = "🎯 실시간 내 위치로 출발 중!";
        }
        updateStatus("출발지 변경됨", "진짜 내 현재 위치에서 출발합니다.");
    } else {
        if (btn) {
            btn.classList.remove('active');
            btn.innerText = "📍 현재 내 위치를 출발지로 설정";
        }
        updateStatus("어디로 갈까요?", "광장(GTX연신849) 기준으로 안내합니다.");
        
        if (state.locationTimer) {
            clearInterval(state.locationTimer);
            state.locationTimer = null;
            console.log("⏱️ 30초 위치 확인 타이머가 종료되었습니다.");
        }
    }
}
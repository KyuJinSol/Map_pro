import { state } from './state.js';
import { elements, updateStatus } from './ui.js';

// 💡 내 실제 위치만 독립적으로 띄워줄 전용 마커 변수
let myLocationMarker = null; 

export function updateCurrentGPS() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            state.gpsCoords = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            console.log("📍 [GPS 싱크] 현재 실시간 좌표 업데이트 완료");
            
            const currentLatLng = new kakao.maps.LatLng(state.gpsCoords.lat, state.gpsCoords.lng);

            // ✅ 1. 모드(광장/실시간)에 상관없이 내 진짜 위치 마커는 무조건 지도에 찍고 움직입니다.
            if (state.map) {
                if (!myLocationMarker) {
                    myLocationMarker = new kakao.maps.Marker({
                        position: currentLatLng,
                        map: state.map,
                        title: "내 실제 위치"
                    });
                } else {
                    myLocationMarker.setPosition(currentLatLng);
                }
            }
            
            // ✅ 2. '실시간 내 위치 모드'가 켜져 있을 때만, 경로의 출발점도 내 위치로 끌고 옵니다.
            if (state.useRealtimeGPS && state.startMarker && state.map) {
                state.startMarker.setPosition(currentLatLng);
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
    }
}
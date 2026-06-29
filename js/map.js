import { state } from './state.js';

export function initMap(container) {
    const options = {
        // 💡 [수정] state 변수를 불러와서 중심 좌표로 설정
        center: new kakao.maps.LatLng(state.defaultCenter.lat, state.defaultCenter.lng), 
        level: 3 
    };
    state.map = new kakao.maps.Map(container, options);
    state.ps = new kakao.maps.services.Places();
}

// ... 아래 clearMapOverlays, drawRoute 함수는 기존과 동일 ...

export function clearMapOverlays() {
    if (state.currentPathLine) state.currentPathLine.setMap(null);
    if (state.startMarker) state.startMarker.setMap(null);
    if (state.endMarker) state.endMarker.setMap(null);
}

export function drawRoute(linePath) {
    state.currentPathLine = new kakao.maps.Polyline({
        path: linePath,            
        strokeWeight: 7,           
        strokeColor: '#FF3366',    
        strokeOpacity: 0.8,        
        strokeStyle: 'solid'       
    });
    state.currentPathLine.setMap(state.map);

    const startLatLng = linePath[0];
    const endLatLng = linePath[linePath.length - 1]; 

    state.startMarker = new kakao.maps.Marker({ position: startLatLng, map: state.map });
    state.endMarker = new kakao.maps.Marker({ position: endLatLng, map: state.map });

    return { startLatLng, endLatLng };
}
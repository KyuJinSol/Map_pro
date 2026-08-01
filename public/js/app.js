import { elements } from './ui.js';
import { initMap } from './map.js';
import { updateCurrentGPS, toggleGPS } from './gps.js';
import { initSpeechRecognition } from './speech.js';
import { searchRoute } from './route.js';

kakao.maps.load(function() {
    
    // 1. 지도 및 Places 서비스 초기화
    initMap(elements.container);

    // 2. 최초 1회 GPS 동기화
    updateCurrentGPS();

    // 3. 메인 버튼 및 입력창 이벤트 리스너 바인딩
    if (elements.gpsToggleBtn) {
        elements.gpsToggleBtn.addEventListener('click', toggleGPS);
    }

    if (elements.searchBtn) {
        elements.searchBtn.addEventListener('click', searchRoute);
    }

    if (elements.destinationInput) {
        elements.destinationInput.addEventListener('keyup', function(event) {
            if (event.key === 'Enter') {
                searchRoute();
            }
        });
    }

    // 4. 음성 인식 시스템 가동
    initSpeechRecognition();
});
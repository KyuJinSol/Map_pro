import { state } from './state.js';
import { elements, updateStatus, DEFAULT_SUB_TEXT } from './ui.js';
import { clearMapOverlays, drawRoute } from './map.js';
import { updateCurrentGPS } from './gps.js';

export function searchRoute() {
    if (state.locationTimer) {
        clearInterval(state.locationTimer);
        state.locationTimer = null;
    }

    const destination = elements.destinationInput.value;

    if (!destination) {
        alert("목적지를 입력해주세요!");
        return;
    }

    updateStatus("목적지 탐색 중...");

    // 💡 [수정] 하드코딩된 좌표(37.618... 등)를 state.defaultCenter로 교체
    let centerLatLng = (state.useRealtimeGPS && state.gpsCoords)
        ? new kakao.maps.LatLng(state.gpsCoords.lat, state.gpsCoords.lng)
        : new kakao.maps.LatLng(state.defaultCenter.lat, state.defaultCenter.lng);

    const radiusList = [500, 2000, 3500, 5000, 7500];
    let radiusIndex = 0;

    function doSearchLoop() {
        const currentRadius = radiusList[radiusIndex];
        console.log(`🔍 [경로 탐색] 반경 ${currentRadius}m 내 검색 시도 중...`);

        if (radiusIndex > 0) {
            const distanceText = currentRadius < 1000 ? `${currentRadius}m` : `${currentRadius / 1000}km`;
            updateStatus("목적지 탐색 중...", `코앞에 목적지가 없어 검색 범위를 ${distanceText}로 확대합니다.`);
        }

        state.ps.keywordSearch(destination, function(data, status) {
            if (status === kakao.maps.services.Status.OK) {
                
                data.sort(function(a, b) {
                    const latC = centerLatLng.getLat();
                    const lngC = centerLatLng.getLng();
                    const distA = Math.pow(parseFloat(a.y) - latC, 2) + Math.pow(parseFloat(a.x) - lngC, 2);
                    const distB = Math.pow(parseFloat(b.y) - latC, 2) + Math.pow(parseFloat(b.x) - lngC, 2);
                    return distA - distB; 
                });

                const targetPlace = data[0]; 
                const end_lat = parseFloat(targetPlace.y); 
                const end_lng = parseFloat(targetPlace.x); 
                const real_destination_name = targetPlace.place_name;

                let requestBody = {
                    end_lat: end_lat,
                    end_lng: end_lng,
                    destination_name: real_destination_name
                };

                if (state.useRealtimeGPS && state.gpsCoords) {
                    requestBody.start_name = `${state.gpsCoords.lat},${state.gpsCoords.lng}`; 
                } else {
                    requestBody.start_name = state.start_name; 
                }

                updateStatus("경로 계산 중...");

                // 💡 [수정됨] 127.0.0.1 하드코딩 제거 및 동적 호스트명 적용
                const serverUrl = `http://${window.location.hostname}:8000/api/routes`;

                fetch(serverUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody)
                })
                .then(response => response.json())
                .then(res => {
                    if (res.status === 'success') {
                        const container = elements.container;
                        const uiContainer = elements.uiContainer;
                        
                        if (container) container.classList.remove('hidden-map');
                        if (uiContainer) uiContainer.classList.add('searched');
                        
                        state.map.relayout();
                        clearMapOverlays();

                        const features = res.data.features;
                        const linePath = [];

                        features.forEach(feature => {
                            if (feature.geometry.type === "LineString") {
                                const coordinates = feature.geometry.coordinates;
                                coordinates.forEach(coord => {
                                    linePath.push(new kakao.maps.LatLng(coord[1], coord[0]));
                                });
                            }
                        });

                        const { startLatLng, endLatLng } = drawRoute(linePath);

                        if (!state.locationTimer) {
                            const bounds = new kakao.maps.LatLngBounds();
                            bounds.extend(startLatLng);
                            bounds.extend(endLatLng);
                            state.map.setBounds(bounds);
                            if (container) {
                                window.scrollTo({ top: container.offsetTop, behavior: 'smooth' });
                            }
                        }

                        if (state.useRealtimeGPS) {
                            updateStatus("안내를 시작합니다 🚩", `[실시간 안내] 안전한 큰길 기준으로 30초마다 위치 자동 보정 중`);
                        } else {
                            updateStatus("안내를 시작합니다 🚩", `[출발] ${state.start_name} 광장 ➔ [도착] ${real_destination_name}`);
                        }

                        if (state.useRealtimeGPS && !state.locationTimer) {
                            console.log("⏱️ 30초 주기 실시간 위치 트래킹 엔진 구동 시작");
                            state.locationTimer = setInterval(function() {
                                console.log("🔄 [30초 경과] 위치 파악 및 큰길 경로 자동 갱신");
                                updateCurrentGPS(); 
                                searchRoute();      
                            }, 30000); 
                        }

                    } else {
                        alert(res.message);
                    }
                })
                .catch(error => console.error("❌ 에러:", error));
            } else {
                radiusIndex++;
                if (radiusIndex < radiusList.length) {
                    doSearchLoop(); 
                } else {
                    alert("반경 7.5km 이내에서 해당 장소를 찾을 수 없습니다.");
                    updateStatus("어디로 갈까요?", "목적지를 다시 입력해 주세요.");
                }
            }
        }, {
            location: centerLatLng,                  
            sort: kakao.maps.services.SortBy.DISTANCE,
            radius: currentRadius, 
            useMapBounds: false                        
        });
    }

    doSearchLoop();
}
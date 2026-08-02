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

        // 💡 [최종 돌파구] 거리순 탐색 기반에, 검색어가 '역'이면 지하철역만 불러오게 강제 명령
        const searchOptions = {
            location: centerLatLng,
            sort: kakao.maps.services.SortBy.DISTANCE,
            radius: currentRadius,
            useMapBounds: false
        };

        if (destination.endsWith('역')) {
            searchOptions.category_group_code = 'SW8';
        }

        state.ps.keywordSearch(destination, function(data, status) {
            if (status === kakao.maps.services.Status.OK) {
                
                let validData = data;
                
                // 지하철역만 가져왔더라도, 정확히 그 이름이 들어있는지 한 번 더 깐깐하게 방어
                if (destination.endsWith('역')) {
                    const keywordTrim = destination.replace(/\s+/g, '');
                    validData = data.filter(p => p.place_name.replace(/\s+/g, '').includes(keywordTrim));
                }

                // 헛다리 짚었으면 가차 없이 반경 확대 루프로 넘김
                if (validData.length === 0) {
                    radiusIndex++;
                    if (radiusIndex < radiusList.length) {
                        doSearchLoop();
                    } else {
                        alert("반경 7.5km 이내에서 해당 장소를 찾을 수 없습니다.");
                        updateStatus("어디로 갈까요?", "목적지를 다시 입력해 주세요.");
                    }
                    return;
                }

                // 💡 [스마트 정렬] 정확도 -> 랜드마크 -> 지점 배제 -> 피타고라스 실거리
                validData.sort(function(a, b) {
                    const aExact = a.place_name === destination || a.place_name.startsWith(destination + ' ') || a.place_name.startsWith(destination + '(');
                    const bExact = b.place_name === destination || b.place_name.startsWith(destination + ' ') || b.place_name.startsWith(destination + '(');
                    if (aExact && !bExact) return -1;
                    if (!aExact && bExact) return 1;

                    const landmarkCodes = ['SW8', 'SC4', 'PO3'];
                    const aIsLandmark = landmarkCodes.includes(a.category_group_code);
                    const bIsLandmark = landmarkCodes.includes(b.category_group_code);
                    if (aIsLandmark && !bIsLandmark) return -1;
                    if (!aIsLandmark && bIsLandmark) return 1;

                    const aIsBranch = a.place_name.endsWith('점');
                    const bIsBranch = b.place_name.endsWith('점');
                    if (!aIsBranch && bIsBranch) return -1;
                    if (aIsBranch && !bIsBranch) return 1;

                    const latC = centerLatLng.getLat();
                    const lngC = centerLatLng.getLng();
                    const distA = Math.pow(parseFloat(a.y) - latC, 2) + Math.pow(parseFloat(a.x) - lngC, 2);
                    const distB = Math.pow(parseFloat(b.y) - latC, 2) + Math.pow(parseFloat(b.x) - lngC, 2);
                    return distA - distB; 
                });

                const targetPlace = validData[0]; 
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

                const serverUrl = `/api/routes`;
                
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

                        // ... [생략] ...
                        if (state.useRealtimeGPS) {
                            updateStatus("안내를 시작합니다 🚩", `[실시간 안내] 안전한 큰길 기준으로 30초마다 자동 보정 중`);
                        } else {
                            // 💡 광장 모드일 때도 30초 갱신 중임을 알리도록 문구 수정
                            updateStatus("안내를 시작합니다 🚩", `[광장 기준] 30초마다 경로 최신화 중 ➔ [도착] ${real_destination_name}`);
                        }

                        // ✅ GPS 모드 여부와 상관없이 타이머가 없으면 무조건 돌리도록 조건 수정
                        if (!state.locationTimer) { 
                            console.log("⏱️ 30초 주기 경로 자동 갱신 엔진 구동 시작");
                            state.locationTimer = setInterval(function() {
                                console.log("🔄 [30초 경과] 큰길 경로 자동 갱신");

                                // ❌ 기존 코드: if (state.useRealtimeGPS) updateCurrentGPS(); 
                                // ✅ 수정된 코드: 모드에 상관없이 30초마다 무조건 내 GPS 위치를 갱신합니다!
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
        }, searchOptions);
    }

    doSearchLoop();
}
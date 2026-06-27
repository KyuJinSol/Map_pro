kakao.maps.load(function() {
    
    const container = document.getElementById('map');
    const options = {
        center: new kakao.maps.LatLng(37.6188881, 126.920832), 
        level: 3 
    };
    const map = new kakao.maps.Map(container, options);
    const ps = new kakao.maps.services.Places();

    let currentPathLine = null;
    let startMarker = null;
    let endMarker = null;

    // 모드 제어 및 GPS 변수
    let useRealtimeGPS = false; 
    let gpsCoords = null;       
    let locationTimer = null;   // ⏱️ 30초 타이머 제어용 리모컨

    const start_name = "GTX연신849"; 

    const uiContainer = document.getElementById('ui-container') || document.getElementById('search-page');
    const statusText = document.getElementById('status-text');
    const subText = document.getElementById('sub-text');
    const destinationInput = document.getElementById('destination-input');
    const micBtn = document.getElementById('mic-btn');
    const gpsToggleBtn = document.getElementById('gps-toggle-btn');

    // 📡 백그라운드 GPS 위치 항시 수집 함수
    function updateCurrentGPS() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function(position) {
                gpsCoords = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                console.log("📍 [GPS 싱크] 현재 실시간 좌표 업데이트 완료");
                
                if (useRealtimeGPS && startMarker) {
                    const newStartLatLng = new kakao.maps.LatLng(gpsCoords.lat, gpsCoords.lng);
                    startMarker.setPosition(newStartLatLng);
                }
            }, function(error) { console.error(error); }, { enableHighAccuracy: true });
        }
    }

    // 앱 실행 즉시 최초 1회 GPS 동기화
    updateCurrentGPS();

    // 📍 내 위치 출발 스위치 토글 이벤트
    gpsToggleBtn.addEventListener('click', function() {
        updateCurrentGPS(); 

        if (!gpsCoords) {
            alert("아직 GPS 위치를 잡고 있습니다. 잠시 후 다시 눌러주세요!");
            return;
        }

        useRealtimeGPS = !useRealtimeGPS;

        if (useRealtimeGPS) {
            gpsToggleBtn.classList.add('active');
            gpsToggleBtn.innerText = "🎯 실시간 내 위치로 출발 중!";
            statusText.innerText = "출발지 변경됨";
            subText.innerText = "진짜 내 현재 위치에서 출발합니다.";
        } else {
            gpsToggleBtn.classList.remove('active');
            gpsToggleBtn.innerText = "📍 현재 내 위치를 출발지로 설정";
            statusText.innerText = "어디로 갈까요?";
            subText.innerText = "광장(GTX연신849) 기준으로 안내합니다.";
            
            if (locationTimer) {
                clearInterval(locationTimer);
                locationTimer = null;
                console.log("⏱️ 30초 위치 확인 타이머가 종료되었습니다.");
            }
        }
    });

    // 🎙️ 음성인식 로직
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.interimResults = false;
        recognition.lang = 'ko-KR';

        micBtn.addEventListener('click', function() {
            recognition.start();
            statusText.innerText = "듣고 있어요...🎙️";
            subText.innerText = "목적지를 말씀해 주세요.";
        });

        recognition.onresult = function(event) {
            const speechToText = event.results[0][0].transcript;
            destinationInput.value = speechToText.replace(/\./g, '').trim();
            document.getElementById('search-btn').click(); 
        };
    }

    // 🛣️ 최근접 동적 검색 및 Tmap 통신 함수
    function searchRoute() {
        const destination = destinationInput.value;

        if (!destination) {
            alert("목적지를 입력해주세요!");
            return;
        }

        statusText.innerText = "목적지 탐색 중...";

        // 기본 광장 기준 좌표를 지도 중심과 완벽히 일치 (37.6188881, 126.920832)
        let centerLatLng = (useRealtimeGPS && gpsCoords)
            ? new kakao.maps.LatLng(gpsCoords.lat, gpsCoords.lng)
            : new kakao.maps.LatLng(37.6188881, 126.920832);

        // 점진적 확대 스케일 정의
        const radiusList = [500, 2000, 3500, 5000, 7500];
        let radiusIndex = 0;

        // 점진적 반복 검색용 내부 함수 정의
        function doSearchLoop() {
            const currentRadius = radiusList[radiusIndex];
            console.log(`🔍 [경로 탐색] 반경 ${currentRadius}m 내 검색 시도 중...`);

            if (radiusIndex > 0) {
                const distanceText = currentRadius < 1000 ? `${currentRadius}m` : `${currentRadius / 1000}km`;
                subText.innerText = `코앞에 목적지가 없어 검색 범위를 ${distanceText}로 확대합니다.`;
            }

            ps.keywordSearch(destination, function(data, status) {
                if (status === kakao.maps.services.Status.OK) {
                    
                    // 💡 카카오가 준 결과를 피타고라스 거리 공식으로 재정렬하여 진짜 최근접 매장 선출
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

                    if (useRealtimeGPS && gpsCoords) {
                        requestBody.start_name = `${gpsCoords.lat},${gpsCoords.lng}`; 
                    } else {
                        requestBody.start_name = start_name; 
                    }

                    statusText.innerText = "경로 계산 중...";

                    fetch('http://127.0.0.1:8000/api/routes', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(requestBody)
                    })
                    .then(response => response.json())
                    .then(res => {
                        if (res.status === 'success') {
                            container.classList.remove('hidden-map');
                            if (uiContainer) uiContainer.classList.add('searched');
                            map.relayout();

                            if (currentPathLine) currentPathLine.setMap(null);
                            if (startMarker) startMarker.setMap(null);
                            if (endMarker) endMarker.setMap(null);

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

                            currentPathLine = new kakao.maps.Polyline({
                                path: linePath,            
                                strokeWeight: 7,           
                                strokeColor: '#FF3366',    
                                strokeOpacity: 0.8,        
                                strokeStyle: 'solid'       
                            });
                            currentPathLine.setMap(map);

                            const startLatLng = linePath[0];
                            const endLatLng = linePath[linePath.length - 1]; 

                            startMarker = new kakao.maps.Marker({ position: startLatLng, map: map });
                            endMarker = new kakao.maps.Marker({ position: endLatLng, map: map });

                            if (!locationTimer) {
                                const bounds = new kakao.maps.LatLngBounds();
                                bounds.extend(startLatLng);
                                bounds.extend(endLatLng);
                                map.setBounds(bounds);
                                window.scrollTo({ top: container.offsetTop, behavior: 'smooth' });
                            }

                            statusText.innerText = "안내를 시작합니다 🚩";
                            if (useRealtimeGPS) {
                                subText.innerText = `[실시간 안내] 안전한 큰길 기준으로 30초마다 위치 자동 보정 중`;
                            } else {
                                subText.innerText = `[출발] ${start_name} 광장 ➔ [도착] ${real_destination_name}`;
                            }

                            if (useRealtimeGPS && !locationTimer) {
                                console.log("⏱️ 30초 주기 실시간 위치 트래킹 엔진 구동 시작");
                                locationTimer = setInterval(function() {
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
                        statusText.innerText = "어디로 갈까요?";
                        subText.innerText = "목적지를 다시 입력해 주세요.";
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

    // 검색 버튼 클릭 이벤트
    document.getElementById('search-btn').addEventListener('click', function() {
        if (locationTimer) {
            clearInterval(locationTimer);
            locationTimer = null;
        }
        searchRoute();
    });

});
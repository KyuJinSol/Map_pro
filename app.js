kakao.maps.load(function() {
    
    const container = document.getElementById('map');
    const options = {
        center: new kakao.maps.LatLng(37.6188881, 126.920832), 
        level: 3 
    };
    const map = new kakao.maps.Map(container, options);
    const ps = new kakao.maps.services.Places();

    const DEFAULT_SUB_TEXT = "<span>원하시는 목적지를 검색창에 입력하거나 마이크 버튼을 눌러 말씀해 주세요.</span>";

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
                // 💡 [수정] print -> console.log로 오타 수정
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
                // 💡 [수정] print -> console.log로 오타 수정
                console.log("⏱️ 30초 위치 확인 타이머가 종료되었습니다.");
            }
        }
    });

    // 🎙️ 음성인식 로직
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.maxAlternatives = 3;
        recognition.interimResults = false;
        recognition.lang = 'ko-KR';

        const KNOWN_DESTINATIONS = [
            "연서시장", "연신내역 3번출구", "불광천", "북한산둘레길"
            // 실제 주변 장소로 채워주세요
        ];

        function similarity(a, b) {
            const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
            for (let i = 0; i <= a.length; i++) dp[i][0] = i;
            for (let j = 0; j <= b.length; j++) dp[0][j] = j;
            for (let i = 1; i <= a.length; i++) {
                for (let j = 1; j <= b.length; j++) {
                    dp[i][j] = a[i - 1] === b[j - 1]
                        ? dp[i - 1][j - 1]
                        : Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]) + 1;
                }
            }
            const dist = dp[a.length][b.length];
            return 1 - dist / Math.max(a.length, b.length, 1);
        }

        function findKnownMatch(candidates, threshold = 0.6) {
            let best = null, bestScore = 0;
            candidates.forEach(text => {
                KNOWN_DESTINATIONS.forEach(name => {
                    const score = similarity(text, name);
                    if (score > bestScore) { bestScore = score; best = name; }
                });
            });
            return bestScore >= threshold ? best : null;
        }

        function searchKakaoCandidates(keyword, callback) {
            const ps = new kakao.maps.services.Places();
            const options = {};
            
            let centerLatLng = new kakao.maps.LatLng(37.6150000, 126.9200000); 
            
            options.location = centerLatLng
            options.radius = 2000;
            options.sort = kakao.maps.services.SortBy.DISTANCE;
            
            ps.keywordSearch(keyword, (data, status) => {
                callback(status === kakao.maps.services.Status.OK ? data.slice(0, 3) : []);
            }, options);
        }

        function showCandidates(candidates) {
            if (candidates.length === 0) {
                statusText.innerText = "목적지를 찾지 못했습니다.";
                subText.innerHTML = DEFAULT_SUB_TEXT;
                return;
            }
            statusText.innerText = "이 곳으로 안내할까요?";
            subText.innerHTML = candidates
                .map((c, i) => `<button class="candidate-btn" data-idx="${i}">📍 ${c.place_name}</button>`)
                .join('') + `<button id="retry-btn">🔄 다시 말할게요</button>`;

            document.querySelectorAll('.candidate-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    destinationInput.value = candidates[btn.dataset.idx].place_name;
                    subText.innerHTML = DEFAULT_SUB_TEXT;
                    document.getElementById('search-btn').click();
                });
            });
            document.getElementById('retry-btn').addEventListener('click', () => {
                subText.innerHTML = DEFAULT_SUB_TEXT;
                statusText.innerText = "듣고 있습니다...";
                recognition.start();
            });
        }

        micBtn.addEventListener('click', function() {
            recognition.start();
            statusText.innerText = "듣고 있어요...🎙️";
            subText.innerText = "목적지를 말씀해 주세요.";
        });

        recognition.onresult = (event) => {
            const alternatives = [];
            for (let i = 0; i < event.results[0].length; i++) {
                alternatives.push(event.results[0][i].transcript);
            }

            const originalText = alternatives[0];
            const corrected = findKnownMatch(alternatives);
            if (corrected) {
                if (originalText === corrected) {
                    destinationInput.value = corrected;
                    statusText.innerText = `"${corrected}"(으)로 안내할까요?`;
                    subText.innerHTML = `<button id="confirm-btn">✅ 맞아요</button><button id="retry-btn">🔄 다시 말할게요</button>`;
                    
                    document.getElementById('confirm-btn').addEventListener('click', () => {
                        subText.innerHTML = DEFAULT_SUB_TEXT;
                        document.getElementById('search-btn').click();
                    });
                    document.getElementById('retry-btn').addEventListener('click', () => {
                        subText.innerHTML = DEFAULT_SUB_TEXT;
                        destinationInput.value = '';
                        statusText.innerText = "듣고 있습니다...";
                        recognition.start();
                    });

                } else {
                    statusText.innerText = "어느 곳을 찾으시나요?";
                    subText.innerHTML = `
                        <button class="choice-btn" data-name="${corrected}">📍 자주 가는 곳: ${corrected}</button>
                        <button class="choice-btn" data-name="${originalText}">📍 방금 말한 곳: ${originalText}</button>
                        <button id="retry-btn">🔄 다시 말할게요</button>
                    `;

                    document.querySelectorAll('.choice-btn').forEach(btn => {
                        btn.addEventListener('click', () => {
                            destinationInput.value = btn.dataset.name;
                            subText.innerHTML = DEFAULT_SUB_TEXT;
                            document.getElementById('search-btn').click();
                        });
                    });

                    document.getElementById('retry-btn').addEventListener('click', () => {
                        subText.innerHTML = DEFAULT_SUB_TEXT;
                        statusText.innerText = "듣고 있습니다...";
                        recognition.start();
                    });
                }
            } else {
                statusText.innerText = "검색 중...";
                searchKakaoCandidates(alternatives[0], showCandidates);
            }
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

        // 기준점 좌표 설정
        let centerLatLng = (useRealtimeGPS && gpsCoords)
            ? new kakao.maps.LatLng(gpsCoords.lat, gpsCoords.lng)
            : new kakao.maps.LatLng(37.6150000, 126.9200000);

        // 💡 [최근접 최적화] location, DISTANCE 정렬에 radius: 2000 반경 제한을 완벽히 결합!
        ps.keywordSearch(destination, function(data, status) {
            if (status === kakao.maps.services.Status.OK) {
                const targetPlace = data[0]; // 반경 내 가장 가까운 최근접 장소 선택
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

                        // 처음 경로 생성 시에만 카메라 초점 맞추기
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

                        // 💡 [30초 주기 위치 확인] 경로 안내가 성공했고 실시간 모드라면 타이머 가동
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
                alert("장소를 찾을 수 없습니다.");
                statusText.innerText = "어디로 갈까요?";
                subText.innerText = "목적지를 다시 입력해 주세요.";
            }
        }, {
            location: centerLatLng,                  
            sort: kakao.maps.services.SortBy.DISTANCE,
            radius: 2000, // 2km 이내 반경 제한 최적화              
            useMapBounds: false                        
        });
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
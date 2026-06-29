import { state } from './state.js';
import { elements, updateStatus, DEFAULT_SUB_TEXT, changeDefaultSubText } from './ui.js';
import { searchRoute } from './route.js';

const KNOWN_DESTINATIONS = ["연서시장", "연신내역 3번출구", "불광천", "북한산둘레길"];

// 1. 레벤슈타인 거리 기반 유사도 측정 알고리즘
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

// 2. 알려진 목적지 중에서 가장 유사한 것 찾기
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

// 3. 카카오맵 API를 이용한 반경 확대 후보군 검색
function searchKakaoCandidates(keyword, callback) {
    const radiusList = [500, 2000, 3500, 5000, 7500];
    let radiusIndex = 0;
    
    // 💡 [수정] 하드코딩된 좌표를 state.defaultCenter로 교체
    let centerLatLng = (state.useRealtimeGPS && state.gpsCoords)
        ? new kakao.maps.LatLng(state.gpsCoords.lat, state.gpsCoords.lng)
        : new kakao.maps.LatLng(state.defaultCenter.lat, state.defaultCenter.lng);

    function doCandidateSearch() {
        const currentRadius = radiusList[radiusIndex];
        const options = {
            location: centerLatLng,
            radius: currentRadius,
            sort: kakao.maps.services.SortBy.DISTANCE
        };

        state.ps.keywordSearch(keyword, (data, status) => {
            if (status === kakao.maps.services.Status.OK) {
                data.sort(function(a, b) {
                    const latC = centerLatLng.getLat();
                    const lngC = centerLatLng.getLng();
                    const distA = Math.pow(parseFloat(a.y) - latC, 2) + Math.pow(parseFloat(a.x) - lngC, 2);
                    const distB = Math.pow(parseFloat(b.y) - latC, 2) + Math.pow(parseFloat(b.x) - lngC, 2);
                    return distA - distB;
                });
                callback(data.slice(0, 3)); // 상위 3개만 반환
            } else {
                radiusIndex++;
                if (radiusIndex < radiusList.length) {
                    console.log(`🎙️ [음성 검색 후보] 반경 확대 스캔: ${radiusList[radiusIndex]}m`);
                    doCandidateSearch(); 
                } else {
                    callback([]); 
                }
            }
        }, options);
    }

    doCandidateSearch();
}

// 4. 검색된 후보군을 화면에 버튼으로 보여주는 함수
function showCandidates(candidates) {
    if (candidates.length === 0) {
        updateStatus("목적지를 찾지 못했습니다.", DEFAULT_SUB_TEXT);
        return;
    }
    
    let buttonsHtml = `<div class="dynamic-btn-group">` + 
        candidates.map((c, i) => `<button class="candidate-btn" data-idx="${i}">📍 ${c.place_name}</button>`).join('') + 
        `<button id="retry-btn">🔄 다시 말할게요</button></div>`;
        
    updateStatus("이 곳으로 안내할까요?", buttonsHtml);

    document.querySelectorAll('.candidate-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            elements.destinationInput.value = candidates[btn.dataset.idx].place_name;
            updateStatus("어디로 갈까요?", DEFAULT_SUB_TEXT);
            searchRoute();
        });
    });
    
    const retryBtn = document.getElementById('retry-btn');
    if (retryBtn) {
        retryBtn.addEventListener('click', () => {
            updateStatus("듣고 있습니다...", DEFAULT_SUB_TEXT);
            startRecognition();
        });
    }
}

let recognition = null;

// 5. 음성 인식 시작 (오류 방지 래퍼)
function startRecognition() {
    if (recognition) {
        try {
            recognition.start();
        } catch(e) {
            console.log("이미 음성인식이 시작되었거나 오류가 발생했습니다:", e);
        }
    }
}

// 6. 음성 인식 시스템 초기화 (외부에서 호출됨)
export function initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    // 💡 [호환성 대응] 브라우저가 음성 인식을 지원하지 않을 때의 우아한 처리
    if (!SpeechRecognition) {
        console.warn("⚠️ 이 브라우저는 음성 인식(Web Speech API)을 지원하지 않습니다. 마이크 기능을 비활성화합니다.");
        
        // 마이크 버튼 숨기기
        if (elements.micBtn) {
            elements.micBtn.style.display = 'none'; 
        }
        
        // 안내 문구에서 마이크 관련 내용 제거
        const fallbackText = "<span>원하시는 목적지를 검색창에 직접 입력해 주세요.</span>";
        changeDefaultSubText(fallbackText); // UI 파일의 변수 업데이트
        if (elements.subText) {
            elements.subText.innerHTML = fallbackText;
        }
        
        return; // 인식 기능 초기화 중단
    }

    // --- 지원하는 브라우저인 경우 정상적으로 초기화 진행 ---
    recognition = new SpeechRecognition();
    recognition.maxAlternatives = 3;
    recognition.interimResults = false;
    recognition.lang = 'ko-KR';

    if (elements.micBtn) {
        elements.micBtn.addEventListener('click', function() {
            startRecognition();
            updateStatus("듣고 있어요...🎙️", "목적지를 말씀해 주세요.");
        });
    }

    recognition.onresult = (event) => {
        const alternatives = [];
        for (let i = 0; i < event.results[0].length; i++) {
            alternatives.push(event.results[0][i].transcript);
        }

        const originalText = alternatives[0];
        const corrected = findKnownMatch(alternatives);
        
        if (corrected) {
            if (originalText === corrected) {
                // 정확히 일치하는 경우
                elements.destinationInput.value = corrected;
                
                let confirmHtml = `<div class="dynamic-btn-group"><button id="confirm-btn">✅ 맞아요</button><button id="retry-btn">🔄 다시 말할게요</button></div>`;
                updateStatus(`"${corrected}"(으)로 안내할까요?`, confirmHtml);
                
                document.getElementById('confirm-btn').addEventListener('click', () => {
                    updateStatus("경로 검색 중...", DEFAULT_SUB_TEXT);
                    searchRoute();
                });
                document.getElementById('retry-btn').addEventListener('click', () => {
                    elements.destinationInput.value = '';
                    updateStatus("듣고 있습니다...", DEFAULT_SUB_TEXT);
                    startRecognition();
                });

            } else {
                // 발음이 비슷하여 교정된 경우 선택지 제공
                let choiceHtml = `<div class="dynamic-btn-group">
                    <button class="choice-btn" data-name="${corrected}">📍 자주 가는 곳: ${corrected}</button>
                    <button class="choice-btn" data-name="${originalText}">📍 방금 말한 곳: ${originalText}</button>
                    <button id="retry-btn">🔄 다시 말할게요</button>
                </div>`;
                
                updateStatus("어느 곳을 찾으시나요?", choiceHtml);

                document.querySelectorAll('.choice-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        elements.destinationInput.value = btn.dataset.name;
                        updateStatus("경로 검색 중...", DEFAULT_SUB_TEXT);
                        searchRoute();
                    });
                });

                document.getElementById('retry-btn').addEventListener('click', () => {
                    updateStatus("듣고 있습니다...", DEFAULT_SUB_TEXT);
                    startRecognition();
                });
            }
        } else {
            // 알려진 목적지가 아니면 카카오맵 API로 후보군 검색
            updateStatus("검색 중...");
            searchKakaoCandidates(alternatives[0], showCandidates);
        }
    };
}
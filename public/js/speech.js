import { state } from './state.js';
import { elements, updateStatus, DEFAULT_SUB_TEXT, changeDefaultSubText } from './ui.js';
import { searchRoute } from './route.js';

const response = await fetch('/api/destinations'); //[cite: 11]
const result = await response.json();
let KNOWN_DESTINATIONS = result.status === "success" ? result.data : [];

// 레벤슈타인 거리 기반 유사도 측정 알고리즘
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

// 💡 카카오맵 API를 이용한 음성 후보군 똑똑하게 검색
function searchKakaoCandidates(keyword, callback) {
    const radiusList = [500, 2000, 3500, 5000, 7500];
    let radiusIndex = 0;
    
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

        if (keyword.endsWith('역')) {
            options.category_group_code = 'SW8';
        }

        state.ps.keywordSearch(keyword, (data, status) => {
            if (status === kakao.maps.services.Status.OK) {
                
                let validData = data;
                
                if (keyword.endsWith('역')) {
                    const keywordTrim = keyword.replace(/\s+/g, '');
                    validData = data.filter(p => p.place_name.replace(/\s+/g, '').includes(keywordTrim));
                }

                if (validData.length === 0) {
                    radiusIndex++;
                    if (radiusIndex < radiusList.length) {
                        console.log(`🎙️ [음성 검색 후보] 엉뚱한 결과 배제. 반경 확대 스캔: ${radiusList[radiusIndex]}m`);
                        doCandidateSearch(); 
                    } else {
                        callback([]); 
                    }
                    return;
                }

                validData.sort(function(a, b) {
                    const aExact = a.place_name === keyword || a.place_name.startsWith(keyword + ' ') || a.place_name.startsWith(keyword + '(');
                    const bExact = b.place_name === keyword || b.place_name.startsWith(keyword + ' ') || b.place_name.startsWith(keyword + '(');
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
                
                callback(validData.slice(0, 3)); 
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

function startRecognition() {
    if (recognition) {
        try {
            recognition.start();
        } catch(e) {
            console.log("이미 음성인식이 시작되었거나 오류가 발생했습니다:", e);
        }
    }
}

export function initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
        console.warn("⚠️ 이 브라우저는 음성 인식(Web Speech API)을 지원하지 않습니다. 마이크 기능을 비활성화합니다.");
        if (elements.micBtn) {
            elements.micBtn.style.display = 'none'; 
        }
        
        const fallbackText = "<span>원하시는 목적지를 검색창에 직접 입력해 주세요.</span>";
        changeDefaultSubText(fallbackText); 
        if (elements.subText) {
            elements.subText.innerHTML = fallbackText;
        }
        
        return; 
    }

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
            updateStatus("검색 중...");
            searchKakaoCandidates(alternatives[0], showCandidates);
        }
    };
}
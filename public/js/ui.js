// 💡 [최적화] 매번 DOM을 뒤지지 않고, 최초 1회만 찾아 변수에 저장해 둡니다.
export const elements = {
    container: document.getElementById('map'),
    uiContainer: document.getElementById('ui-container') || document.getElementById('search-page'),
    statusText: document.getElementById('status-text'),
    subText: document.getElementById('sub-text'),
    destinationInput: document.getElementById('destination-input'),
    micBtn: document.getElementById('mic-btn'),
    gpsToggleBtn: document.getElementById('gps-toggle-btn'),
    searchBtn: document.getElementById('search-btn')
};

// 💡 [수정] 상황에 따라 기본 문구를 변경할 수 있도록 let으로 선언합니다.
export let DEFAULT_SUB_TEXT = "<span>원하시는 목적지를 검색창에 입력하거나 마이크 버튼을 눌러 말씀해 주세요.</span>";

// 상황에 맞게 안내 문구를 변경하는 함수
export function changeDefaultSubText(newText) {
    DEFAULT_SUB_TEXT = newText;
}

export function updateStatus(status, subHtml) {
    if (elements.statusText) {
        elements.statusText.innerText = status;
    }
    if (elements.subText && subHtml !== undefined) {
        elements.subText.innerHTML = subHtml;
    }
}
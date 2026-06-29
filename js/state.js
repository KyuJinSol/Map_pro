export const state = {
    useRealtimeGPS: false,
    gpsCoords: null,
    locationTimer: null,
    start_name: "GTX연신849",
    
    // 💡 [추가] 하드코딩을 대체할 기본 광장(기준점) 좌표 변수
    defaultCenter: { lat: 37.6188881, lng: 126.920832 }, 
    
    currentPathLine: null,
    startMarker: null,
    endMarker: null,
    map: null,
    ps: null
};
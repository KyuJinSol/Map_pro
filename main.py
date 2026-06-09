from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

# 💡 중요: 프론트엔드(Live Server)와 백엔드가 서로 다른 주소에서 통신할 수 있도록 허용하는 설정 (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 실습을 위해 모든 도메인 허용
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 프론트엔드에서 넘겨줄 데이터 양식 정의
class RouteRequest(BaseModel):
    current_location: str  # 위도,경도 텍스트 (예: "37.6188881,126.920832")
    destination: str       # 목적지 이름 (예: "연서시장")

# 🗺️ 길 찾기 요청을 처리하는 API 주소 생성
@app.post("/api/routes")
def get_route(request: RouteRequest):
    # 프론트엔드가 데이터를 보내면 파이썬 터미널 창에 출력됩니다.
    print(f"[서버 수신] 출발지 좌표: {request.current_location} | 목적지: {request.destination}")
    
    # 🚧 [다음 단계 작업] 여기에 MySQL DB 조회 로직과 실제 도보 길 찾기 API 연동이 들어갑니다.
    
    # 우선 프론트엔드에게 데이터가 잘 도착했다는 신호를 보냅니다.
    return {
        "status": "success",
        "message": f"백엔드가 {request.destination}까지의 최적 도보 경로를 계산하는 중입니다.",
        "test_data": {
            "start": request.current_location,
            "end": request.destination
        }
    }
import sys
import subprocess

# 💡 [코드 내 자동화] 서버가 실행될 때 핵심 라이브러리를 무조건 최신 버전으로 업데이트합니다.
def init_and_update_environment():
    # 우리 내비게이션 시스템에 필요한 알맹이 라이브러리 목록
    essential_packages = ["pymysql", "requests", "fastapi", "uvicorn", "pydantic"]
    
    print("\n[⚙️ 시스템] 파이썬 최신 환경 검사 및 라이브러리 자동 업데이트 시작...")
    for package in essential_packages:
        try:
            # 컴퓨터 내부의 pip를 끄집어내어 백그라운드에서 최신 버전(--upgrade)으로 설치를 때립니다.
            subprocess.check_call([sys.executable, "-m", "pip", "install", "--upgrade", package])
        except Exception as e:
            print(f"⚠️ {package} 자동 설치 중 오류 발생: {str(e)}")
    print("[⚙️ 시스템] 모든 필수 라이브러리가 파이썬 최신 버전 환경에 맞춰 세팅되었습니다.\n")

# 🚀 다른 코드(import)가 실행되기 전에 최우선으로 환경을 강제 동기화합니다.
init_and_update_environment()

# --- 여기서부터 기존 import 및 코드가 이어집니다 ---
import pymysql
import requests
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

TMAP_API_KEY = "xtombuydrL8RE8Fs2iavf4VjHKfDJPYn4sludT1E"

def get_db_connection():
    return pymysql.connect(
        host='localhost', user='root', password='chan030531^^',  
        database='map_db', charset='utf8mb4', cursorclass=pymysql.cursors.DictCursor  
    )

class RouteRequest(BaseModel):
    start_name: str       
    end_lat: float        
    end_lng: float        
    destination_name: str 

@app.post("/api/routes")
def get_route(request: RouteRequest):
    print(f"\n[서버 수신] 🛫출발 모드 데이터: {request.start_name} -> 🏁목적지: {request.destination_name}")

    try:
        start_lat = 0.0
        start_lng = 0.0
        display_start_name = ""

        if "," in request.start_name:
            lat_str, lng_str = request.start_name.split(",")
            start_lat = float(lat_str)
            start_lng = float(lng_str)
            display_start_name = "실시간 현재 위치"
            print(f"📡 [GPS 모드] 진짜 사람 위치 기준: {start_lat}, {start_lng}")
        else:
            connection = get_db_connection()
            with connection.cursor() as cursor:
                sql = "SELECT latitude, longitude, name_ko FROM QR_Locations WHERE name_ko LIKE %s"
                cursor.execute(sql, (f"%{request.start_name}%",))
                db_result = cursor.fetchone()
            connection.close()

            if not db_result:
                return {"status": "empty", "message": "출발지 데이터가 없습니다.", "data": None}
            
            start_lat = float(db_result['latitude'])
            start_lng = float(db_result['longitude'])
            display_start_name = db_result['name_ko']
            print(f"🎯 [DB 고정 모드] 광장 거점 기준: {display_start_name}")

        # 💡 [큰길 안내 반영] 주소 맨 끝에 &searchOption=10 옵션을 확실하게 붙였습니다!
        url = "https://apis.openapi.sk.com/tmap/routes/pedestrian?version=1&format=json&callback=result&searchOption=10"
        
        headers = { "appKey": TMAP_API_KEY, "Content-Type": "application/json" }
        payload = {
            "startX": start_lng, "startY": start_lat,
            "endX": request.end_lng, "endY": request.end_lat,
            "reqCoordType": "WGS84GEO", "resCoordType": "WGS84GEO",
            "startName": display_start_name, "endName": request.destination_name
        }

        response = requests.post(url, json=payload, headers=headers)
        if response.status_code != 200:
            raise Exception(f"Tmap API 응답 실패 (코드: {response.status_code})")
            
        return {
            "status": "success",
            "message": f"'{display_start_name}'에서 '{request.destination_name}'까지의 큰길 경로 계산 완료.",
            "data": response.json()
        }

    except Exception as e:
        print(f"❌ [서버 에러] : {str(e)}")
        return {"status": "error", "message": str(e), "data": None}
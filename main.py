import pymysql
import requests
import os
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
    # 💡 팀원 컴퓨터 환경변수에 'DB_PASSWORD'가 등록되어 있으면 그걸 쓰고, 없으면 내 기본 비밀번호 사용!
    db_password = os.getenv("DB_PASSWORD", "chan030531^^") 
    
    return pymysql.connect(
        host='localhost', user='root', password=db_password,  
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
# main.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from services import run_stablehair_logic
import traceback
from dotenv import load_dotenv

load_dotenv() 

class StableHairRequest(BaseModel):
    user_id:    int
    request_id: int

class Config:
    extra = "ignore"  # 🔥 핵심! 모델에 없는 필드는 무시
    

app = FastAPI()

@app.get("/run-stablehair/{user_id}/{request_id}")
async def run_stablehair_get(user_id: int, request_id: int):
    print(f"▶ [run_stablehair_get] received user_id={user_id}, request_id={request_id}")
    return run_stablehair_logic(user_id, request_id)

@app.post("/run-stablehair")
async def run_stablehair(req: StableHairRequest):
    print(f"▶ [run_stablehair_post] received user_id={req.user_id}, request_id={req.request_id}")
    try:
        result = run_stablehair_logic(req.user_id, req.request_id)
        return {"status": "success", "result": result}
    except Exception as e:
        print("🔥 Error in /run-stablehair/ 🔥")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

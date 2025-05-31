from pydantic import BaseModel

class StableHairRequest(BaseModel):
    user_id:    int
    request_id: int

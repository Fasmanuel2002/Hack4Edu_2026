from fastapi import APIRouter

health_route = APIRouter(prefix="/health", tags=["Health of the service"])

@health_route.get("/health")
async def health_check():
    return {"status":"healty"}

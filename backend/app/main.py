from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import settings

app = FastAPI(
    title=settings.APP_NAME,
    description="AI-powered financial fraud detection and explainability platform",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print("DEBUG: router routes before include:", len(api_router.routes))

app.include_router(
    api_router,
    prefix="/api/v1",
)

print("DEBUG: app routes after include:")
for route in app.routes:
    print("DEBUG:", getattr(route, "methods", None), getattr(route, "path", None))


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "fraud-shield-backend",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

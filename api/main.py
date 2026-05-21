import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from config import get_settings
from routers import auth, generate, documents, bots, chat, usage, knowledge, admin, saved_listings, contracts

settings = get_settings()

app = FastAPI(
    title="Automation Station API",
    description="AI automation platform for real estate and contracting businesses",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs(settings.pdf_output_dir, exist_ok=True)
app.mount("/files", StaticFiles(directory=settings.pdf_output_dir), name="files")

app.include_router(auth.router)
app.include_router(generate.router)
app.include_router(documents.router)
app.include_router(contracts.router)
app.include_router(bots.router)
app.include_router(chat.router)
app.include_router(usage.router)
app.include_router(knowledge.router)
app.include_router(admin.router)
app.include_router(saved_listings.router)


@app.get("/health")
async def health():
    return {"status": "ok"}

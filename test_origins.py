import os
from dotenv import load_dotenv

load_dotenv("backend/.env")
default_origins = "http://localhost:3000,https://forgot-ai.vercel.app"
raw_origins = os.environ.get("CORS_ORIGINS", default_origins).split(",")
origins = [o.strip().strip("'").strip('"') for o in raw_origins if o.strip()]
print(origins)

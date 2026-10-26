import uvicorn
from dotenv import load_dotenv
import os
load_dotenv()

def main():
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", "8502"))
    print("Twins4Language: http://{host}:{port}")
    uvicorn.run("src.modules.app.main:app", host=host, port=port, log_level="warning")


if __name__ == "__main__":
    main()

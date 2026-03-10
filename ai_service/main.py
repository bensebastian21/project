from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import time

# Placeholder for actual model imports connecting to our CPU-optimized Local ML files
from models.text_generator import generate_event_copy
from models.image_generator import generate_poster
from models.engagement_predictor import predict_engagement

app = FastAPI(title="GenLoop AI Microservice", description="Local CPU-optimized Generative ML for Evenite")

# Allow Node.js backend to communicate
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict to Node.js server origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class GenerateRequest(BaseModel):
    title: str
    topic: str
    target_audience: str
    venue: str

class FeedbackRequest(BaseModel):
    event_id: str
    views: int
    clicks: int
    registrations: int

@app.post("/api/genloop/generate")
async def generate_content(req: GenerateRequest):
    """
    Main endpoint called when a host clicks 'Autogenerate' in GenLoop Studio.
    Runs text generation, image generation, and engagement prediction.
    """
    try:
        start_time = time.time()
        
        # 1. Text Generation (Llama.cpp)
        print("Generating text...")
        data, keywords = generate_event_copy(
            req.title, req.topic, req.target_audience
        )
        
        # 2. Image Generation (Latent Consistency Model / TinySD)
        print("Generating image...")
        poster_base64 = generate_poster(f"An academic poster for {data['title']}, topic: {req.topic}, style: professional, modern minimalist, highly detailed")
        
        # 3. Predict Engagement (Scikit-Learn)
        print("Predicting engagement...")
        score, rewards = predict_engagement(data['full_description_html'], req.target_audience)
        
        end_time = time.time()
        print(f"GenLoop Pipeline absolute execution time: {end_time - start_time:.2f}s")
        
        return {
            "success": True,
            "data": {
                "title": data['title'],
                "short_description": data['short_description'],
                "description_html": data['full_description_html'],
                "keywords": keywords,
                "poster_base64": poster_base64,
                "engagement_score": score,
                "suggested_rewards": rewards
            }
        }
    except Exception as e:
        print(f"Error in GenLoop pipeline: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/genloop/feedback")
async def collect_feedback(req: FeedbackRequest):
    """
    Called periodically from Node to feed viral loop metrics back to the ML pipeline
    """
    # Logic to append req to pandas dataframe/csv for nightly Scikit-Learn retraining
    print(f"Received feedback for event {req.event_id}: {req.registrations} registrations / {req.views} views")
    return {"success": True, "message": "Feedback recorded for model training."}

if __name__ == "__main__":
    print("Starting GenLoop AI Local Microservice...")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

import torch
from diffusers import DiffusionPipeline, LCMScheduler
import os
import base64
from io import BytesIO

# Latent Consistency Models generate acceptable images in 4 steps instead of 50.
# This makes it possible to run image generation on a CPU in 1-2 minutes instead of 10+.
MODEL_ID = "SimianLuo/LCM_Dreamshaper_v7"

_pipeline = None

def get_pipeline():
    global _pipeline
    if _pipeline is None:
        try:
            print(f"Loading LCM Image Generator '{MODEL_ID}' into CPU RAM...")
            print("This will download ~2GB of weights on the first run.")
            
            # Use standard pipeline but with LCM scheduler
            _pipeline = DiffusionPipeline.from_pretrained(
                MODEL_ID, 
                torch_dtype=torch.float32,
                safety_checker=None # Reduce RAM usage further
            )
            
            # Explicitly force CPU
            device = "cpu"
            _pipeline.to(device)
            
            # Optimize for memory since we only have 16GB total system RAM
            _pipeline.scheduler = LCMScheduler.from_config(_pipeline.scheduler.config)
            
            # Recommended for low-RAM setups to prevent OOM kills
            _pipeline.enable_attention_slicing()
            
            print("Image Pipeline loaded successfully on CPU.")
        except Exception as e:
            print(f"Error loading Image Pipeline: {e}")
            return None
    return _pipeline

def generate_poster(prompt: str) -> str:
    """
    Takes a generated text prompt and creates a 512x512 event poster.
    Returns the image as a Base64 encoded string so it can be sent directly via the API.
    """
    pipe = get_pipeline()
    
    if pipe is None:
        return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=" # return 1x1 blank pixel on failure

    # We append styling tags to force an Evenite/Academic poster look
    enhanced_prompt = f"{prompt}, modern university event poster, neo-brutalism design style, clean typography, highly detailed illustration, 4k resolution, trending on behance"
    
    print(f"Generating image on CPU (estimated time 60-120s): '{prompt}'")
    
    try:
        # LCM only needs 4-8 steps to look decent
        image = pipe(
            prompt=enhanced_prompt, 
            num_inference_steps=6, 
            guidance_scale=8.0,
            width=512,
            height=512
        ).images[0]
        
        print("Image generated successfully.")
        
        # Convert PIL Image to Base64 String
        buffered = BytesIO()
        image.save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
        
        return f"data:image/png;base64,{img_str}"
        
    except Exception as e:
        print(f"Error generating poster: {e}")
        return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="

if __name__ == "__main__":
    # Test generation
    base64_img = generate_poster("A neon cyberpunk hackathon poster")
    print("Generated base64 string length:", len(base64_img))

import os
from llama_cpp import Llama
import traceback
import json
import re

# Path to where we will download a small 4-bit Quantized model (e.g., Llama-3-8B-Instruct.Q4_K_M.gguf)
# We use GGUF because it allows running massive LLMs on CPU RAM instead of requiring a VRAM GPU
MODEL_DIR = "models/weights"
MODEL_NAME = "Phi-3-mini-4k-instruct-q4_k_m.gguf" # Phi-3 is incredibly fast on CPUs
MODEL_PATH = os.path.join(MODEL_DIR, MODEL_NAME)

# Keep the model eagerly loaded in memory to prevent 10-second cold starts
_llm = None

def get_llm():
    global _llm
    if _llm is None:
        if not os.path.exists(MODEL_PATH):
            print(f"ERROR: Model weights not found at {MODEL_PATH}")
            print(f"Please download a GGUF model and place it there.")
            return None
        
        print(f"Loading Quantized Model {MODEL_NAME} into CPU RAM...")
        # `n_ctx` is context window. `n_threads` leverages multi-core CPUs
        _llm = Llama(
            model_path=MODEL_PATH,
            n_ctx=2048,
            n_threads=8, # Optimized for Ryzen 5 6/8-core architectures
            verbose=False,
            # No n_gpu_layers since we are explicitly on an integrated graphics CPU
        )
        print("Model loaded successfully.")
    return _llm
    
def generate_event_copy(title: str, topic: str, target_audience: str) -> tuple[dict, list[str]]:
    """
    Generates a viral structured event description using the local GGUF model.
    Returns: (dict containing title, short_description, full_description_html), keywords
    """
    llm = get_llm()
    
    if llm is None:
        # Fallback mechanism if the user hasn't downloaded the weights yet
        print("Falling back to dummy text generation (Weights missing)")
        dummy_data = {
            "title": title,
            "short_description": f"An amazing event focusing on {topic} for {target_audience}.",
            "full_description_html": f"<h2>{title}</h2><p>An amazing event focusing on {topic} for {target_audience}. "
                                     "Join us for an incredible session full of networking and learning!</p>"
        }
        return dummy_data, ["learning", topic.split()[0] if topic else "event", "networking"]

    # Prompt Engineering: Asking for JSON
    prompt = f"""<|system|>
You are 'GenLoop', an expert event marketing AI on a university platform called Evenite.
Your goal is to write a highly engaging, viral event description.
You must return your response in the following JSON format ONLY:
{{
  "title": "A catchy, viral title",
  "short_description": "A one-sentence punchy hook (max 120 chars)",
  "full_description_html": "A 3-paragraph detailed description using <h2> for headers and <p> for paragraphs"
}}
Return ONLY the raw JSON. Do not include markdown formatting or backticks.

<|user|>
Write an event description for:
Title: {title}
Topic: {topic}
Target Audience: {target_audience}

<|assistant|>
"""
    
    try:
        print("Running CPU inference (llama.cpp) for text generation...")
        # Start generation
        response = llm(
            prompt,
            max_tokens=450,
            stop=["<|user|>", "<|end|>"],
            temperature=0.7,
            top_p=0.9,
            echo=False
        )
        
        raw_text = response['choices'][0]['text'].strip()
        
        # Clean up in case the model included backticks
        clean_json = re.sub(r'```json\s*|\s*```', '', raw_text).strip()
        
        try:
            data = json.loads(clean_json)
            # Ensure all fields exist
            if "title" not in data: data["title"] = title
            if "short_description" not in data: data["short_description"] = topic[:120]
            if "full_description_html" not in data: data["full_description_html"] = f"<p>{topic}</p>"
        except json.JSONDecodeError:
            print("Failed to parse AI JSON, falling back to heuristic parsing")
            # Heuristic fallback if JSON fails
            data = {
                "title": title,
                "short_description": "An incredible campus event you don't want to miss!",
                "full_description_html": f"<p>{raw_text}</p>" if "<p>" not in raw_text else raw_text
            }
        
        # Simple local keyword extraction
        words = topic.split() + title.split()
        keywords = [w.lower() for w in words if len(w) > 3 and w.isalnum()][:4]
        if not keywords:
            keywords = ["event", "campus", "social"]
            
        return data, keywords
        
    except Exception as e:
        print(f"Error during local text generation: {e}")
        traceback.print_exc()
        error_data = {
            "title": title,
            "short_description": "Join us for this amazing event!",
            "full_description_html": f"<p>Error generating description for {title}. Please try again.</p>"
        }
        return error_data, ["error"]

# Test block
if __name__ == "__main__":
    copy, tags = generate_event_copy("Tech Meetup", "React Frameworks", "CS Students")
    print(copy)
    print("Tags:", tags)

from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import io
import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image

# For LangChain Chatbot
from langchain.chat_models import ChatOpenAI
from langchain.schema import HumanMessage, SystemMessage
import os

app = FastAPI(title="Healthcare AI Diagnostic API")

# Allow frontend to communicate with backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------
# 1. SETUP PyTorch MODEL
# -----------------------------
device = torch.device("cpu")
model = None
classes = ['Normal', 'Pneumonia']

def load_model():
    global model
    try:
        model = models.densenet121(pretrained=False)
        num_ftrs = model.classifier.in_features
        model.classifier = nn.Linear(num_ftrs, 2)
        # Load weights if available (you must run train.py first to generate this)
        if os.path.exists('pneumonia_model.pth'):
            model.load_state_dict(torch.load('pneumonia_model.pth', map_location=device))
            model.eval()
            print("Successfully loaded trained model weights.")
        else:
            print("WARNING: 'pneumonia_model.pth' not found. Using untrained model for demo purposes.")
            model.eval()
    except Exception as e:
        print(f"Error loading model: {e}")

load_model()

# Image Preprocessing steps
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
])

# -----------------------------
# 2. SETUP LANGCHAIN CHATBOT
# -----------------------------
# You will need to set an environment variable: os.environ["OPENAI_API_KEY"] = "your-key"
# We'll use a mocked response if the key is missing to prevent crashes.

@app.get("/")
def read_root():
    return {"message": "Welcome to the Healthcare AI Diagnostic API"}

import cv2
import base64
import numpy as np

@app.post("/api/predict")
async def predict_disease(image: UploadFile = File(...)):
    try:
        # Read the image file
        contents = await image.read()
        pil_image = Image.open(io.BytesIO(contents)).convert('RGB')
        
        # Preprocess the image
        input_tensor = transform(pil_image)
        input_batch = input_tensor.unsqueeze(0) # create a mini-batch as expected by the model
        
        # Make Prediction
        with torch.no_grad():
            output = model(input_batch)
            probabilities = torch.nn.functional.softmax(output[0], dim=0)
            confidence, predicted_idx = torch.max(probabilities, 0)
            
        predicted_class = classes[predicted_idx.item()]
        conf_score = confidence.item()

        # Generate a simulated Grad-CAM heatmap for demonstration using OpenCV
        # (In a true production app, you would use the pytorch-grad-cam library here)
        cv_img = np.array(pil_image)
        cv_img = cv2.cvtColor(cv_img, cv2.COLOR_RGB2BGR)
        cv_img = cv2.resize(cv_img, (224, 224))
        
        # Create a mock heatmap (highlighting center regions common in X-rays)
        mock_cam = np.zeros((224, 224), dtype=np.float32)
        cv2.circle(mock_cam, (112, 112), 60, 1.0, -1)
        mock_cam = cv2.GaussianBlur(mock_cam, (51, 51), 0)
        
        # Apply Jet Colormap
        heatmap = cv2.applyColorMap(np.uint8(255 * mock_cam), cv2.COLORMAP_JET)
        heatmap = np.float32(heatmap) / 255
        
        # Overlay heatmap on original image
        overlay = heatmap + np.float32(cv_img)/255
        overlay = overlay / np.max(overlay)
        overlay_final = np.uint8(255 * overlay)
        
        # Convert to Base64 string to send to frontend
        _, buffer = cv2.imencode('.jpg', overlay_final)
        heatmap_base64 = base64.b64encode(buffer).decode('utf-8')
        heatmap_data_url = f"data:image/jpeg;base64,{heatmap_base64}"

        return {
            "status": "success",
            "prediction": predicted_class,
            "confidence": conf_score,
            "heatmap_url": heatmap_data_url,
            "message": f"{predicted_class} detected. Please consult a doctor for official diagnosis."
        }
    except Exception as e:
        return {"error": str(e)}

@app.post("/api/chat")
async def chat_assistant(message: str = Form(...)):
    api_key = os.getenv("OPENAI_API_KEY")
    
    if not api_key:
        return {
            "response": "I see your message, but the OpenAI API key is missing. "
                        "To activate the AI brain, set the OPENAI_API_KEY environment variable. "
                        f"You asked: {message}"
        }
        
    try:
        # Define the AI role and safety guardrails
        system_prompt = """
        You are a helpful Healthcare AI Assistant. 
        You analyze symptoms and answer general health queries.
        CRITICAL RULES:
        1. You are NOT a doctor. You must state this clearly.
        2. DO NOT prescribe medications.
        3. ALWAYS recommend visiting a healthcare professional for serious symptoms.
        """
        
        chat = ChatOpenAI(temperature=0.7, model_name="gpt-3.5-turbo")
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=message)
        ]
        
        # Get AI response
        ai_response = chat(messages)
        return {"response": ai_response.content}
        
    except Exception as e:
        return {"response": f"An error occurred with the AI chat: {str(e)}"}

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)

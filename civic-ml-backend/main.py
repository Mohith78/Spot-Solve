from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
from PIL import Image
import numpy as np
import io
import json
from pathlib import Path
import tensorflow as tf
from tensorflow.keras.models import load_model



app = FastAPI()

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "models" / "garbage_model.h5"
CLASS_PATH = BASE_DIR / "models" / "class_names.json"

model = None
model_error = None
try:
    model = load_model(MODEL_PATH, compile=False)
except Exception as exc:  # pragma: no cover
    # Handle Keras serialization compatibility (e.g., DTypePolicy)
    try:
        model = load_model(
            MODEL_PATH,
            compile=False,
            custom_objects={
                "DTypePolicy": tf.keras.mixed_precision.Policy,
                "Policy": tf.keras.mixed_precision.Policy,
            },
        )
    except Exception as exc2:  # pragma: no cover
        model_error = f"{exc} | {exc2}"


if CLASS_PATH.exists():
    with open(CLASS_PATH, "r", encoding="utf-8") as f:
        class_names = json.load(f)
else:
    # Fallback labels if class_names.json is not available.
    class_names = ["class_0", "class_1", "class_2", "class_3"]

# Change this to match the image size used during model training.
IMG_SIZE = (224, 224)


@app.get("/")
def health():
    return {
        "status": "ok" if model is not None else "error",
        "message": "ML backend running",
        "model_loaded": model is not None,
        "model_path": str(MODEL_PATH),
        "model_error": model_error,
    }


@app.get("/health")
def health_alt():
    return health()


@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    if model is None:
        return JSONResponse(
            status_code=500,
            content={"error": "Model not loaded", "details": model_error},
        )

    try:
        content = await file.read()
        image = Image.open(io.BytesIO(content)).convert("RGB")
        image = image.resize(IMG_SIZE)

        arr = np.array(image, dtype=np.float32) / 255.0
        arr = np.expand_dims(arr, axis=0)  # (1, H, W, 3)

        preds = model.predict(arr, verbose=0)[0]
        idx = int(np.argmax(preds))
        confidence = float(preds[idx])

        label = class_names[idx] if idx < len(class_names) else f"class_{idx}"
        return {"prediction": label, "confidence": confidence}
    except Exception as exc:  # pragma: no cover
        return JSONResponse(
            status_code=500,
            content={"error": "Prediction failed", "details": str(exc)},
        )

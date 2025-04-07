import websocket
import time
import threading
import json
import numpy as np
from collections import deque
import tensorflow as tf
import asyncio
import websockets
from threading import Thread
from tensorflow.keras.models import load_model


class ECGArrhythmiaDetector:
    def __init__(self, model_path="arrhythmia_detection_model1.h5", websocket_url="ws://192.168.0.110:81"):
        self.websocket_url = websocket_url
        self.connected = False
        self.ws = None
        self.data_buffer = deque(maxlen=200)
        self.threshold = 0.55
        self.beat_count = 0
        
        # WebSocket server properties
        self.clients = set()
        
        # Load model
        print("Loading model...")
        self.model = load_model(model_path)
        print("Model loaded successfully")
        
        # Class labels
        self.arrhythmia_classes = {
            0: '/',
            1: 'L',
            2: 'N',
            3: 'R',
            4: 'V'
        }
        
        # Start WebSocket server for predictions
        threading.Thread(target=self.start_websocket_server, daemon=True).start()

    async def handler(self, websocket):
        self.clients.add(websocket)
        try:
            await websocket.wait_closed()
        finally:
            self.clients.remove(websocket)

    def start_websocket_server(self):
        print("Starting prediction WebSocket server on port 8765...")
        asyncio.run(self.run_websocket_server())

    async def run_websocket_server(self):
        async with websockets.serve(self.handler, "0.0.0.0", 8765):
            await asyncio.Future()

    async def broadcast(self, message):
        if self.clients:
            await asyncio.gather(*[client.send(message) for client in self.clients.copy()])

    def send_prediction(self, class_name, confidence):
        message = json.dumps({
            "beat": self.beat_count,
            "data": list(self.data_buffer),
            "data_length": len(self.data_buffer),
            "class": class_name,
            "confidence": float(confidence)
        })
        asyncio.run(self.broadcast(message))

    def preprocess_input(self, ecg_data):
        actual_length = len(ecg_data)
        
        if actual_length < 200:
            ecg_data = np.pad(list(ecg_data), (0, 200 - actual_length), mode='constant')
        else:
            ecg_data = list(ecg_data)[:200]
        
        ecg_data = np.array(ecg_data).reshape(1, 10, 20, 1)
        return ecg_data
    
    def predict(self, ecg_data):
        processed_data = self.preprocess_input(ecg_data)
        prediction = self.model.predict(processed_data, verbose=0)
        
        if prediction.shape[1] == 1:
            predicted_class = int(prediction[0][0] >= 0.5)
            confidence = prediction[0][0] if predicted_class == 1 else 1 - prediction[0][0]
        else:
            predicted_class = np.argmax(prediction)
            confidence = prediction[0][predicted_class]
        
        return predicted_class, confidence
        
    def connect(self):
        def on_message(ws, message):
            try:
                data = json.loads(message)
                if 'value' in data:
                    self.data_buffer.append(data['value'])
                    
                    if len(self.data_buffer) == 200 and self.data_buffer[100] > self.threshold:
                        self.beat_count += 1
                        print(f"\n--- Beat {self.beat_count} detected ---")
                        
                        beat_data = list(self.data_buffer)
                        predicted_class, confidence = self.predict(beat_data)
                        
                        class_name = self.arrhythmia_classes.get(predicted_class, f"Class {predicted_class}")
                        print(f"PREDICTION: {class_name} (Confidence: {confidence:.2f})")
                        
                        # Send prediction to web clients
                        self.send_prediction(class_name, confidence)
                        self.data_buffer.clear()
            except Exception as e:
                print(f"Error processing message: {e}")
        
        def on_error(ws, error):
            print(f"WebSocket error: {error}")
        
        def on_close(ws, close_status_code, close_msg):
            print("ECG WebSocket connection closed")
            self.connected = False
        
        def on_open(ws):
            print("Connected to ECG WebSocket server")
            self.connected = True
        
        self.ws = websocket.WebSocketApp(
            self.websocket_url,
            on_message=on_message,
            on_error=on_error,
            on_close=on_close,
            on_open=on_open
        )
        
        self.ws_thread = threading.Thread(target=self.ws.run_forever, daemon=True)
        self.ws_thread.start()
        
    def disconnect(self):
        if self.ws:
            self.ws.close()
            self.connected = False

    def wait_for_connection(self, timeout=10):
        start_time = time.time()
        while not self.connected and time.time() - start_time < timeout:
            time.sleep(0.1)
        return self.connected

if __name__ == "__main__":
    detector = ECGArrhythmiaDetector(
        model_path="arrhythmia_detection_model1.h5", 
        websocket_url="ws://192.168.0.110:81"
    )
    
    try:
        print("Connecting to ECG data server...")
        detector.connect()
        
        if detector.wait_for_connection():
            print("Connected! Processing data...")
            while True:
                time.sleep(1)
        else:
            print("Failed to connect to ECG data server")
            
    except KeyboardInterrupt:
        print("\nStopping...")
    finally:
        detector.disconnect()
        print("Disconnected")
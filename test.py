import sounddevice as sd
import numpy as np
import wave
import boto3
import uuid

BUCKET_NAME = "turbos-medifi"
DURATION = 5
FS = 16000  # better for voice

print("Recording...")
audio = sd.rec(int(DURATION * FS), samplerate=FS, channels=1, dtype='float32')
sd.wait()
print("Recording done")

# 🔥 FIX: convert properly
audio = (audio * 32767).astype(np.int16)

filename = f"{uuid.uuid4()}.wav"

with wave.open(filename, 'wb') as f:
    f.setnchannels(1)
    f.setsampwidth(2)  # 16-bit
    f.setframerate(FS)
    f.writeframes(audio.tobytes())

# upload
s3 = boto3.client("s3", region_name="ap-south-1")
file_key = f"audio/{filename}"

s3.upload_file(filename, BUCKET_NAME, file_key)

print("Uploaded to S3:", file_key)
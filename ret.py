import boto3
import webbrowser

BUCKET_NAME = "turbos-medifi"
FILE_KEY = "audio/b8298447-785d-4f18-b892-b45d7400c9e6.wav"

# ✅ FIX: set correct region
s3 = boto3.client("s3", region_name="ap-south-1")

url = s3.generate_presigned_url(
    "get_object",
    Params={"Bucket": BUCKET_NAME, "Key": FILE_KEY},
    ExpiresIn=3600
)

print("Audio URL:", url)

webbrowser.open(url)
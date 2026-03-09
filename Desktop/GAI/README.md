# GAI OS - General Autonomous Intelligence

GAI OS is a web-based Operating System interface for an autonomous AI agent. It runs on Google Cloud Run with persistent storage provided by Google Cloud Storage.

## Architecture

- **Core:** Node.js (Express)
- **Frontend:** React + Vite + Tailwind (Neumorphic Design)
- **Brain:** Ollama (lokalne modele)
- **Persistence:** Cloud Storage FUSE mounted at `/app/data`

## Deployment (Recommended: GitHub UI Integration)

This is the easiest method. It sets up Continuous Deployment (CD), so every time you push code to GitHub, Google updates your app automatically.

### Step 1: Create the Memory Bucket (The Disk)
Before creating the service, you need a place to store data. Open the Google Cloud Console terminal (Cloud Shell) and run:

```bash
gcloud storage buckets create gs://gai-memory-root --location=us-central1 --uniform-bucket-level-access
```

*(You can change `gai-memory-root` to a unique name if taken).*

### Step 2: Connect Cloud Run
1. Go to **Google Cloud Run** Console.
2. Click **Create Service**.
3. Select **"Continuously deploy new revisions from a source repository"**.
4. Click **"SET UP WITH CLOUD BUILD"** and connect your GitHub repo.
5. Select **Dockerfile** as the build type.

### Step 3: Configure The "Brain" & "Memory" (Critical!)
Expand the **"Container, Volumes, Networking, Security"** dropdown at the bottom.

1. **Model Brain (Ollama):**
   - Upewnij się, że Ollama działa lokalnie i ma pobrane modele.

2. **Persistent Storage (Memory):**
   - Go to the **Volumes** tab.
   - Click **Add Volume** -> Select **Cloud Storage bucket**.
     - Name: `gai-storage`
     - Bucket: Select the bucket you created in Step 1.
   - Click **Mount Volume**.
     - Volume: `gai-storage`
     - Mount path: `/app/data`  **(Must be exactly this path!)**

3. **Access:**
   - Under Authentication, select **"Allow unauthenticated invocations"** (Access is protected by the OS Login screen).

4. Click **Create**.

## Deployment (Alternative: Command Line)

If you prefer doing everything from the terminal:

```bash
gcloud run deploy gai-os \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --execution-environment gen2 \
  --set-env-vars API_KEY=YOUR_GEMINI_API_KEY \
  --add-volume name=gai-storage,type=cloud-storage,bucket=gai-memory-root \
  --add-volume-mount volume=gai-storage,mount-path=/app/data
```

## Persistence Note

Cloud Run containers are stateless. We use **Cloud Storage FUSE** to mount a bucket as a file system.
- All data written to `/app/data` is actually saved to your GCS Bucket.
- If you restart the service, data in `/app/data` persists.
- Data outside this folder (e.g., `/tmp`) vanishes on restart.

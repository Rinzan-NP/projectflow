# 100% Cloud Hosting Guide (No Local Machine Running)

## Important Note on Cloudflare Edge vs Docker
**Cloudflare Pages and Workers do not run Docker containers or persistent local disks.** They run in stateless V8 edge isolates, meaning a Docker container with local SQLite (`/app/data/dev.db`) and local file storage cannot run *directly inside* Cloudflare's edge without a cloud container runtime.

To have this **100% cloud-hosted with zero local dependency**, you host the Docker container on a cloud container platform (like **Fly.io**, **Railway**, or a **$4 Cloud VPS**) and connect your **Cloudflare custom domain** with Cloudflare's free SSL, CDN, and DDoS protection.

---

## Path 1: Fly.io (Easiest 1-Command Cloud Deployment)
Fly.io runs Docker containers directly in the cloud and supports persistent disk volumes for SQLite and file uploads.

### Steps:
1. Install Fly CLI:
   - macOS: `brew install flyctl`
   - Linux/Windows: `curl -L https://fly.io/install.sh | sh`
2. Log in or create an account:
   ```bash
   fly auth signup   # or: fly auth login
   ```
3. Deploy directly from this directory (a pre-configured `fly.toml` is included):
   ```bash
   fly launch --no-deploy
   fly deploy
   ```
4. Connect your Cloudflare Domain:
   - In Fly.io dashboard: **Certificates** → **Add Custom Domain** (e.g., `pm.yourdomain.com`).
   - In Cloudflare DNS: Add the `CNAME` or `A`/`AAAA` records provided by Fly.io.
   - Turn on **Proxy** (Orange Cloud) in Cloudflare.

**Result**: 100% hosted in the cloud, $0/month (within free allowances), zero local machine running.

---

## Path 2: $4/mo Cloud VPS (Hetzner, DigitalOcean, Linode) + Cloudflare
The standard production setup for personal Docker apps:

### Steps:
1. Launch any tiny Ubuntu cloud VPS ($4–$5/mo on DigitalOcean, Hetzner, or AWS Lightsail).
2. Install Docker on the VPS:
   ```bash
   curl -fsSL https://get.docker.com | sh
   ```
3. Copy your project or clone your Git repo to the VPS:
   ```bash
   git clone <your-repo> /opt/projectflow
   cd /opt/projectflow
   docker compose up -d
   ```
4. In Cloudflare DNS:
   - Add an `A` record pointing `pm.yourdomain.com` to your VPS public IP.
   - Set **Proxy status** to **Proxied** (Orange cloud).
   - In Cloudflare SSL/TLS settings: Set encryption mode to **Full**.

**Result**: Always online, completely independent of your local computer, protected by Cloudflare.

---

## Path 3: Railway / Render (Git-based Cloud Deployment)
1. Push this project to GitHub.
2. Log in to [Railway.app](https://railway.app).
3. Click **New Project** → **Deploy from GitHub repo**.
4. Railway will automatically detect the `Dockerfile` and build it.
5. In Railway settings, add a **Persistent Volume** mounted to `/app/data`.
6. Add your Cloudflare custom domain under **Custom Domains**.

---

## Path 4: Push Docker Image to Docker Hub for Any Cloud Host
If you want to pull your pre-built image on any cloud server:

```bash
# 1. Log in to Docker Hub
docker login

# 2. Tag your local image
docker tag projectflow:latest <your-docker-username>/projectflow:latest

# 3. Push to cloud registry
docker push <your-docker-username>/projectflow:latest
```

On your cloud host, run:
```bash
docker run -d \
  --name projectflow \
  -p 3000:3000 \
  -v projectflow_data:/app/data \
  -v projectflow_uploads:/app/public/uploads \
  --restart unless-stopped \
  <your-docker-username>/projectflow:latest
```

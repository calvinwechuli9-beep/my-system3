# LandTrust Kenya LRMS

## Deploy to Vercel with Supabase

The app uses Vercel for hosting, Supabase Postgres for persistent records and
sessions, and a private Supabase Storage bucket for scanned deeds. It requires
Node.js 22 or newer. Uploaded files are limited to 4 MB because they pass
through a Vercel function.

### 1. Create the Supabase project

1. Create a project at [supabase.com](https://supabase.com/) and save its
   database password somewhere secure.
2. In the Supabase SQL Editor, open `database/schema.sql`, paste its contents,
   and run it. This creates the tables; it does not create demo accounts or
   sample land records.
3. In **Storage**, create a bucket named `title-deeds` and leave it **private**.
4. In **Project Settings → API**, copy the project URL and the `service_role`
   key. Treat the service role key like a password; never put it in frontend
   code or commit it to GitHub.
5. Copy the database connection string from **Connect**. Use a server-side
   PostgreSQL connection (the session pooler is appropriate if direct
   connections are unavailable).

### 2. Create the first administrator

Create a local `.env` file based on `.env.example`, and fill in the Supabase
Postgres URL, project URL, and service role key. Do not commit `.env`.

In PowerShell, set the initial administrator details temporarily and run:

```powershell
$env:ADMIN_STAFF_ID = "ADM-001"
$env:ADMIN_FULL_NAME = "System Administrator"
$env:ADMIN_PASSWORD = "replace-with-a-unique-password-of-12-or-more-characters"
npm.cmd run create-admin
Remove-Item Env:ADMIN_STAFF_ID, Env:ADMIN_FULL_NAME, Env:ADMIN_PASSWORD
```

The script creates only the administrator account you specify. Keep its
credentials safe and use the app to create staff accounts after deployment.

### 3. Push the project to GitHub

Create an empty GitHub repository, then run these commands from the project
directory. Replace the URL with your repository URL:

```powershell
git init
git add .
git commit -m "Prepare LandTrust LRMS for deployment"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
git push -u origin main
```

If Git says `remote origin already exists`, use
`git remote set-url origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git`
instead of adding the remote again. The `.gitignore` excludes `.env`,
`node_modules`, the local SQLite database, and the outdated combined SQLite
source dump.

### 4. Deploy on Vercel

1. Sign in at [vercel.com](https://vercel.com/) and choose **Add New → Project**.
2. Import the GitHub repository and keep the detected Node.js settings.
3. Add these environment variables in the Vercel project settings, for
   **Production** (and Preview too if you want preview deployments to access
   the same database):
   - `DATABASE_URL` — the Supabase Postgres connection string.
   - `DATABASE_SSL` — `true`.
   - `SUPABASE_URL` — the Supabase project URL.
   - `SUPABASE_SERVICE_ROLE_KEY` — the secret service role key.
   - `SUPABASE_STORAGE_BUCKET` — `title-deeds`.
4. Deploy. After it completes, open the Vercel `.vercel.app` domain shown on
   the project page. That is the public live URL.

After changing environment variables, redeploy the project.

## Local development

Install dependencies and start the app with:

```powershell
npm.cmd install
npm.cmd start
```

The app requires the environment variables in `.env` and the hosted database
schema to have been created first. Open `http://localhost:3000`.

## Data and security notes

- Existing data in `landtrust.db` is not automatically copied to Supabase.
  The hosted database starts empty apart from the administrator account you
  create. Back up and migrate any records you need before switching users to
  the deployed system.
- Use real, unique credentials; do not use the old demo credentials.
- Keep the deed bucket private and the Supabase service role key server-side.
- Configure Supabase backups and access controls appropriate for sensitive land
  records before using this system with real data.

# GitHub Setup — Windows Instructions

## Step 1 — Install Git for Windows

Download: https://git-scm.com/download/win
Install with all default options.
This gives you Git Bash — use it for all commands below.

---

## Step 2 — Create GitHub Account

Go to: https://github.com
Sign up with username: david-msekena

---

## Step 3 — Create the Repository

1. Click New Repository
2. Name: ctf-writeups
3. Visibility: Public
4. Tick: Add a README
5. Click Create Repository

---

## Step 4 — Create a Personal Access Token

GitHub no longer accepts passwords for git push. Create a token:

1. GitHub → top right avatar → Settings
2. Left sidebar → Developer Settings
3. Personal Access Tokens → Tokens (classic)
4. Generate New Token (classic)
5. Note: ctf-writeups
6. Expiration: 90 days
7. Tick: repo (full control)
8. Click Generate Token
9. COPY THE TOKEN NOW — you cannot see it again

---

## Step 5 — Push the Write-Ups

Extract the zip file to your Desktop.
Open Git Bash, then run:

```bash
cd Desktop/ctf-writeups-v2

git init
git add .
git commit -m "Initial CTF write-ups — CTFzone, HTB, THM, Personal Projects"
git remote add origin https://github.com/david-msekena/ctf-writeups.git
git branch -M main
git push -u origin main
```

When asked for password — paste your Personal Access Token.

---

## Step 6 — Create the Blog Repository

1. Create new repo named EXACTLY: david-msekena.github.io
2. Set to Public

---

## Your Final URLs

| Resource | URL |
|---|---|
| Write-ups | https://github.com/david-msekena/ctf-writeups |
| Blog | https://david-msekena.github.io |

---

## Adding Future Write-Ups

Every time you complete a new challenge:

```bash
# Create the file in the right folder
# e.g. a new HTB web challenge:
# hackthebox/web/machine_name.md

cd Desktop/ctf-writeups-v2
git add .
git commit -m "Add HTB machine_name write-up"
git push
```

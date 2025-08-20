# 🔍 Network Forensic Analyzer Backend (Express.js + TypeScript)

This is the official backend for the Network Forensic Analyzer Project, built with Express.js and TypeScript. It provides a secure and scalable authentication system using JWT and integrates with a database using Prisma ORM.

- Once you clone it, just install the dependencies with `npm install`

## 🚀 Features

- 🔐 Login via username or email
- 🛡️ Secure access and refresh tokens
- 🧠 Role-based access (student, admin, instructor)
- 🔄 Token refresh system with middleware validation
- 💾 Prisma ORM for database interactions
- 🧂 Argon2 password hashing
- 🧪 Postman-friendly endpoint structure

---

## 🧱 Tech Stack

- **Node.js + Express.js**
- **TypeScript**
- **JWT (jsonwebtoken)**
- **Argon2** (password security)
- **Prisma + PostgreSQL**
- **Dotenv** for environment configs
- **Wireshark / TShark** (for PCAP parsing)

## To Use Wireshark

- Install Wireshark from here: [Wireshark Download](https://www.wireshark.org/download.html)
- Download the Windows x64 Installer if you're using Windows.
- Once downloaded, go to PowerShell and find the location of `tshark.exe`. Then paste this command in PowerShell:

```powershell
& "C:\Program Files\Wireshark\tshark.exe" -v

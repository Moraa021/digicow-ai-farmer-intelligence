
# 🐄 DigiCow AI - Farmer Intelligence System

> AI-powered decision support for youth extension agents in Kenya.

[![Python](https://img.shields.io/badge/Python-3.10+-blue?style=flat&logo=python)](https://www.python.org/)
[![Neo4j](https://img.shields.io/badge/Neo4j-5.x-green?style=flat&logo=neo4j)](https://neo4j.com/)
[![Flask](https://img.shields.io/badge/Flask-2.3-black?style=flat&logo=flask)](https://flask.palletsprojects.com/)

---

## 📌 Overview

**DigiCow AI** helps youth extension agents deliver personalized, data-driven advisory services to smallholder farmers.

This repository contains the **backend API** built with Flask, Neo4j, and Featherless AI. The frontend is hosted on Lovable and connects to this API.

**Key Features:**
- 📊 Farmer management with priority scoring
- 🗄️ Neo4j knowledge graph (farmers, cows, diseases, soil)
- 🤖 AI-generated recommendations (Featherless AI)
- 📋 Export data as CSV/PDF

---

## 🚀 Quick Start

### 1. Clone & Setup
```bash
git clone https://github.com/Moraa021/digicow-ai-farmer-intelligence.git
cd digicow-ai-farmer-intelligence
python -m venv venv
venv\Scripts\activate  # Windows
source venv/bin/activate  # Mac/Linux
pip install -r requirements.txt
```

### 2. Configure `.env`
```env
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your-password
FEATHERLESS_API_KEY=your-api-key
```

### 3. Initialize Database
```bash
python init_db.py
```

### 4. Start API
```bash
python api.py
```

API runs at: `http://localhost:5000`

---

## 🔗 API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/farmers` | GET | List all farmers |
| `/farmers/{name}` | GET | Get farmer details |
| `/recommend` | POST | Get AI recommendation |
| `/farmers/add` | POST | Add new farmer |
| `/farmers/delete/{name}` | DELETE | Delete farmer |

---

## 📊 Data Model

```
(Farm) -[:OWNS]-> (Cow)
(Farm) -[:AFFECTED_BY]-> (Disease)
(Farm) -[:HAS_SOIL]-> (Soil)
(Disease) -[:TREATS]-> (Advisory)
```

---

## 👥 Team Z01Techies

| Name | Role |
|---|---|
| Mercy Naliaka Moraa | Team Lead |
| Micheal Clay Ochieng | Backend |
| Grace Nyaboke | Frontend |
| Taheera Mohamed | AI Integration |
| Millicent Odhiambo | Data |

---

## 🏆 Kenya AI Challenge 2026

**Track:** Mercy Corps AgriFin  
**Problem:** Extension agents lack tools for personalized farmer support  
**Solution:** AI-powered intelligence system with Neo4j + Featherless AI

---

## 📚 Resources

- [Neo4j](https://neo4j.com)
- [Featherless AI](https://featherless.ai)
- [KALRO Dairy Manual](https://kalrotimps.com)
- [ILRI Dairy Manual](https://ilri.org)

---

## 📄 License

For demonstration purposes - Kenya AI Challenge 2026

---


**Built with ❤️ by Z01Techies**

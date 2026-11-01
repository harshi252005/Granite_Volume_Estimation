"""
chatbot.py
----------
AI Command Center — NLP interface to the Smart Granite database.

This is a REAL chatbot with database access, not a generic Gemini wrapper.

Architecture:
  1. Parse the user's message to detect query intent
  2. Execute SQL queries to fetch relevant live data from the DB
  3. Build a context-rich system prompt with that real data
  4. Call Gemini to format and answer in natural language
  5. Return the grounded, data-backed response

The chatbot can answer questions about:
  - Block counts and statuses
  - Flagged blocks and weighbridge variances
  - Revenue and seigniorage by district / quarry
  - Recent dispatches and transit status
  - OMEPS sync status
  - Top quarries and districts by output
"""
import os
import json
import logging
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from dotenv import load_dotenv

# pyrefly: ignore [missing-import]
from ..database import get_db
# pyrefly: ignore [missing-import]
from ..models import (
    GraniteBlock, Quarry, Measurement, Seigniorage,
    Weighbridge, Dispatch, AuditLog, OmepsSyncLog, User
)
# pyrefly: ignore [missing-import]
from ..auth import get_current_user
# pyrefly: ignore [missing-import]
from ..config_manager import load_settings

env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '.env')
load_dotenv(env_path)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/chatbot", tags=["Chatbot"])


class ChatMessage(BaseModel):
    message: str
    lang: str = "en"


# ── DB snapshot helpers ────────────────────────────────────────────────────────

def _get_block_status_summary(db: Session) -> dict:
    """Count blocks by status."""
    rows = db.query(GraniteBlock.status, func.count(GraniteBlock.id)).group_by(GraniteBlock.status).all()
    return {status: count for status, count in rows}


def _get_flagged_blocks(db: Session, limit: int = 10) -> list:
    """Get most recently flagged blocks with details."""
    blocks = (
        db.query(GraniteBlock)
        .filter(GraniteBlock.status == "weighbridge_flagged")
        .order_by(desc(GraniteBlock.last_updated))
        .limit(limit)
        .all()
    )
    result = []
    for b in blocks:
        wb = b.weighbridge
        m  = b.measurement
        result.append({
            "block_id":         b.id,
            "quarry":           b.quarry.name if b.quarry else "Unknown",
            "district":         b.quarry.district if b.quarry else "Unknown",
            "ai_weight_mt":     round(m.estimated_weight, 2) if m else None,
            "actual_weight_mt": round(wb.actual_weight, 2) if wb else None,
            "variance_pct":     round(wb.difference_percentage, 2) if wb else None,
            "flagged_at":       b.last_updated.isoformat() if b.last_updated else None,
        })
    return result


def _get_revenue_summary(db: Session) -> dict:
    """Total revenue, top districts, top quarries."""
    total_revenue = db.query(func.sum(Seigniorage.total_fee)).scalar() or 0.0
    total_mt      = db.query(func.sum(Measurement.estimated_weight)).scalar() or 0.0

    top_districts = db.query(
        Quarry.district,
        func.sum(Seigniorage.total_fee).label("revenue"),
        func.count(GraniteBlock.id).label("blocks")
    ).join(GraniteBlock, Quarry.id == GraniteBlock.quarry_id)\
     .join(Seigniorage, GraniteBlock.id == Seigniorage.block_id)\
     .group_by(Quarry.district)\
     .order_by(desc("revenue")).limit(5).all()

    top_quarries = db.query(
        Quarry.name,
        func.sum(Seigniorage.total_fee).label("revenue"),
        func.count(GraniteBlock.id).label("blocks")
    ).join(GraniteBlock, Quarry.id == GraniteBlock.quarry_id)\
     .join(Seigniorage, GraniteBlock.id == Seigniorage.block_id)\
     .group_by(Quarry.name)\
     .order_by(desc("revenue")).limit(5).all()

    return {
        "total_revenue_inr":  round(total_revenue, 2),
        "total_mt_extracted": round(total_mt, 2),
        "top_districts": [
            {"district": r[0], "revenue_inr": round(r[1] or 0, 2), "blocks": r[2]}
            for r in top_districts
        ],
        "top_quarries": [
            {"quarry": r[0], "revenue_inr": round(r[1] or 0, 2), "blocks": r[2]}
            for r in top_quarries
        ],
    }


def _get_recent_dispatches(db: Session, limit: int = 5) -> list:
    """Get most recent dispatches."""
    rows = (
        db.query(Dispatch, GraniteBlock)
        .join(GraniteBlock, Dispatch.block_id == GraniteBlock.id)
        .order_by(desc(Dispatch.dispatch_time))
        .limit(limit)
        .all()
    )
    result = []
    for d, b in rows:
        result.append({
            "block_id":       b.id,
            "vehicle":        d.vehicle_number,
            "driver":         d.driver_name,
            "destination":    d.destination,
            "permit":         d.e_permit_number,
            "transit_form":   d.transit_form_no,
            "dispatch_time":  d.dispatch_time.isoformat() if d.dispatch_time else None,
            "quarry":         b.quarry.name if b.quarry else "Unknown",
        })
    return result


def _get_omeps_status(db: Session) -> dict:
    """OMEPS sync statistics."""
    total_synced  = db.query(func.count(OmepsSyncLog.id)).scalar() or 0
    passed        = db.query(func.count(OmepsSyncLog.id)).filter(OmepsSyncLog.validation_status == "PASS").scalar() or 0
    warned        = db.query(func.count(OmepsSyncLog.id)).filter(OmepsSyncLog.validation_status == "WARNING").scalar() or 0
    failed        = db.query(func.count(OmepsSyncLog.id)).filter(OmepsSyncLog.validation_status == "FAILED").scalar() or 0
    return {
        "total_synced": total_synced,
        "passed":       passed,
        "warned":       warned,
        "failed":       failed,
    }


def _get_pending_approvals(db: Session) -> list:
    """Blocks waiting for DMGO review."""
    blocks = (
        db.query(GraniteBlock)
        .filter(GraniteBlock.status.in_(["ai_measured", "check_requested"]))
        .order_by(GraniteBlock.creation_time)
        .limit(10)
        .all()
    )
    return [
        {
            "block_id": b.id,
            "quarry":   b.quarry.name if b.quarry else "Unknown",
            "district": b.quarry.district if b.quarry else "Unknown",
            "status":   b.status,
            "created":  b.creation_time.isoformat() if b.creation_time else None,
        }
        for b in blocks
    ]


def _build_db_context(db: Session, message: str) -> str:
    """
    Build a real-data context string to inject into the Gemini prompt.
    Fetches relevant data based on keywords in the user's message.
    """
    msg_lower = message.lower()
    context_parts = []

    # Always include block status summary
    status_summary = _get_block_status_summary(db)
    context_parts.append(
        f"BLOCK STATUS SUMMARY (live from DB):\n{json.dumps(status_summary, indent=2)}"
    )

    # Flagged blocks query
    if any(kw in msg_lower for kw in ["flag", "fraud", "discrepan", "variance", "suspect", "ఫ్లాగ్", "వ్యత్యాస", "తేడా", "మోసం"]):
        flagged = _get_flagged_blocks(db, limit=10)
        context_parts.append(
            f"FLAGGED BLOCKS (weighbridge variance > threshold):\n{json.dumps(flagged, indent=2)}"
        )

    # Revenue / seigniorage query
    if any(kw in msg_lower for kw in ["revenue", "seigniorage", "fee", "money", "income", "tax", "top", "district", "quarry", "best", "ఆదాయం", "సీనియరేజ్", "రుసుము", "జిల్లా", "క్వారీ", "డబ్బు", "మొత్తం"]):
        revenue = _get_revenue_summary(db)
        context_parts.append(
            f"REVENUE & SEIGNIORAGE DATA:\n{json.dumps(revenue, indent=2)}"
        )

    # Dispatch / transit query
    if any(kw in msg_lower for kw in ["dispatch", "transit", "vehicle", "driver", "permit", "truck", "transport", "రవాణా", "డిస్పాచ్", "వాహన", "పర్మిట్"]):
        dispatches = _get_recent_dispatches(db, limit=5)
        context_parts.append(
            f"RECENT DISPATCHES:\n{json.dumps(dispatches, indent=2)}"
        )

    # OMEPS query
    if any(kw in msg_lower for kw in ["omeps", "sync", "integration", "portal", "e-permit", "సింక్", "పోర్టల్"]):
        omeps = _get_omeps_status(db)
        context_parts.append(
            f"OMEPS SYNC STATUS:\n{json.dumps(omeps, indent=2)}"
        )

    # Pending approvals
    if any(kw in msg_lower for kw in ["pending", "approval", "review", "waiting", "queue", "dmgo", "పెండింగ్", "ఆమోదం", "సమీక్ష"]):
        pending = _get_pending_approvals(db)
        context_parts.append(
            f"BLOCKS PENDING DMGO APPROVAL:\n{json.dumps(pending, indent=2)}"
        )

    # If nothing specific matched, fetch everything for a general answer
    if len(context_parts) == 1:
        flagged = _get_flagged_blocks(db, limit=5)
        revenue = _get_revenue_summary(db)
        dispatches = _get_recent_dispatches(db, limit=3)
        context_parts.append(f"FLAGGED BLOCKS:\n{json.dumps(flagged, indent=2)}")
        context_parts.append(f"REVENUE SUMMARY:\n{json.dumps(revenue, indent=2)}")
        context_parts.append(f"RECENT DISPATCHES:\n{json.dumps(dispatches, indent=2)}")

    return "\n\n".join(context_parts)


# ── Endpoint ───────────────────────────────────────────────────────────────────

FALLBACK_MODELS = [
    "gemini-3.8-flash",
    "gemini-3.5-flash",
    "gemini-flash-latest",
    "gemini-3.5-flash-lite",
]


def _generate_grounded_fallback(db: Session, message: str, has_telugu: bool) -> str:
    """
    Deterministic, data-backed natural language response generator.
    Guarantees the user always receives an accurate answer directly from the AP Mines
    live database even if external AI APIs encounter temporary 429 quota or 503 downtime.
    """
    msg_lower = message.lower()

    # 1. Revenue & Seigniorage summary
    if any(kw in msg_lower for kw in ["revenue", "seigniorage", "fee", "money", "income", "tax", "top", "ఆదాయం", "సీనియరేజ్", "రుసుము"]):
        rev = _get_revenue_summary(db)
        if has_telugu:
            out = [
                "### 💰 మైనింగ్ రెవెన్యూ & సీనియరేజ్ నివేదిక (లైవ్ డేటా)",
                f"- **మొత్తం సీనియరేజ్ వసూలు**: ₹{rev['total_revenue_inr']:,.2f}",
                f"- **మొత్తం రాయి పరిమాణం**: {rev['total_mt_extracted']:,.2f} మెట్రిక్ టన్నులు",
                "",
                "#### అగ్రశ్రేణి జిల్లాలు (రెవెన్యూ ప్రకారం):"
            ]
            for i, d in enumerate(rev['top_districts'], 1):
                out.append(f"{i}. **{d['district']}**: ₹{d['revenue_inr']:,.2f} ({d['blocks']} బ్లాకులు)")
            out.append("\n#### అగ్రశ్రేణి క్వారీలు:")
            for i, q in enumerate(rev['top_quarries'], 1):
                out.append(f"{i}. **{q['quarry']}**: ₹{q['revenue_inr']:,.2f} ({q['blocks']} బ్లాకులు)")
            return "\n".join(out)
        else:
            out = [
                "### 💰 Seigniorage & Revenue Summary (Live Database)",
                f"- **Total Seigniorage Collected**: ₹{rev['total_revenue_inr']:,.2f}",
                f"- **Total Mineral Extracted**: {rev['total_mt_extracted']:,.2f} Metric Tonnes",
                "",
                "#### Top Districts by Revenue:"
            ]
            for i, d in enumerate(rev['top_districts'], 1):
                out.append(f"{i}. **{d['district']}**: ₹{d['revenue_inr']:,.2f} ({d['blocks']} blocks)")
            out.append("\n#### Top Producing Quarries:")
            for i, q in enumerate(rev['top_quarries'], 1):
                out.append(f"{i}. **{q['quarry']}**: ₹{q['revenue_inr']:,.2f} ({q['blocks']} blocks)")
            return "\n".join(out)

    # 2. Top quarries query
    if any(kw in msg_lower for kw in ["quarries", "quarry", "క్వారీ", "క్వారీలు"]):
        rev = _get_revenue_summary(db)
        if has_telugu:
            out = ["### 🏛️ అత్యధిక బ్లాకులు సమర్పించిన అగ్రశ్రేణి క్వారీలు:"]
            for i, q in enumerate(rev['top_quarries'], 1):
                out.append(f"{i}. **{q['quarry']}**: {q['blocks']} బ్లాకులు (మొత్తం సీనియరేజ్: ₹{q['revenue_inr']:,.2f})")
            return "\n".join(out)
        else:
            out = ["### 🏛️ Top Quarries by Production & Block Submissions:"]
            for i, q in enumerate(rev['top_quarries'], 1):
                out.append(f"{i}. **{q['quarry']}**: {q['blocks']} blocks (Total Seigniorage: ₹{q['revenue_inr']:,.2f})")
            return "\n".join(out)

    # 3. Flagged blocks & variances
    if any(kw in msg_lower for kw in ["flag", "fraud", "discrepan", "variance", "suspect", "తేడా", "ఫ్లాగ్"]):
        flagged = _get_flagged_blocks(db, limit=5)
        if not flagged:
            return "✅ ప్రస్తుతం ఎలాంటి ఫ్లాగ్ చేయబడిన బ్లాకులు లేవు. అన్ని తనిఖీలు నిబంధనల ప్రకారం ఉన్నాయి." if has_telugu else "✅ Currently there are no weighbridge-flagged blocks in the system. All transit operations are compliant."
        if has_telugu:
            out = ["### ⚠️ వేబ్రిడ్జి వద్ద ఫ్లాగ్ చేయబడిన బ్లాకులు:"]
            for f in flagged:
                out.append(f"- **{f['block_id']}** ({f['quarry']}, {f['district']}): AI అంచనా {f['ai_weight_mt']} MT vs వాస్తవ బరువు {f['actual_weight_mt']} MT (వ్యత్యాసం: {f['variance_pct']}%)")
            return "\n".join(out)
        else:
            out = ["### ⚠️ Weighbridge-Flagged Blocks (> ±5% Tolerance):"]
            for f in flagged:
                out.append(f"- **{f['block_id']}** ({f['quarry']}, {f['district']}): AI Est: {f['ai_weight_mt']} MT vs Actual: {f['actual_weight_mt']} MT (Variance: {f['variance_pct']}%)")
            return "\n".join(out)

    # 4. Dispatches & Transit
    if any(kw in msg_lower for kw in ["dispatch", "transit", "vehicle", "driver", "permit", "రవాణా", "డిస్పాచ్"]):
        dispatches = _get_recent_dispatches(db, limit=5)
        if not dispatches:
            return "ప్రస్తుతం ఎలాంటి డిస్పాచ్ రికార్డులు లేవు." if has_telugu else "No recent dispatch records found."
        if has_telugu:
            out = ["### 🚛 ఇటీవలి గ్రానైట్ రవాణా మరియు ఇ-పర్మిట్ వివరాలు:"]
            for d in dispatches:
                out.append(f"- **{d['block_id']}**: వాహనం `{d['vehicle']}` | గమ్యం: {d['destination']} | ఇ-పర్మిట్: `{d['permit'] or 'N/A'}`")
            return "\n".join(out)
        else:
            out = ["### 🚛 Recent Granite Dispatches & e-Transit Passes:"]
            for d in dispatches:
                out.append(f"- **{d['block_id']}**: Vehicle `{d['vehicle']}` | Driver: {d['driver']} | Destination: {d['destination']} | e-Permit: `{d['permit'] or 'N/A'}`")
            return "\n".join(out)

    # 5. Default block status overview
    summary = _get_block_status_summary(db)
    if has_telugu:
        out = ["### 📊 స్మార్ట్ గ్రానైట్ డేటాబేస్ సమగ్ర స్థితి (లైవ్ డేటా):"]
        for st, count in summary.items():
            out.append(f"- **{st.replace('_', ' ').title()}**: {count} బ్లాకులు")
        return "\n".join(out)
    else:
        out = ["### 📊 Smart Granite Database Overview (Live Data):"]
        for st, count in summary.items():
            out.append(f"- **{st.replace('_', ' ').title()}**: {count} blocks")
        return "\n".join(out)


# ── Endpoint ───────────────────────────────────────────────────────────────────

@router.post("/")
def chat_with_bot(
    chat: ChatMessage,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    AI Command Center — natural language queries answered with real DB data.
    Supports both English and Telugu with resilient model fallback.
    """
    api_key = os.getenv("API_KEY")

    # 1. Fetch relevant live data from the database
    try:
        db_context = _build_db_context(db, chat.message)
    except Exception as db_err:
        logger.error("Failed to build DB context: %s", db_err)
        db_context = "Database context unavailable."

    # Determine language requirement
    has_telugu = (chat.lang == "te") or any('\u0c00' <= char <= '\u0c7f' for char in chat.message)
    if has_telugu:
        lang_instruction = (
            "CRITICAL LANGUAGE INSTRUCTION: The user has selected Telugu (తెలుగు) or asked in Telugu. "
            "You MUST generate your ENTIRE response in formal, fluent Telugu script (తెలుగు లిపి). "
            "Translate all headings, bullet points, numbers labels, metric descriptions, and district names into Telugu. "
            "Do NOT answer in English. Everything must be in Telugu."
        )
    else:
        lang_instruction = (
            "CRITICAL LANGUAGE INSTRUCTION: The user has selected English. "
            "Answer in clear, concise English. Format tables or lists where helpful."
        )

    # 2. Build grounded system prompt
    system_prompt = (
        "You are the AI Command Center for the Smart Granite Tracking System, "
        "an AP government tool for the Department of Mines & Geology (DMGO). "
        "You have direct access to the live database. "
        "ALWAYS base your answers on the real data provided below — never make up numbers.\n"
        "\n"
        "Your capabilities:\n"
        "- Report block counts by status (registered, ai_measured, approved, dispatched, flagged, etc.)\n"
        "- List flagged blocks and explain the variance causing the flag\n"
        "- Report revenue collected by district/quarry\n"
        "- Track dispatch and transit status\n"
        "- Report OMEPS sync status\n"
        "- List blocks pending DMGO approval\n"
        "\n"
        f"=== LIVE DATABASE SNAPSHOT (as of {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}) ===\n"
        f"{db_context}\n"
        "=== END OF DATABASE SNAPSHOT ===\n"
        "\n"
        "User role: " + current_user.role + "\n"
        "User district: " + (current_user.district or "All districts") + "\n"
        "\n"
        f"{lang_instruction}\n"
        "Always cite the actual numbers from the data above. "
        "If the data doesn't have what the user needs, say so honestly.\n"
        f"\nUser question: {chat.message}"
    )

    # 3. Call Gemini with multi-model fallback chain
    if api_key:
        try:
            from google import genai
            client = genai.Client(api_key=api_key)

            for model_name in FALLBACK_MODELS:
                try:
                    logger.info("Attempting AI generation with model: %s", model_name)
                    response = client.models.generate_content(
                        model=model_name,
                        contents=[system_prompt]
                    )
                    if response and response.text:
                        return {"reply": response.text}
                except Exception as model_err:
                    logger.warning("Model %s failed: %s. Trying next fallback...", model_name, model_err)
                    continue

        except Exception as client_err:
            logger.error("GenAI client initialization error: %s", client_err)

    # 4. If all external API calls are unavailable/exhausted, deliver grounded DB response
    logger.info("External AI models unavailable; serving grounded response directly from DB.")
    fallback_reply = _generate_grounded_fallback(db, chat.message, has_telugu)
    return {"reply": fallback_reply}

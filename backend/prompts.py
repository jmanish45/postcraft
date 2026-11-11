import json


SYSTEM_PROMPT = """You are Postcraft, an elite editorial assistant for X (Twitter).
Your task is to craft high-quality, stylistically diverse draft suggestions from source campaign posts while maintaining strict factual grounding. Do not output meta-analysis or summaries—output ONLY structured JSON.

1. UNDERSTAND & GROUND:
- Extract the central message, factual claims, scripture references (Vedas, Gita, Upanishads, etc.), names, and authorial intent.
- FACTUAL FIDELITY: Never invent facts, interpretations, events, or quotations. Preserve original citations and names accurately. Treat opinions as perspectives, not established facts.
- Mark verification_status as "verified" if fully grounded in the source, or "needs_review" if ambiguous.

2. EDITORIAL DIVERSITY (CRITICAL - NO MERE PARAPHRASING):
Do NOT merely swap synonyms or replicate the same sentence template across drafts. Each draft must explore a genuinely distinct editorial angle and opening hook, selecting from:
- Reflective / Contemplative: Focuses on inner wisdom, spiritual depth, or personal realization.
- Principle / Value-Driven: Focuses on the core ethical principle, dharma, truth, or universal law.
- Question-Led / Inquiry: Hooks the reader with a thought-provoking question leading into the teaching.
- Direct & Authoritative: Clear, confident statement of the citation and its timeless teaching.
- Conversational & Relatable: Bridges the ancient wisdom to contemporary daily life and challenges.
- Devotional / Appreciation: Emphasizes reverence, dedication, or appreciation expressed in the source.
Vary opening words, grammatical structures, and vocabulary so every draft has a distinct voice.

3. ADAPT TO SOURCE VOLUME (ALWAYS MAINTAINING 250-279 CHARACTERS):
- CRITICAL: Every single draft, whether generated from 1 sample or 10 samples, MUST be between 250 and 279 characters. Drafts under 250 characters (e.g. 130-240 chars) are STRICTLY REJECTED.
- MULTI-POINT / MULTI-INCIDENT SAMPLES: If source content contains multiple distinct incidents, case studies, aid stories, or bullet points (e.g. separated by ♦️, •, numbers, or line breaks):
  * Do NOT blend them into a generic high-level overview.
  * Base each generated draft on a DIFFERENT specific incident or story from the list.
  * Preserve the exact names, locations, medical conditions, and financial amounts for that specific incident accurately without mixing them across drafts.
- SINGLE UNIFIED TOPIC: Produce diverse editorial angles (e.g. one question-led, one principle-driven, one reflective, one direct) on the same core message without inventing new facts. Elaborate context, spiritual depth, and reflection to reach 250-279 chars.
- MULTIPLE DISTINCT SAMPLES: Cluster distinct topics. For each draft, do NOT write a brief 1-sentence summary. Thoroughly elaborate the citation, its philosophical depth, and a meaningful takeaway so each draft fills 250 to 279 characters.

4. MANDATORY CHARACTER LENGTH (250 TO 279 CHARS):
- LENGTH REQUIREMENT: Every single draft MUST contain between 250 and 279 characters in total (including spaces and required hashtags). Aim for ~260-268 characters.
- BODY TEXT DISCIPLINE: Write around 36 to 42 words (approx. 235-248 characters) of body text so that when the required campaign hashtags are appended at the end, the total character count naturally lands between 255 and 275 characters without exceeding 279 characters.
- MINIMUM 250: Drafts under 250 characters are strictly forbidden.
- MAXIMUM 279: Every sentence must conclude cleanly before the 279 hard limit.
- Always append required campaign hashtags at the very end.

5. INTERNAL DIVERSITY AUDIT:
Before finalizing output, check across all drafts:
- Do any two drafts share the same opening pattern or grammatical template? If so, re-angle one.
- Are different vocabulary and sentence structures used?
Ensure high editorial distinction and pristine factual fidelity.

OUTPUT JSON FORMAT:
{"generated_posts": [{"content": "...", "based_on": ["Sample 1"], "verification_status": "verified"}]}
"""


def build_user_prompt(request):
    hashtags = request.hashtags or (request.campaign.hashtags if request.campaign else [])

    samples_data = [
        {
            "sample_id": f"Sample {sample.id}",
            "content": sample.content.strip()
        }
        for sample in request.samples
    ]

    is_single_sample = len(samples_data) == 1

    user_payload = {
        "required_hashtags": hashtags,
        "source_samples": samples_data,
        "requested_draft_count": request.output_count,
        "output_language": request.language,
        "generation_mode": "single_source_stylistic_diversity" if is_single_sample else "multi_source_thematic_synthesis"
    }

    hashtags_str = " ".join(hashtags) if hashtags else "None"

    diversity_note = (
        "Single source provided: If it contains multiple distinct incidents/case studies or bullets (e.g. marked with ♦️), dedicate each draft to a DIFFERENT specific incident (preserving exact names, locations, and financial amounts). Otherwise, craft distinct editorial angles on the core truth. Do NOT use identical sentence templates or synonym swaps."
        if is_single_sample else
        "Multiple sources provided: Cluster distinct topics and dedicate drafts to different specific incidents/teachings. Elaborate on the context and spiritual/practical depth so every post fills 250 to 279 characters."
    )

    return f"""Analyze the source material and generate {request.output_count} genuinely distinct draft posts in {request.language}.

INPUT DATA:
{json.dumps(user_payload, ensure_ascii=False, indent=2)}

EDITORIAL INSTRUCTIONS:
- {diversity_note}
- MANDATORY LENGTH: Every single draft MUST be between 250 and 279 characters in total (including hashtags: {hashtags_str}).
- Target ~235-248 characters of body text so body + hashtags equals ~260-272 characters total.
- Never output short posts under 250 characters; never exceed 279 characters.
- Base drafts strictly on source material. Return JSON only.
"""

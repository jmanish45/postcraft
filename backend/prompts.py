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

4. POST STRUCTURE & MANDATORY LENGTH (250 TO 279 CHARS):
- STRUCTURAL ORDER:
  * Opening Tag: If provided, placed at the VERY START of the draft (e.g. #CampaignTag).
  * Main Editorial Content: Rich, fact-grounded body text in the middle.
  * Optional Closing Line: If provided (e.g. channel name or sign-off line), placed at the VERY END.
- OPTIONAL CLOSING LINE RULE:
  * The closing line is OPTIONAL. Include it at the end ONLY if the complete post (opening + body + closing) fits cleanly within 250 to 279 characters without cutting off the message.
  * If the body text needs the full character space to explain the incident/facts, OMIT the closing line entirely rather than trimming or butchering the factual sentence.
- MINIMUM 250 / MAXIMUM 279: Every single draft MUST contain between 250 and 279 characters in total (including spaces, opening tag, and optional closing line). Aim for ~260-268 characters.
- Drafts under 250 characters are strictly forbidden; never exceed 279 characters.

5. INTERNAL DIVERSITY AUDIT:
Before finalizing output, check across all drafts:
- Do any two drafts share the same opening pattern or grammatical template? If so, re-angle one.
- Are different vocabulary and sentence structures used?
Ensure high editorial distinction and pristine factual fidelity.

OUTPUT JSON FORMAT:
{"generated_posts": [{"content": "...", "based_on": ["Sample 1"], "verification_status": "verified"}]}
"""


def build_user_prompt(request):
    opening_tag = (getattr(request, "opening_tag", "") or "").strip()
    closing_tag = (getattr(request, "closing_tag", "") or "").strip()
    hashtags = request.hashtags or (request.campaign.hashtags if request.campaign else [])

    if not opening_tag and hashtags:
        opening_tag = " ".join(hashtags)

    samples_data = [
        {
            "sample_id": f"Sample {sample.id}",
            "content": sample.content.strip()
        }
        for sample in request.samples
    ]

    is_single_sample = len(samples_data) == 1

    user_payload = {
        "opening_tag": opening_tag or None,
        "closing_line_optional": closing_tag or None,
        "source_samples": samples_data,
        "requested_draft_count": request.output_count,
        "output_language": request.language,
        "generation_mode": "single_source_stylistic_diversity" if is_single_sample else "multi_source_thematic_synthesis"
    }

    structure_notes = []
    if opening_tag:
        structure_notes.append(f"Start each post with opening tag: {opening_tag}")
    if closing_tag:
        structure_notes.append(
            f'Optional closing line: "{closing_tag}". Append at the very end ONLY if total post fits inside 250-279 chars; if space is tight, omit it.'
        )
    structure_str = "\n  - ".join(structure_notes) if structure_notes else "Standard post structure."

    diversity_note = (
        "Single source provided: If it contains multiple distinct incidents/case studies or bullets (e.g. marked with ♦️), dedicate each draft to a DIFFERENT specific incident (preserving exact names, locations, and financial amounts). Otherwise, craft distinct editorial angles on the core truth. Do NOT use identical sentence templates or synonym swaps."
        if is_single_sample else
        "Multiple sources provided: Cluster distinct topics and dedicate drafts to different specific incidents/teachings. Elaborate on the context and spiritual/practical depth so every post fills 250 to 279 characters."
    )

    return f"""Analyze the source material and generate {request.output_count} genuinely distinct draft posts in {request.language}.

INPUT DATA:
{json.dumps(user_payload, ensure_ascii=False, indent=2)}

EDITORIAL & STRUCTURAL INSTRUCTIONS:
- {diversity_note}
- STRUCTURE:
  - {structure_str}
- MANDATORY LENGTH: Every single draft MUST be between 250 and 279 characters in total (including opening tag and optional closing line if included).
- Never output short posts under 250 characters; never exceed 279 characters.
- Base drafts strictly on source material. Return JSON only.
"""

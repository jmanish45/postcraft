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

3. ADAPT TO SOURCE VOLUME & ELABORATION DISCIPLINE:
- STRICT MINIMUM LENGTH: Every single draft MUST be AT LEAST 230 CHARACTERS long. Drafts under 230 characters (e.g. 140-220 chars) are STRICTLY FORBIDDEN AND REJECTED.
- WORD COUNT DISCIPLINE: You MUST write around 38 to 46 words of rich, meaningful body text.
- Do NOT write brief 1-sentence summaries. Thoroughly explain the background, moral context, humanitarian or spiritual significance, and positive impact so that every draft comfortably fills 235 to 275 characters before closing tags.
- MULTI-POINT / MULTI-INCIDENT SAMPLES: If source content contains multiple distinct incidents, case studies, aid stories, or bullet points (e.g. separated by ♦️, •, numbers, or line breaks):
  * Do NOT blend them into a generic high-level overview.
  * Base each generated draft on a DIFFERENT specific incident or story from the list.
  * Preserve the exact names, locations, medical conditions, and financial amounts for that specific incident accurately without mixing them across drafts.
- SINGLE UNIFIED TOPIC: Produce diverse editorial angles (e.g. one question-led, one principle-driven, one reflective, one direct) on the same core message without inventing new facts. Elaborate context and reflection to reach 235-275 chars.
- MULTIPLE DISTINCT SAMPLES: Cluster distinct topics. For each draft, do NOT write a brief 1-sentence summary. Thoroughly elaborate the citation, its philosophical depth, and a meaningful takeaway so each draft fills 235 to 275 characters.

4. POST STRUCTURE & MANDATORY LENGTH (STRICTLY 230 TO 279 CHARS):
- STRUCTURAL NEWLINE RULES (CRITICAL):
  * Line 1: Opening Hashtag(s) (e.g. #CampaignTag) on its own separate line.
  * Line 2 (Next Line): The main editorial body content. There MUST be an explicit newline (\n) after the opening hashtag so that the content begins on the next line, NEVER on the same line with a space.
  * Line 3 (Next Line, Optional): If closing line is provided and space permits, append it on its own new line (\n) at the very end.
- OPTIONAL CLOSING LINE RULE:
  * The closing line is OPTIONAL. Include it on a new line at the end ONLY if the complete post (opening + newline + body + newline + closing) fits cleanly within 230 to 279 characters without cutting off the message.
  * If the body text needs the full character space to explain the incident/facts, OMIT the closing line entirely rather than trimming or butchering the factual sentence.
- MINIMUM 230 / MAXIMUM 279: Every single draft MUST contain between 230 and 279 characters in total (including spaces, newlines, opening tag, and optional closing line). Aim for ~255-270 characters.
- Short posts under 230 characters are strictly forbidden; never exceed 279 characters.

5. LANGUAGE SPECIFICATION (CRITICAL - STRICT SCRIPT DISCIPLINE):
- "English": Write in fluent, natural English.
- "Hindi": Write in Hindi using Devanagari script (e.g. समाज कल्याण और जरूरतमंदों की सेवा के लिए...).
- "Hinglish": MUST be written in conversational Hindi using English/Latin alphabet letters only (e.g. "Is abhiyan ke madhyam se har vyakti tak zaroori jaankari aur madad pahuchai ja rahi hai...").
  * NEVER use Devanagari Hindi characters (no क, ख, ग) when Hinglish is selected.
  * NEVER use pure formal English sentences when Hinglish is selected.
  * The sentence grammar and vocabulary must be Hindi, phonetically written in English script (Romanized Hindi).

6. TASTEFUL, CONTEXTUAL EMOJIS:
- Include 1 to 2 relevant emojis per draft where naturally suitable to highlight key themes (e.g. 🙏 for reverence/support, 🏥 for medical relief/healthcare, 💰 or 🤝 for financial aid/solidarity, 📖 for learning/facts, 💡 for thought-provoking reflections, ✨ for inspiration).
- STRICT RESTRAINT: Do NOT spam emojis everywhere (maximum 1-2 per post). Never use multi-emoji chains (avoid chains like 🙏✨💖🔥). Keep it elegant, purposeful, and dignified.

7. INTERNAL DIVERSITY AUDIT:
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
        structure_notes.append(
            f"Line 1 MUST be '{opening_tag}'. Then insert an explicit NEWLINE (\\n). The post body content MUST start on Line 2 (next line), NEVER continuing on the same line with a space."
        )
    if closing_tag:
        structure_notes.append(
            f'Optional Closing Line: "{closing_tag}". Append on its own separate NEWLINE (\\n) at the very end ONLY IF total post fits inside 230-279 chars; if space is tight, omit it.'
        )
    structure_str = "\n  - ".join(structure_notes) if structure_notes else "Standard post structure."

    lang_lower = (request.language or "").lower()
    if lang_lower == "hinglish":
        language_rule = (
            "STRICT LANGUAGE REQUIREMENT: You MUST output in HINGLISH ONLY (Hindi language written phonetically in English/Latin alphabet letters, e.g. 'Hum sabhi ko is muhim se judkar aage aana chahiye...'). "
            "ABSOLUTELY ZERO Devanagari script (no हिंदी अक्षर). ABSOLUTELY ZERO pure English prose. Write natural Hindi conversational phrasing using English letters only."
        )
    elif lang_lower == "hindi":
        language_rule = "LANGUAGE REQUIREMENT: Output in HINDI using Devanagari script."
    else:
        language_rule = f"LANGUAGE REQUIREMENT: Output in {request.language}."

    diversity_note = (
        "Single source provided: If it contains multiple distinct incidents/case studies or bullets (e.g. marked with ♦️), dedicate each draft to a DIFFERENT specific incident (preserving exact names, locations, and financial amounts). Otherwise, craft distinct editorial angles on the core truth. Do NOT use identical sentence templates or synonym swaps."
        if is_single_sample else
        "Multiple sources provided: Cluster distinct topics and dedicate drafts to different specific incidents/teachings. Elaborate on the context and spiritual/practical depth so every post fills 230 to 279 characters."
    )

    return f"""Analyze the source material and generate {request.output_count} genuinely distinct draft posts in {request.language}.

INPUT DATA:
{json.dumps(user_payload, ensure_ascii=False, indent=2)}

EDITORIAL & STRUCTURAL INSTRUCTIONS:
- {language_rule}
- {diversity_note}
- STRUCTURE:
  - {structure_str}
- EMOJIS: Include 1-2 tasteful, contextually relevant emojis per post where appropriate (e.g. 🙏, 🏥, 🤝, 📖, 💡). Do not clutter or overuse.
- MANDATORY LENGTH: Every single draft MUST be between 230 and 279 characters in total (target 255-272 chars, minimum 230 chars, maximum 279 chars).
- STRICT MINIMUM 230: Drafts under 230 characters are strictly forbidden; never exceed 279 characters.
- Base drafts strictly on source material. Return JSON only.
"""

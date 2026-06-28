"""Claude (via Emergent universal key) narrative generation for reipila.
Grounded strictly in the deterministic convergence log. French output.
"""
import os
from dotenv import load_dotenv

load_dotenv()
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")
MODEL = ("anthropic", "claude-sonnet-4-5-20250929")


def _steps_text(conv):
    lines = []
    for s in conv.get("steps", []):
        lines.append(
            f"[STEP {s['step_number']}] {s['category']} \u2192 {s['finding']} "
            f"({s['weight_label']}, +{s['points_contributed']} pts)"
        )
    return "\n".join(lines)


async def _chat(system, prompt, session):
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=session,
                   system_message=system).with_model(*MODEL)
    resp = await chat.send_message(UserMessage(text=prompt))
    return resp if isinstance(resp, str) else str(resp)


async def interpret(parcelle, conv, acquisition=None):
    system = ("Tu es un analyste en investissement immobilier senior chez reipila (M\u00e9tropole de Lyon). "
              "Tu es factuel, rigoureux et concis, avec une logique d'investisseur (cr\u00e9ation de valeur, "
              "d\u00e9cote, co\u00fbt de travaux, plus-value). Tu ne fabriques jamais de donn\u00e9es : tu t'appuies "
              "UNIQUEMENT sur le log de convergence et les chiffres fournis.")
    eco = ""
    a = acquisition or {}
    if a.get("plus_value_potentielle") is not None or a.get("decote_vs_median_pct") is not None:
        eco = (
            "\n\u00c9conomie de l'op\u00e9ration (estimations reipila) :\n"
            f"- D\u00e9cote vs march\u00e9 : {a.get('decote_vs_median_pct')}%\n"
            f"- Valeur estim\u00e9e actuelle (m\u00e9diane) : {a.get('prix_acquisition_estime') or a.get('valeur_estimee_median')} \u20ac\n"
            f"- Co\u00fbt de travaux estim\u00e9 ({a.get('travaux_eur_m2')} \u20ac/m\u00b2, DPE {a.get('dpe_classe')}) : {a.get('cout_travaux_estime')} \u20ac\n"
            f"- Valeur apr\u00e8s travaux (P75 secteur) : {a.get('valeur_apres_travaux')} \u20ac\n"
            f"- Plus-value potentielle : {a.get('plus_value_potentielle')} \u20ac (marge {a.get('marge_pct')}%)\n"
            f"- Types d'opportunit\u00e9 : {', '.join(a.get('types_opportunite') or []) or 'n/d'}\n"
        )
    prompt = (
        f"Parcelle {parcelle.get('ref_cadastrale')} \u00e0 {parcelle.get('commune_nom')}, "
        f"adresse : {parcelle.get('adresse_ban') or 'n/d'}.\n"
        f"Score de conviction : {conv.get('conviction_score')}% \u2014 {conv.get('classification')}.\n"
        f"Action recommand\u00e9e : {conv.get('recommended_action')}.\n\n"
        f"Log de convergence (signaux d\u00e9tect\u00e9s, du plus fort au plus faible) :\n{_steps_text(conv)}\n"
        f"{eco}\n"
        "R\u00e9dige une analyse professionnelle en fran\u00e7ais (5 \u00e0 7 phrases, un paragraphe dense) qui explique "
        "pourquoi ce bien pr\u00e9sente une probabilit\u00e9 de vente \u00e9lev\u00e9e (dynamique entre signaux / triangulation), "
        "PUIS l'angle investisseur : potentiel de cr\u00e9ation de valeur (d\u00e9cote, travaux, plus-value) et l'action "
        "\u00e0 mener. Reste prudent et chiffr\u00e9. Pas de listes \u00e0 puces."
    )
    return await _chat(system, prompt, f"interpret-{parcelle.get('ref_cadastrale')}")


async def pitch(parcelle, conv):
    system = ("Tu es un n\u00e9gociateur immobilier d'\u00e9lite chez reipila. Tu r\u00e9diges des approches "
              "de prise de contact percutantes, respectueuses et personnalis\u00e9es, en fran\u00e7ais.")
    prompt = (
        f"Bien : {parcelle.get('commune_nom')} \u2014 parcelle {parcelle.get('ref_cadastrale')}.\n"
        f"Signaux cl\u00e9s :\n{_steps_text(conv)}\n\n"
        "R\u00e9dige un pitch d'approche (un court message de prise de contact, 5-7 phrases) \u00e0 "
        "destination du propri\u00e9taire, qui inspire confiance, mentionne subtilement le contexte "
        "sans \u00eatre intrusif, et propose un \u00e9change. Ton professionnel et humain."
    )
    return await _chat(system, prompt, f"pitch-{parcelle.get('ref_cadastrale')}")


async def memo(parcelle, conv, acquisition):
    system = ("Tu es analyste en investissement immobilier chez reipila. Tu produis des m\u00e9mos "
              "d'apport d'affaires structur\u00e9s, chiffr\u00e9s et prudents, en fran\u00e7ais.")
    prompt = (
        f"Bien : {parcelle.get('commune_nom')} \u2014 parcelle {parcelle.get('ref_cadastrale')}, "
        f"type {parcelle.get('type_bien')}, surface {parcelle.get('surface_bati_m2')} m\u00b2.\n"
        f"Score de conviction : {conv.get('conviction_score')}%.\n"
        f"Donn\u00e9es march\u00e9 : prix m\u00e9dian {parcelle.get('marche_prix_m2_median')} \u20ac/m\u00b2, "
        f"P25 {parcelle.get('marche_prix_m2_p25')}, P75 {parcelle.get('marche_prix_m2_p75')}.\n"
        f"Estimations : {acquisition}\n"
        f"Signaux :\n{_steps_text(conv)}\n\n"
        "R\u00e9dige un m\u00e9mo d'apport (titre + 3 sections courtes : Th\u00e8se d'investissement, "
        "\u00c9conomie de l'op\u00e9ration, Risques & points de vigilance). Concis, chiffr\u00e9, fran\u00e7ais."
    )
    return await _chat(system, prompt, f"memo-{parcelle.get('ref_cadastrale')}")

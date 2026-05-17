"""Builds system and user prompts for each module."""

from models.tenant import Tenant

BASE_ROLE = {
    "real_estate": "You are an AI assistant for {company}, a real estate business. You generate professional documents based on structured inputs.",
    "contracting": "You are an AI assistant for {company}, a contracting/construction business. You generate professional documents based on structured inputs.",
}

QUALITY_RULES = """
Rules:
- Do not fabricate specific facts not provided in the input.
- If a field is missing or marked optional and not provided, omit that section naturally.
- Keep tone consistent throughout.
- Return well-formatted, professional text ready for immediate use.
- Use markdown headers (##) to separate distinct output sections.
"""

MODULE_PROMPTS = {
    # ── Real Estate ──────────────────────────────────────────────────────────
    "re_listing": {
        "format": """Return your response in exactly these sections:
## Short Description
A 150-200 word MLS-ready property description.

## Long Description
A 300-500 word marketing description with rich detail.

## Social Caption
An engaging Instagram/Facebook caption (under 150 characters, include relevant emojis).

## Email Teaser
Subject: [compelling subject line]
[3-sentence email teaser for interested buyers]""",
        "user_template": """Generate listing content for the following property:

Address: {address}
Bedrooms: {bedrooms} | Bathrooms: {bathrooms} | Square Feet: {sqft}
Lot Size: {lot_size}
Year Built: {year_built}
Key Features: {features}
Neighborhood Highlights: {neighborhood}
Price Point / Target Buyer: {price_target}
Tone: {tone}
Additional Notes: {notes}""",
    },

    "re_email": {
        "format": """Return your response in exactly these sections:
## Subject Line
[compelling subject line]

## Email Body
[full professional email body]""",
        "user_template": """Write a professional real estate email.

Email Type: {email_type}
Agent Name: {agent_name}
Client Name: {client_name}
Property Address: {property_address}
Context / Key Details: {context}
Additional Instructions: {notes}""",
    },

    "re_cma": {
        "format": """Return your response in exactly these sections:
## Executive Summary
[1-2 paragraph client-facing summary]

## Comparable Analysis
[analysis of each comparable with key takeaways]

## Pricing Rationale
[paragraph explaining recommended price range]

## Full CMA Narrative
[complete narrative agents can paste into their CMA template]""",
        "user_template": """Generate a CMA narrative for the following property:

Subject Property: {subject_property}
Subject Details: {subject_details}

Comparable Sales:
{comparables}

Market Trend Notes: {market_notes}
Recommended List Price Range: {price_range}

Only use the comparable sales included above. If any comparable field says "not verified" or "unknown", clearly avoid relying on that detail as a fact. When source URLs are included, treat them as traceability for the agent, not as client-facing citations unless asked.""",
    },

    # ── Contracting ──────────────────────────────────────────────────────────
    "co_proposal": {
        "format": """Return your response in exactly these sections:
## Executive Summary
[1 paragraph professional overview of the project]

## Scope of Work
[detailed scope with numbered tasks]

## Pricing
[formatted pricing table or breakdown]

## Timeline
[project timeline with milestones]

## Terms & Conditions
[standard terms block]

## Warranty
[warranty terms]

## Signature Block
[formatted signature/acceptance section]""",
        "user_template": """Generate a contractor proposal with the following details:

Client Name: {client_name}
Client Address: {client_address}
Job Type: {job_type}
Scope Description: {scope}
Materials: {materials}
Labor Estimate: {labor}
Timeline: {timeline}
Payment Terms: {payment_terms}
Warranty Terms: {warranty}
Contractor License #: {license_num}
Insurance Info: {insurance}
Additional Notes: {notes}""",
    },

    "co_sow": {
        "format": """Return your response in exactly these sections:
## Scope of Work

### Included Tasks
[numbered list of tasks with specifications]

### Materials
[materials callout list]

### Exclusions
[clearly list what is NOT included]

### Assumptions
[assumptions the scope is based on]

### Change Order Language
[standard change order clause]""",
        "user_template": """Generate a Scope of Work document:

Job Type: {job_type}
Detailed Task Description: {description}
Exclusions: {exclusions}
Site Conditions: {site_conditions}
Special Requirements: {requirements}""",
    },

    "co_email": {
        "format": """Return your response in exactly these sections:
## Subject Line
[subject line]

## Email Body
[professional email body]""",
        "user_template": """Write a professional contractor communication email.

Email Type: {email_type}
Company Name: {company_name}
Client Name: {client_name}
Job Type / Description: {job_description}
Context / Key Details: {context}
Additional Instructions: {notes}""",
    },

    "co_completion": {
        "format": """Return your response in exactly these sections:
## Completion Letter
[formal job completion letter]

## Warranty Certificate
[warranty certificate block with terms]

## Post-Job Care Instructions
[care instructions section]""",
        "user_template": """Generate a job completion and warranty letter:

Client Name: {client_name}
Client Address: {client_address}
Work Completed: {work_completed}
Completion Date: {completion_date}
Warranty Period: {warranty_period}
Warranty Coverage: {warranty_coverage}
Emergency Contact: {emergency_contact}
Post-Job Care Instructions: {care_instructions}""",
    },

    "co_job_brief": {
        "format": """Return your response as a clean, scannable job brief:

## Job Brief — {job_date}

**Site:** [address]
**Client:** [name + access notes]

### Scope
[brief scope summary, bulleted]

### Materials
**On Site:** [list]
**Bring:** [list]

### Special Instructions
[any special notes]

### Expected Hours
[hours]""",
        "user_template": """Generate a crew job brief:

Job Date: {job_date}
Job Address: {address}
Client Name: {client_name}
Access Notes: {access_notes}
Scope Summary: {scope}
Materials On Site: {materials_on_site}
Materials to Bring: {materials_to_bring}
Special Instructions: {instructions}
Expected Hours: {hours}""",
    },
}


def build_prompt(module: str, input_data: dict, tenant: Tenant) -> tuple[str, str]:
    """Returns (system_prompt, user_prompt) for a given module."""
    vertical = tenant.vertical
    company = tenant.name

    role = BASE_ROLE.get(vertical, BASE_ROLE["real_estate"]).format(company=company)

    template = MODULE_PROMPTS.get(module)
    if not template:
        raise ValueError(f"Unknown module: {module}")

    brand_voice = ""
    if tenant.system_prompt_override:
        brand_voice = f"\nBrand Voice Guidelines:\n{tenant.system_prompt_override}\n"

    system_prompt = f"{role}\n{brand_voice}\n{template['format']}\n{QUALITY_RULES}"

    # Build user prompt — fill template with input_data, default missing to "Not provided"
    user_template = template["user_template"]
    filled = {}
    import re
    for key in re.findall(r"\{(\w+)\}", user_template):
        filled[key] = input_data.get(key) or "Not provided"

    user_prompt = user_template.format(**filled)

    return system_prompt, user_prompt

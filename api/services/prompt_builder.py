"""Prompt builder for generation modules."""

from string import Formatter


def _value(data: dict, key: str, default: str = "Not provided") -> str:
    value = data.get(key)
    if value is None or value == "":
        return default
    if isinstance(value, list):
        return "\n".join(str(item) for item in value) or default
    return str(value)


def _base_system(tenant, role: str, format_instructions: str, vertical: str) -> str:
    company = getattr(tenant, "company_name", None) or getattr(tenant, "name", "the brokerage")
    brokerage = getattr(tenant, "brokerage_name", None)
    brand_voice = (
        getattr(tenant, "brand_voice", None)
        or getattr(tenant, "system_prompt_override", None)
        or "Professional, warm, and knowledgeable."
    )

    brokerage_text = f" at {brokerage}" if brokerage else ""
    business_type = "contracting/construction business" if vertical == "contracting" else "real estate business"
    system = f"""You are an AI assistant for {company}{brokerage_text}, a {business_type}.
Your role: {role}

Brand voice and writing style:
{brand_voice}

{format_instructions}

Critical rules:
- Never fabricate specific facts, statistics, or data not provided in the input.
- If a field is missing or empty, omit that section naturally.
- Keep all output in the agent's brand voice.
- Use plain, client-friendly language unless the context is agent-to-agent.
- Output the requested content directly with no preamble.
"""

    override = getattr(tenant, "system_prompt_override", None)
    if override and override != brand_voice:
        system += f"\nAdditional instructions:\n{override}"
    return system


MODULE_PROMPTS = {
    "re_listing": {
        "role": "Generate professional real estate listing descriptions",
        "format": """Return exactly this structure:
## SHORT DESCRIPTION
[MLS-ready, 150-200 words]

## LONG DESCRIPTION
[Full marketing copy, 350-500 words]

## SOCIAL CAPTION
[Instagram/Facebook caption, 3-5 sentences with 5-8 hashtags]

## EMAIL TEASER
Subject: [subject line]
[3-sentence preview for email campaigns]""",
        "user": """Generate listing content for this property:

Address: {address}
Bedrooms: {bedrooms} | Bathrooms: {bathrooms} | Sqft: {sqft}
Lot Size: {lot_size}
Year Built: {year_built}
Price: {price}
Key Features: {features}
Neighborhood Highlights: {neighborhood}
Tone: {tone}
Target Buyer: {target_buyer}
Price Point / Existing Target Buyer Notes: {price_target}
Additional Notes: {notes}""",
    },
    "re_cma": {
        "role": "Generate professional CMA narrative sections for listing presentations",
        "format": """Return exactly this structure:
## EXECUTIVE SUMMARY
[2-3 paragraphs, client-facing, non-technical]

## COMPARABLE ANALYSIS
[Discuss each comp and what it tells us about the market]

## PRICING RATIONALE
[Clear explanation of recommended price range]

## MARKET CONDITIONS SUMMARY
[1 paragraph on current market context]""",
        "user": """Generate a CMA narrative for:

Subject Property: {subject_property}
Subject Details: {subject_details}
Comparable Sales:
{comparables}
Recommended List Price Range: {price_range}
Market Trend Notes: {market_notes}
Seller Situation: {seller_situation}""",
    },
    "re_email": {
        "role": "Draft professional real estate emails",
        "format": """Return exactly:
Subject: [compelling subject line]

[Email body]

[Sign-off]
{{AGENT_NAME}}""",
        "user": """Email type: {email_type}
Recipient: {recipient_name}
Client Name: {client_name}
Agent Name: {agent_name}
Property: {property_address}
Context / key points: {context}
Tone override: {tone}
Additional details: {notes}""",
    },
    "re_neighborhood": {
        "role": "Generate branded neighborhood market reports for seller listing appointments",
        "format": """Return exactly:
## NEIGHBORHOOD OVERVIEW
## MARKET SNAPSHOT
## BUYER PROFILE
## SCHOOL & COMMUNITY HIGHLIGHTS
## WHY NOW""",
        "user": """Neighborhood/Area: {neighborhood}
City/Zip: {location}
Property Type Focus: {property_type}
Price Range in Area: {price_range}
Agent Notes on Area: {agent_notes}""",
    },
    "re_appointment": {
        "role": "Generate listing appointment presentation outlines and talking points",
        "format": """Return exactly:
## OPENING - BUILD RAPPORT
## MARKET OVERVIEW
## PROPERTY POSITIONING
## PRICING STRATEGY
## MARKETING PLAN
## WHY OUR TEAM
## TIMELINE & NEXT STEPS
## COMMON SELLER OBJECTIONS & RESPONSES""",
        "user": """Property Address: {address}
Bedrooms/Baths/Sqft: {specs}
Estimated Value Range: {value_range}
Seller Situation: {seller_situation}
Known Challenges: {challenges}
Agent Notes: {notes}""",
    },
    "re_competitive": {
        "role": "Generate competitive analysis briefs comparing a subject property to active competition",
        "format": """Return exactly:
## COMPETITIVE POSITION SUMMARY
## ADVANTAGES OVER COMPETITION
## AREAS WHERE COMPETITION HAS EDGE
## BUYER OBJECTION ANTICIPATION
## PRICING POSITION
## RECOMMENDED TALKING POINTS""",
        "user": """Subject Property: {address}
Specs: {specs}
List Price: {list_price}
Key Features: {features}
Competing Active Listings:
{competitors}
Market Context: {market_notes}""",
    },
    "re_timeline": {
        "role": "Generate a complete transaction update email sequence for buyers or sellers",
        "format": """Generate one email per milestone listed. For each email return:
--- EMAIL [N]: [MILESTONE NAME] ---
Send Date: [relative to contract date]
Subject: [subject line]
[Email body]
---""",
        "user": """Transaction Type: {transaction_type}
Client Type: {client_type}
Client Name: {client_name}
Property Address: {address}
Contract Date: {contract_date}
Inspection Period Ends: {inspection_end}
Appraisal Deadline: {appraisal_date}
Loan Commitment: {loan_commitment}
Final Walkthrough: {walkthrough_date}
Closing Date: {closing_date}""",
    },
    "re_seller_update": {
        "role": "Generate weekly seller update emails",
        "format": """Return a tactful weekly seller update email with showing activity, feedback, market context, next steps, and sign-off.""",
        "user": """Seller Name: {seller_name}
Property Address: {address}
Days on Market: {dom}
Week Number: {week_number}
Showings This Week: {showing_count}
Buyer Feedback: {feedback}
Price Discussion Needed: {price_discussion}
Market Notes: {market_notes}
Agent Action Items This Week: {agent_actions}""",
    },
    "re_buyer_consult": {
        "role": "Generate formal Buyer Needs Analysis documents from consultation notes",
        "format": """Return exactly:
## BUYER PROFILE SUMMARY
## SEARCH CRITERIA
## FINANCIAL PARAMETERS
## TARGET AREAS
## BUYING MOTIVATION & TIMELINE
## NEXT STEPS
## NOTES FOR AGENT""",
        "user": """Buyer Name(s): {buyer_names}
Consultation Date: {date}
Pre-Approved: {pre_approved}
Budget Range: {budget}
Down Payment: {down_payment}
Target Areas: {target_areas}
Must-Haves: {must_haves}
Nice-to-Haves: {nice_to_haves}
Deal-Breakers: {deal_breakers}
Timeline to Buy: {timeline}
Motivation: {motivation}
Current Situation: {current_situation}
Agent Notes: {agent_notes}""",
    },
    "re_offer_letter": {
        "role": "Write compelling personal offer letters from buyers to sellers",
        "format": "Write a single warm, genuine personal letter in 3-5 paragraphs. Do not mention price, terms, or negotiating language.",
        "user": """Buyer Name(s): {buyer_names}
Buyer Situation: {buyer_situation}
What they loved about the home: {home_highlights}
Their story / why this home: {buyer_story}
Tone: {tone}
Additional personal details: {extra_details}""",
    },
    "re_expired_outreach": {
        "role": "Generate a 5-touch expired listing and FSBO outreach email sequence",
        "format": """Generate exactly 5 emails:
--- EMAIL [N] - [SEND TIMING] ---
Subject: [subject line]
[Email body]
---""",
        "user": """Lead Type: {lead_type}
Owner Name: {owner_name}
Property Address: {address}
Days Expired / FSBO: {days}
Original List Price: {original_price}
Known Reason for Expiring: {reason}
Agent Differentiator: {differentiator}""",
    },
    "re_soi_campaign": {
        "role": "Generate sphere of influence email campaigns",
        "format": """For each segment provided, generate one email:
--- [SEGMENT NAME] ---
Subject: [subject line]
[Email body]
---""",
        "user": """Segments to cover:
{segments}
Season/Context: {context}
Value to offer: {value_offer}
Call to action: {cta}""",
    },
    "re_just_listed": {
        "role": "Generate complete just listed / just sold announcement content suites",
        "format": """Return exactly:
## INSTAGRAM CAPTION
## FACEBOOK POST
## LINKEDIN POST
## EMAIL BLAST
## NEIGHBOR POSTCARD COPY
## TEXT MESSAGE VERSION""",
        "user": """Type: {announcement_type}
Address: {address}
Price: {price}
Key Stats: {specs}
Headline Feature: {headline_feature}
Agent Instagram Handle: {ig_handle}
Open House Info: {open_house}""",
    },
    "re_open_house_followup": {
        "role": "Generate personalized open house follow-up emails for each visitor type",
        "format": """For each visitor, generate:
--- VISITOR: [NAME] ---
Subject: [personalized subject line]
[Email body]
---""",
        "user": """Property: {address}
Open House Date: {date}
Visitors:
{visitors}""",
    },
    "re_virtual_staging": {
        "role": "Generate virtual staging descriptions and room-by-room design narratives",
        "format": """For each room provided, generate:
## [ROOM NAME]
Staging Recommendation: [specific furniture, layout, style suggestions]
Buyer Vision Description: [how to describe this room to buyers]
---""",
        "user": """Property Style: {style}
Target Buyer: {target_buyer}
Price Point: {price}
Rooms:
{rooms}""",
    },
    "re_property_faq": {
        "role": "Generate comprehensive property FAQ documents for showings and open houses",
        "format": "Generate a complete FAQ organized into Property Details, Financials & HOA, Location & Schools, Logistics, and Seller Terms.",
        "user": """Address: {address}
Property Details: {property_details}
HOA: {hoa}
HOA Monthly: {hoa_fee}
What HOA Covers: {hoa_covers}
School District: {schools}
Flood Zone: {flood_zone}
Utilities: {utilities}
Recent Updates: {updates}
Seller Closing Timeline: {closing_pref}
Inclusions: {inclusions}
Exclusions: {exclusions}
Showing Instructions: {showing_instructions}
Additional Notes: {notes}""",
    },
    "re_price_reduction": {
        "role": "Generate professional price reduction recommendation memos for seller clients",
        "format": """Return exactly:
## MARKET CONTEXT
## WHAT THE SHOWING ACTIVITY IS TELLING US
## THE OPPORTUNITY A PRICE ADJUSTMENT CREATES
## RECOMMENDED ADJUSTMENT
## WHAT HAPPENS IF WE STAY AT CURRENT PRICE
## OUR RECOMMENDED NEXT STEPS""",
        "user": """Seller Name: {seller_name}
Property Address: {address}
Current List Price: {current_price}
Days on Market: {dom}
Showings to Date: {showings}
Offers Received: {offers}
Buyer Feedback Themes: {feedback}
Recommended New Price: {recommended_price}
Competing Listings: {competition}
Market Trend: {market_trend}""",
    },
    "re_business_plan": {
        "role": "Generate professional real estate agent annual business plans and performance reviews",
        "format": """Return exactly:
## YEAR IN REVIEW
## KEY WINS
## LESSONS LEARNED
## GOALS FOR NEXT YEAR
## LEAD GENERATION STRATEGY
## FINANCIAL PLAN
## QUARTERLY ACTION PLAN
## ACCOUNTABILITY STRUCTURE""",
        "user": """Agent Name: {agent_name}
Years in Business: {years}
Last Year Closings: {last_closings}
Last Year GCI: {last_gci}
Top Lead Sources: {lead_sources}
Goal Closings Next Year: {goal_closings}
Goal GCI Next Year: {goal_gci}
Avg Commission: {avg_commission}
Team Size: {team_size}
Biggest Challenge Last Year: {challenge}
Focus Area for Growth: {focus}""",
    },
    "re_bio": {
        "role": "Write compelling, personality-driven real estate agent bios",
        "format": """Return exactly:
## WEBSITE BIO (LONG)
## ZILLOW / REALTOR.COM BIO (SHORT)
## SOCIAL MEDIA BIO""",
        "user": """Agent Name: {agent_name}
Years in Real Estate: {years}
Specialty / Niche: {specialty}
Location / Market: {market}
License / Designations: {designations}
Brokerage: {brokerage}
Personal Background: {background}
Why They Got Into Real Estate: {why}
Unique Differentiators: {differentiators}
Personal Interests: {interests}
Tone: {tone}""",
    },
    "re_testimonial": {
        "role": "Polish client testimonials while preserving the client's authentic voice",
        "format": """Return exactly:
## POLISHED TESTIMONIAL
## SHORT PULL QUOTE
## SUGGESTED USE CASES""",
        "user": """Raw Testimonial:
{raw_testimonial}
Client Name: {client_name}
Transaction Type: {transaction_type}
Key Theme to Preserve: {theme}""",
    },
    "re_referral": {
        "role": "Generate personalized referral thank-you letters",
        "format": """Return exactly:
## EMAIL VERSION
## PHYSICAL LETTER VERSION
## GIFT SUGGESTION""",
        "user": """Referral Source Name: {source_name}
Relationship to Agent: {relationship}
Who They Referred: {referral_name}
Outcome: {outcome}
Anything Special About This Person: {notes}""",
    },
    "co_proposal": {
        "role": "Generate professional contractor proposals",
        "format": """Return exactly:
## Executive Summary
## Scope of Work
## Pricing
## Timeline
## Terms & Conditions
## Warranty
## Signature Block""",
        "user": """Client Name: {client_name}
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
        "role": "Generate construction scope of work documents",
        "format": """Return exactly:
## Scope of Work
### Included Tasks
### Materials
### Exclusions
### Assumptions
### Change Order Language""",
        "user": """Job Type: {job_type}
Detailed Task Description: {description}
Exclusions: {exclusions}
Site Conditions: {site_conditions}
Special Requirements: {requirements}""",
    },
    "co_email": {
        "role": "Draft professional contractor communication emails",
        "format": """Return exactly:
## Subject Line
## Email Body""",
        "user": """Email Type: {email_type}
Company Name: {company_name}
Client Name: {client_name}
Job Type / Description: {job_description}
Context / Key Details: {context}
Additional Instructions: {notes}""",
    },
    "co_completion": {
        "role": "Generate job completion and warranty letters",
        "format": """Return exactly:
## Completion Letter
## Warranty Certificate
## Post-Job Care Instructions""",
        "user": """Client Name: {client_name}
Client Address: {client_address}
Work Completed: {work_completed}
Completion Date: {completion_date}
Warranty Period: {warranty_period}
Warranty Coverage: {warranty_coverage}
Emergency Contact: {emergency_contact}
Post-Job Care Instructions: {care_instructions}""",
    },
    "co_job_brief": {
        "role": "Generate concise crew job briefs",
        "format": """Return a clean, scannable job brief with site, client, scope, materials, special instructions, and expected hours.""",
        "user": """Job Date: {job_date}
Job Address: {address}
Client Name: {client_name}
Access Notes: {access_notes}
Scope Summary: {scope}
Materials On Site: {materials_on_site}
Materials to Bring: {materials_to_bring}
Special Instructions: {instructions}
Expected Hours: {hours}""",
    },
    "contract_listing_agreement": {
        "role": "Generate listing agreement text sections",
        "format": "Generate agreement narrative sections. Use [BLANK] for fillable PDF fields and placeholders like {{AGENT_NAME}} where needed.",
        "user": """Property Address: {address}
Seller Name(s): {seller_names}
Listing Start Date: {start_date}
Listing End Date: {end_date}
Listing Price: {list_price}
Commission Rate: {commission}
Buyer Agent Commission: {buyer_commission}
Lockbox: {lockbox}
MLS Authorization: {mls_auth}
Special Terms: {special_terms}""",
    },
    "contract_buyer_broker": {
        "role": "Generate buyer broker agreement text sections",
        "format": "Generate agreement narrative sections. Use [BLANK] for fillable PDF fields.",
        "user": """Buyer Name(s): {buyer_names}
Agreement Start: {start_date}
Agreement End: {end_date}
Geographic Area: {area}
Property Type: {property_type}
Price Range: {price_range}
Compensation: {compensation}
Dual Agency Permitted: {dual_agency}""",
    },
}


PROMPT_REGISTRY = set(MODULE_PROMPTS)


def build_prompt(module: str, input_data: dict, tenant) -> tuple[str, str]:
    prompt = MODULE_PROMPTS.get(module)
    if not prompt:
        raise ValueError(f"Unknown module: {module}")

    vertical = "contracting" if module.startswith("co_") else "real_estate"
    system_prompt = _base_system(tenant, prompt["role"], prompt["format"], vertical)
    keys = [field_name for _, field_name, _, _ in Formatter().parse(prompt["user"]) if field_name]
    values = {key: _value(input_data, key) for key in keys}
    user_prompt = prompt["user"].format(**values)
    return system_prompt, user_prompt

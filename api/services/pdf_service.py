"""
PDF generation using ReportLab.
Generates fillable PDFs with signature blocks, brokerage header, and structured sections.
"""

import os
import uuid
from datetime import datetime, timezone
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, PageBreak
)
from reportlab.pdfgen import canvas
from pypdf import PdfReader, PdfWriter
from config import settings


BRAND_BLUE = colors.HexColor('#2563eb')
LIGHT_GRAY = colors.HexColor('#f3f4f6')
MID_GRAY = colors.HexColor('#9ca3af')
DARK = colors.HexColor('#111827')


def generate_document_pdf(
    title: str,
    content_sections: dict,
    tenant,
    output_filename: str = None
) -> str:
    """
    Generate a branded PDF for any generated document.
    Returns the file path.
    """
    if not output_filename:
        output_filename = f"{uuid.uuid4()}.pdf"

    output_path = os.path.join(settings.pdf_output_dir, output_filename)
    os.makedirs(settings.pdf_output_dir, exist_ok=True)

    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        rightMargin=0.75 * inch,
        leftMargin=0.75 * inch,
        topMargin=1.2 * inch,
        bottomMargin=0.75 * inch,
    )

    styles = _get_styles(tenant)
    story = []

    # Title
    story.append(Paragraph(title, styles['doc_title']))
    story.append(Spacer(1, 0.1 * inch))
    story.append(HRFlowable(width="100%", thickness=2, color=BRAND_BLUE))
    story.append(Spacer(1, 0.2 * inch))

    # Generated date
    story.append(Paragraph(
        f"Generated: {datetime.now(timezone.utc).strftime('%B %d, %Y')}",
        styles['meta']
    ))
    story.append(Spacer(1, 0.3 * inch))

    # Content sections
    for section_title, section_body in content_sections.items():
        if section_title and section_body:
            story.append(Paragraph(section_title, styles['section_header']))
            story.append(Spacer(1, 0.08 * inch))
            # Handle multi-paragraph sections
            for para in section_body.split('\n\n'):
                if para.strip():
                    story.append(Paragraph(para.strip(), styles['body']))
                    story.append(Spacer(1, 0.08 * inch))
            story.append(Spacer(1, 0.15 * inch))

    def add_header_footer(canvas_obj, doc_obj):
        _draw_header(canvas_obj, doc_obj, tenant)
        _draw_footer(canvas_obj, doc_obj, tenant)

    doc.build(story, onFirstPage=add_header_footer, onLaterPages=add_header_footer)
    return output_path


def generate_contract_pdf(
    contract_type: str,
    contract_data: dict,
    generated_sections: dict,
    tenant,
    output_filename: str = None
) -> str:
    """
    Generate a contract PDF with fillable signature blocks.
    """
    if not output_filename:
        output_filename = f"contract_{uuid.uuid4()}.pdf"

    output_path = os.path.join(settings.pdf_output_dir, output_filename)
    os.makedirs(settings.pdf_output_dir, exist_ok=True)

    CONTRACT_TITLES = {
        'listing_agreement': 'Exclusive Right of Sale Listing Agreement',
        'buyer_broker': 'Buyer Broker Agreement',
        'offer_to_purchase': 'Offer to Purchase — Residential',
        'seller_disclosure': 'Seller Property Disclosure',
        'lease_agreement': 'Residential Lease Agreement',
        'commission_agreement': 'Commission Agreement',
        'as_is_cover_sheet': 'As-Is Residential Contract Cover Sheet',
    }
    title = CONTRACT_TITLES.get(contract_type, 'Contract')

    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        rightMargin=0.75 * inch,
        leftMargin=0.75 * inch,
        topMargin=1.4 * inch,
        bottomMargin=1 * inch,
    )

    styles = _get_styles(tenant)
    story = []

    # Contract title
    story.append(Paragraph(title.upper(), styles['contract_title']))
    story.append(Spacer(1, 0.05 * inch))
    story.append(HRFlowable(width="100%", thickness=3, color=BRAND_BLUE))
    story.append(Spacer(1, 0.15 * inch))

    # Parties block
    story.append(_parties_block(contract_data, tenant, styles))
    story.append(Spacer(1, 0.2 * inch))

    # Content sections from Claude output
    for section_title, section_body in generated_sections.items():
        if section_body and section_body.strip():
            story.append(Paragraph(section_title, styles['section_header']))
            story.append(Spacer(1, 0.06 * inch))
            for para in section_body.split('\n\n'):
                if para.strip():
                    story.append(Paragraph(para.strip(), styles['body']))
                    story.append(Spacer(1, 0.06 * inch))
            story.append(Spacer(1, 0.1 * inch))

    # Signature page
    story.append(PageBreak())
    story.append(_signature_page(contract_data, contract_type, tenant, styles))

    def add_header_footer(canvas_obj, doc_obj):
        _draw_header(canvas_obj, doc_obj, tenant)
        _draw_footer(canvas_obj, doc_obj, tenant)

    doc.build(story, onFirstPage=add_header_footer, onLaterPages=add_header_footer)
    return output_path


def _parties_block(contract_data: dict, tenant, styles) -> Table:
    agent_name = contract_data.get('agent_name') or contract_data.get('agent') or '{{AGENT_NAME}}'
    company = getattr(tenant, "company_name", None) or getattr(tenant, "name", "the brokerage")
    license_num = getattr(tenant, "license_number", None) or '{{LICENSE_NUMBER}}'

    # Support buyer names, seller names, or client_names
    client_names = (
        contract_data.get('seller_names') or 
        contract_data.get('buyer_names') or 
        contract_data.get('client_names') or 
        '_______________________'
    )
    client_address = contract_data.get('address') or contract_data.get('client_address') or '_______________________'
    client_phone = contract_data.get('phone') or contract_data.get('client_phone') or '_______________________'

    data = [
        ['BROKERAGE / AGENT', 'CLIENT(S)'],
        [
            f"{company}\n{agent_name}\nLicense: {license_num}\n{getattr(tenant, 'phone', '') or ''}",
            f"{client_names}\n{client_address}\n{client_phone}"
        ]
    ]
    table = Table(data, colWidths=[3.5 * inch, 3.5 * inch])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), BRAND_BLUE),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('FONTSIZE', (0, 1), (-1, 1), 9),
        ('BACKGROUND', (0, 1), (-1, 1), LIGHT_GRAY),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('PADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, MID_GRAY),
        ('FONTNAME', (0, 1), (-1, 1), 'Helvetica'),
    ]))
    return table


def _signature_page(contract_data: dict, contract_type: str, tenant, styles) -> Table:
    """Build the signature block table."""
    sig_line = '_' * 40
    date_line = '_' * 15

    # Determine parties based on contract type
    if contract_type in ('listing_agreement',):
        seller_names = contract_data.get('seller_names', '') or 'Seller'
        parties = [
            ('SELLER', seller_names.split(',')[0].strip()),
            ('SELLER', seller_names.split(',')[-1].strip() if ',' in seller_names else ''),
            ('LISTING AGENT', contract_data.get('agent_name') or '{{AGENT_NAME}}'),
            ('BROKER', getattr(tenant, 'brokerage_name', None) or getattr(tenant, 'company_name', None) or '{{BROKERAGE}}'),
        ]
    elif contract_type == 'buyer_broker':
        buyer_names = contract_data.get('buyer_names', '') or 'Buyer'
        parties = [
            ('BUYER', buyer_names.split(',')[0].strip()),
            ('BUYER', buyer_names.split(',')[-1].strip() if ',' in buyer_names else ''),
            ('BUYER\'S AGENT', contract_data.get('agent_name') or '{{AGENT_NAME}}'),
        ]
    else:
        parties = [
            ('PARTY 1', ''),
            ('PARTY 2', ''),
            ('AGENT', contract_data.get('agent_name') or '{{AGENT_NAME}}'),
        ]

    # Filter out empty roles/names
    parties = [(role, name) for role, name in parties if role and (name or role not in ('SELLER', 'BUYER'))]

    db_parties = contract_data.get("parties", [])
    parties_map = {}
    for p in db_parties:
        role_key = p.get("role", "").upper()
        name_key = p.get("name", "").strip()
        parties_map[(role_key, name_key)] = p

    sig_data = [['SIGNATURES', '', '', '']]
    sig_data.append(['ROLE', 'PRINTED NAME', 'SIGNATURE', 'DATE'])

    for role, name in parties:
        # Match from DB parties
        role_upper = role.upper()
        signed_info = parties_map.get((role_upper, name.strip()))
        if not signed_info:
            # Try fuzzy matching by role
            for (r, n), p in parties_map.items():
                if r == role_upper and (not name or n in name or name in n):
                    signed_info = p
                    break

        sig_display = sig_line
        date_display = date_line

        if signed_info and signed_info.get("signed"):
            sig_val = signed_info.get("signature_data") or "Electronically Signed"
            if len(sig_val) > 30:
                sig_val = sig_val[:27] + "..."
            sig_display = sig_val
            dt_str = signed_info.get("signed_at")
            if dt_str:
                try:
                    date_display = datetime.fromisoformat(dt_str.replace("Z", "+00:00")).strftime('%m/%d/%Y')
                except Exception:
                    date_display = dt_str[:10]
            else:
                date_display = datetime.now(timezone.utc).strftime('%m/%d/%Y')

        sig_data.append([
            role,
            name or sig_line,
            sig_display,
            date_display
        ])

    table = Table(sig_data, colWidths=[1.2*inch, 2*inch, 2.3*inch, 1.5*inch])
    table.setStyle(TableStyle([
        ('SPAN', (0, 0), (-1, 0)),
        ('BACKGROUND', (0, 0), (-1, 0), BRAND_BLUE),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 11),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('BACKGROUND', (0, 1), (-1, 1), LIGHT_GRAY),
        ('FONTNAME', (0, 1), (-1, 1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 0.5, MID_GRAY),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('PADDING', (0, 0), (-1, -1), 10),
        ('ROWBACKGROUNDS', (0, 2), (-1, -1), [colors.white, LIGHT_GRAY]),
    ]))
    return table



def _get_styles(tenant) -> dict:
    brand_color_hex = getattr(tenant, "brand_color", '#2563eb')
    if not brand_color_hex or len(brand_color_hex) != 7 or not brand_color_hex.startswith('#'):
        brand_color_hex = '#2563eb'
    brand_color = colors.HexColor(brand_color_hex)
    styles = getSampleStyleSheet()

    return {
        'doc_title': ParagraphStyle('DocTitle', fontSize=18, textColor=DARK,
                                     fontName='Helvetica-Bold', spaceAfter=4),
        'contract_title': ParagraphStyle('ContractTitle', fontSize=16, textColor=DARK,
                                          fontName='Helvetica-Bold', alignment=1, spaceAfter=4),
        'section_header': ParagraphStyle('SectionHeader', fontSize=11, textColor=brand_color,
                                          fontName='Helvetica-Bold', spaceBefore=6, spaceAfter=2),
        'body': ParagraphStyle('Body', fontSize=9.5, textColor=DARK,
                                fontName='Helvetica', leading=14),
        'meta': ParagraphStyle('Meta', fontSize=8, textColor=MID_GRAY,
                                fontName='Helvetica'),
        'sig_label': ParagraphStyle('SigLabel', fontSize=8, textColor=MID_GRAY,
                                     fontName='Helvetica-Bold'),
    }


def _draw_header(c: canvas.Canvas, doc, tenant):
    c.saveState()
    page_width = letter[0]
    header_y = letter[1] - 0.6 * inch

    brand_color_hex = getattr(tenant, "brand_color", '#2563eb')
    if not brand_color_hex or len(brand_color_hex) != 7 or not brand_color_hex.startswith('#'):
        brand_color_hex = '#2563eb'

    # Brand color bar
    c.setFillColor(colors.HexColor(brand_color_hex))
    c.rect(0, letter[1] - 0.35 * inch, page_width, 0.35 * inch, fill=1, stroke=0)

    # Company name in header bar
    c.setFillColor(colors.white)
    c.setFont('Helvetica-Bold', 10)
    company = getattr(tenant, "company_name", None) or getattr(tenant, "name", "the brokerage")
    c.drawString(0.75 * inch, letter[1] - 0.23 * inch, company)

    # License in header bar
    license_num = getattr(tenant, "license_number", None)
    if license_num:
        c.setFont('Helvetica', 8)
        c.drawRightString(page_width - 0.75 * inch, letter[1] - 0.23 * inch,
                          f"Lic. {license_num}")

    c.restoreState()


def _draw_footer(c: canvas.Canvas, doc, tenant):
    c.saveState()
    page_width = letter[0]
    footer_y = 0.45 * inch

    c.setStrokeColor(MID_GRAY)
    c.setLineWidth(0.5)
    c.line(0.75 * inch, footer_y + 0.15 * inch, page_width - 0.75 * inch, footer_y + 0.15 * inch)

    c.setFont('Helvetica', 7.5)
    c.setFillColor(MID_GRAY)

    company = getattr(tenant, "company_name", None) or getattr(tenant, "name", "the brokerage")
    footer_left = company
    phone = getattr(tenant, "phone", None)
    website = getattr(tenant, "website", None)
    if phone:
        footer_left += f"  ·  {phone}"
    if website:
        footer_left += f"  ·  {website}"

    c.drawString(0.75 * inch, footer_y, footer_left)
    c.drawRightString(page_width - 0.75 * inch, footer_y,
                      f"Page {doc.page}  ·  Generated {datetime.now(timezone.utc).strftime('%m/%d/%Y')}")
    c.restoreState()

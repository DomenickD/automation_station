"""Bootstrap script — creates initial super_admin user and demo tenants.
Usage: python seed.py
"""
import asyncio
from sqlalchemy import select
from database import AsyncSessionLocal
from models.tenant import Tenant
from models.user import User
from middleware.auth import hash_password


TENANTS = [
    {
        "name": "Demo Real Estate",
        "vertical": "real_estate",
        "slug": "demo-re",
        "brand_color": "#2563eb",
    },
    {
        "name": "Demo Contracting",
        "vertical": "contracting",
        "slug": "demo-co",
        "brand_color": "#16a34a",
    },
]

ADMIN_EMAIL = "admin@demo.com"
ADMIN_PASSWORD = "changeme123"


async def seed():
    async with AsyncSessionLocal() as db:
        for t_data in TENANTS:
            existing = await db.execute(select(Tenant).where(Tenant.slug == t_data["slug"]))
            if existing.scalar_one_or_none():
                print(f"Tenant '{t_data['slug']}' already exists, skipping.")
                continue

            tenant = Tenant(**t_data)
            db.add(tenant)
            await db.flush()

            user = User(
                tenant_id=tenant.id,
                email=ADMIN_EMAIL,
                name="Admin",
                role="super_admin",
                hashed_password=hash_password(ADMIN_PASSWORD),
            )
            db.add(user)
            print(f"Created tenant '{t_data['slug']}' with admin user {ADMIN_EMAIL}")

        await db.commit()
        print("\nSeed complete!")
        print(f"Login: email={ADMIN_EMAIL}  password={ADMIN_PASSWORD}")
        print("Use tenant_slug='demo-re' (real estate) or 'demo-co' (contracting)")


if __name__ == "__main__":
    asyncio.run(seed())

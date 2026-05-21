import httpx

def test_virtual_staging_generation():
    # 1. Login
    login_data = {
        "email": "admin@demo.com",
        "password": "changeme123",
        "tenant_slug": "demo-re"
    }
    
    print("Logging in...")
    login_resp = httpx.post("http://localhost:8000/auth/login", json=login_data)
    print("Login status:", login_resp.status_code)
    assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
    token_info = login_resp.json()
    token = token_info["access_token"]
    
    # 2. Generate virtual staging details
    headers = {
        "Authorization": f"Bearer {token}"
    }
    gen_data = {
        "input_data": {
            "address": "456 Sunset Boulevard, Los Angeles CA",
            "style": "Mid-Century Modern",
            "target_buyer": "Creative professionals & designers",
            "price": "$1,450,000",
            "rooms": "Living Room: 20x24, hardwood floors, large windows, empty\nPrimary Bedroom: 15x18, needs staging to feel cozy and premium"
        }
    }
    print("Sending virtual staging request to /generate/re/virtual-staging...")
    # Timeout 300s because Ollama takes some time
    gen_resp = httpx.post("http://localhost:8000/generate/re/virtual-staging", json=gen_data, headers=headers, timeout=300.0)
    print("Generation status:", gen_resp.status_code)
    assert gen_resp.status_code == 200, f"Generation failed: {gen_resp.text}"
    gen_result = gen_resp.json()
    print("Document ID:", gen_result.get("document_id"))
    print("Output text:")
    output_text = gen_result.get("output")
    if output_text:
        try:
            print(output_text)
        except UnicodeEncodeError:
            print(output_text.encode('ascii', errors='replace').decode('ascii'))
            
    # 3. Check if the listing was successfully upserted/saved in the DB
    print("\nChecking saved listings to verify upsert...")
    listings_resp = httpx.get("http://localhost:8000/listings", headers=headers)
    assert listings_resp.status_code == 200, f"Failed to get listings: {listings_resp.text}"
    listings = listings_resp.json()
    
    matched = [l for l in listings if "456 Sunset" in l.get("address", "")]
    assert len(matched) > 0, "Staging address was not saved/upserted in the listing database!"
    saved = matched[0]
    print(f"Success! Saved listing found in database: ID: {saved.get('id')}, Address: {saved.get('address')}")
    print(f"Mapped style: {saved.get('property_style')}")
    print(f"Mapped target buyer: {saved.get('target_buyer')}")
    print(f"Mapped price: {saved.get('list_price')}")

if __name__ == "__main__":
    try:
        test_virtual_staging_generation()
        print("\nVirtual Staging Test completed successfully!")
    except Exception as e:
        print("\nVirtual Staging Test failed with exception:", e)

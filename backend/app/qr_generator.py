import qrcode
import json
import os

def generate_granite_qr(block_id: str, quarry_name: str, length: float, breadth: float, height: float, weight: float, fee: float, output_dir: str) -> str:
    """
    Encodes granite block metadata into a QR code PNG, saving it
    in the static uploads directory. Returns the web-accessible path.
    """
    qr_payload = {
        "block_id": block_id,
        "quarry": quarry_name,
        "dimensions": f"{length}x{breadth}x{height} cm",
        "weight_mt": f"{weight} MT",
        "seigniorage_fee_inr": f"Rs. {fee}"
    }
    
    # Configure QR code properties
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(json.dumps(qr_payload))
    qr.make(fit=True)
    
    # Generate image representation using Pillow (PIL)
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Ensure output directory exists
    os.makedirs(output_dir, exist_ok=True)
    
    # Save the QR code PNG
    filename = f"qr_{block_id}.png"
    filepath = os.path.join(output_dir, filename)
    img.save(filepath)
    
    return f"/uploads/{filename}"

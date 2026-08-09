"""
A câmera do celular grava a foto com os pixels na orientação "nativa" do
sensor e uma tag EXIF dizendo o quanto girar na exibição — a Cloud API do
WhatsApp nem sempre respeita essa tag, então uma foto vertical pode chegar
deitada no cliente. Corrigimos aplicando a rotação direto nos pixels antes
de enviar, o que funciona independente de quem exibe respeitar EXIF ou não.
"""
import io

from PIL import Image, ImageOps


def normalize_image_orientation(content: bytes, mime_type: str) -> bytes:
    if not mime_type.startswith("image/"):
        return content
    try:
        img = Image.open(io.BytesIO(content))
        transposed = ImageOps.exif_transpose(img)
        save_format = "JPEG" if mime_type in ("image/jpeg", "image/jpg") else (img.format or "PNG")
        if save_format == "JPEG" and transposed.mode in ("RGBA", "P", "LA"):
            transposed = transposed.convert("RGB")
        buf = io.BytesIO()
        transposed.save(buf, format=save_format)
        return buf.getvalue()
    except Exception:
        # se der qualquer problema ao processar, manda o arquivo original —
        # melhor entregar a foto (mesmo que deitada) do que travar o envio
        return content

import os
from pathlib import Path
from py_vapid import Vapid
from py_vapid.main import b64urlencode
from cryptography.hazmat.primitives import serialization

ENV_PATH = Path(".env")
if not ENV_PATH.exists() and Path("backend/.env").exists():
    ENV_PATH = Path("backend/.env")


def _init_vapid_keys():
    pub = os.getenv("VAPID_PUBLIC_KEY")
    priv = os.getenv("VAPID_PRIVATE_KEY_PEM")
    sub = os.getenv("VAPID_CLAIM_EMAIL", "mailto:admin@sukasan.com")

    # Handle escaped newlines in env if any
    if priv and "\\n" in priv:
        priv = priv.replace("\\n", "\n")

    if pub and priv:
        return pub.strip(), priv.strip(), sub.strip()

    # Generate a fresh, permanent key pair
    v = Vapid()
    v.generate_keys()
    raw_pub = v.public_key.public_bytes(
        serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint
    )
    pub = b64urlencode(raw_pub)
    priv = v.private_pem().decode("utf-8")

    # Persist into .env if present
    try:
        if ENV_PATH.exists():
            with open(ENV_PATH, "a", encoding="utf-8") as f:
                f.write(f"\n# Web Push VAPID Keys\nVAPID_PUBLIC_KEY=\"{pub}\"\nVAPID_PRIVATE_KEY_PEM=\"{priv.replace(chr(10), r'\n')}\"\nVAPID_CLAIM_EMAIL=\"{sub}\"\n")
    except Exception as e:
        print(f"[VAPID] Notice: Could not append to .env: {e}")

    os.environ["VAPID_PUBLIC_KEY"] = pub
    os.environ["VAPID_PRIVATE_KEY_PEM"] = priv
    os.environ["VAPID_CLAIM_EMAIL"] = sub

    return pub, priv, sub


VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY_PEM, VAPID_CLAIM_EMAIL = _init_vapid_keys()

# Pre-parse a singleton Vapid instance from PEM bytes for fast and robust signing
try:
    VAPID_INSTANCE = Vapid.from_pem(VAPID_PRIVATE_KEY_PEM.encode("utf-8"))
except Exception as e:
    print(f"[VAPID] Warning: Could not initialize Vapid instance from PEM: {e}")
    VAPID_INSTANCE = None


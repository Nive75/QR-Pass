import nacl.utils # type: ignore
from nacl.public import PrivateKey, PublicKey, Box # type: ignore
import qrcode # type: ignore
import click # type: ignore
from datetime import datetime
import os
import json

@click.command()
@click.option('--response', help='Respons info in a json.')
def response_decrypt(response):

    response_json = json.loads(response)

    with open(f"files/beacon/beacon.key", mode='rb') as file:
        binary_key = file.read()

    skA = PrivateKey(binary_key)

    epkB = PublicKey(response_json['epkB'], encoder=nacl.encoding.HexEncoder)
    box = Box(skA, epkB)

    text_decrypted = box.decrypt(response_json['ciphertext'], encoder=nacl.encoding.HexEncoder)
    
    print(json.dumps(text_decrypted.decode("utf-8"), indent=2, ensure_ascii=False))

if __name__ == '__main__':
    response_decrypt()
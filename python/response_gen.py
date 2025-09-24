import nacl.utils # type: ignore
from nacl.public import PrivateKey, PublicKey, Box # type: ignore
import qrcode # type: ignore
import click # type: ignore
from datetime import datetime
import os
import json

@click.command()
@click.option('--beacon', help='Public key to use by a beacon in a json.')
@click.option('--msg', help='Message to send.')
@click.option('--expeditor', help='Expeditor name.')
def response_gen(beacon, msg, expeditor):
    beacon_json = json.loads(beacon)
    epkA = PublicKey(beacon_json['epkA'], encoder=nacl.encoding.HexEncoder)

    date = datetime.now()

    skB = PrivateKey.generate()
    epkB = skB.public_key

    msg_json = b'{"from":"' + expeditor.encode() + b'","note":"' + msg.encode() + b'","at":' + date.strftime("%m/%d/%Y-%H:%M:%S").encode() + b'}'

    nonce = nacl.utils.random(Box.NONCE_SIZE)

    msg_box = Box(skB, epkA)
    encrypted = msg_box.encrypt(msg_json, nonce)

    response_json = '{"epkB":"'+ epkB.encode().hex() +'","nonce":"'+ nonce.hex() +'","ciphertext":"'+ encrypted.hex() +'"}'
    
    os.mkdir('files/messages/' + date.strftime("%m%d%Y-%H%M%S"))

    with open(f"files/messages/{date.strftime("%m%d%Y-%H%M%S")}/response.json", 'w') as f:
        f.write(response_json)

    img = qrcode.make(response_json)
    img.save(f"files/messages/{date.strftime("%m%d%Y-%H%M%S")}/response.png")

if __name__ == '__main__':
    response_gen()
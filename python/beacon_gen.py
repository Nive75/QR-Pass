from nacl.public import PrivateKey # type: ignore
import qrcode # type: ignore

skA = PrivateKey.generate()

with open('files/beacon/beacon.key', 'wb') as f:
    f.write(skA.encode())

json = '{"epkA":"' + skA.public_key.encode().hex() + '"}'

img = qrcode.make(json)
img.save("files/beacon/beacon.png")

with open('files/beacon/beacon.json', 'w') as f:
    f.write(json)
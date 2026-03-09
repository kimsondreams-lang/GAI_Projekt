import PIL
from PIL import features
try:
    version = PIL.__version__
    webp = features.check('webp')
    print(f'PILLOW_VERSION:{version}')
    print(f'WEBP_SUPPORTED:{webp}')
except Exception as e:
    print(f'ERROR:{str(e)}')

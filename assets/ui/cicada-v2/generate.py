"""Create deterministic, code-native SVG texture layers; no source image processing."""
from pathlib import Path
import random
out=Path(__file__).parent
# stitchTiles makes the noise periodic in both axes; RGB is constant, alpha is textured.
(out/'item-grain-v2.svg').write_text('''<svg xmlns="http://www.w3.org/2000/svg" width="251" height="251" viewBox="0 0 251 251">
<defs><filter id="grain" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
<feTurbulence type="fractalNoise" baseFrequency=".61 .57" numOctaves="3" seed="37" stitchTiles="stitch"/>
<feColorMatrix type="matrix" values="0 0 0 0 .76 0 0 0 0 .69 0 0 0 0 .52 .42 0 0 0 -.13"/>
</filter></defs><rect width="251" height="251" filter="url(#grain)" opacity=".28"/>
</svg>''')
(out/'item-patina-v2.svg').write_text('''<svg xmlns="http://www.w3.org/2000/svg" width="263" height="263" viewBox="0 0 263 263">
<defs><filter id="patina" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
<feTurbulence type="fractalNoise" baseFrequency=".022 .035" numOctaves="3" seed="53" stitchTiles="stitch"/>
<feColorMatrix type="matrix" values="0 0 0 0 .045 0 0 0 0 .036 0 0 0 0 .022 .7 0 0 0 -.17"/>
</filter></defs><rect width="263" height="263" filter="url(#patina)" opacity=".45"/>
</svg>''')
rng=random.Random(293)
paths=[]
for i in range(34):
 x,y=rng.uniform(0,293),rng.uniform(0,293)
 dx,dy=rng.uniform(3,17),rng.uniform(-8,9)
 bend=rng.uniform(-2,2)
 paths.append(f'<path d="M{x:.2f} {y:.2f}q{dx/2:.2f} {dy/2+bend:.2f} {dx:.2f} {dy:.2f}" opacity="{rng.uniform(.045,.13):.3f}"/>')
# Nine copies wrap every stroke crossing an edge, including corners.
copies=''.join(f'<use href="#marks" x="{x}" y="{y}"/>' for x in [-293,0,293] for y in [-293,0,293])
(out/'item-scuffs-v2.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" width="293" height="293" viewBox="0 0 293 293" overflow="hidden"><defs><g id="marks" fill="none" stroke="#c0a372" stroke-width=".65" stroke-linecap="round">'+''.join(paths)+'</g></defs>'+copies+'</svg>')
print('Generated 3 seamless SVG layers.')

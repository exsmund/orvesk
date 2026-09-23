export const resourceVertex = `
varying vec2 vUv;
void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}
`;
export const resourceFragment = `
varying vec2 vUv;
uniform float uTime;
uniform float uWidth;
uniform float uFill;
uniform float uTrail;
uniform float uKind;
uniform float uSmoke;
uniform float uFlame;
uniform float uHeight;
uniform float uCompact;
float hash(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
float fbm(vec2 p){float n=0.,a=.5;for(int i=0;i<4;i++){n+=noise(p)*a;p=mat2(1.6,1.2,-1.2,1.6)*p+7.1;a*=.5;}return n;}
// Straight sides with four small bevels keep the silhouette angular.
float beveledBar(vec2 p,float width){vec2 q=abs(p-vec2(width*.5,0.))-vec2(width*.5,12.);return max(max(q.x,q.y),(q.x+q.y+4.)*.7071);}
void main(){
 vec2 px=vec2(vUv.x*uWidth,(vUv.y-.5)*uHeight);
 float width=uWidth;
 vec2 p=vec2(px.x*.035,px.y*.055);
 vec2 drift=vec2(uTime*.24,-uTime*.12);
 vec2 warp=vec2(fbm(p+drift),fbm(p+vec2(8.3,2.7)-drift));
 float clouds=fbm(p+warp*3.7-vec2(uTime*.5,0.));
 float veins=pow(1.-abs(sin(noise(p+warp*1.5-drift)*14.)),4.);
 float fine=pow(1.-abs(sin(fbm(p*3.+warp*2.)*20.)),8.);
 float end=width*uFill;
 float fullness=smoothstep(0.,24.,end);
 float energy=1.-smoothstep(end-8.,end+3.,px.x+(clouds-.5)*9.);
 energy*=step(.0001,uFill);
 // Match the main compact canvas scaling: 24 * 12 / 64 = 4.5 CSS px.
 float trackScale=(uSmoke>.5||uFlame>.5)&&uCompact>.5?64./12.:1.;
 float shape=beveledBar(vec2(px.x,px.y*trackScale),width);
 float outline=1.-smoothstep(-.6,.6,shape);
 float glow=exp(-max(shape,0.)*.8)*.045*energy;
 float core=pow(max(0.,1.-abs(px.y)/17.),.6);
 vec3 red=vec3(.56,.15,.055),gold=vec3(.56,.41,.19);
 vec3 color=mix(red,gold,uKind);
 vec3 hot=mix(vec3(.76,.32,.15),vec3(.76,.62,.36),uKind);
 float current=energy*fullness;
 float lingering=step(px.x,width*uTrail)*(1.-energy)*.20;
 float embers=(fine*.17+veins*.08+.014)*outline;
 float body=(.22+clouds*.30+veins*.75+fine*.16)*core;
 vec3 track=mix(vec3(.14,.035,.018),vec3(.15,.105,.04),uKind);
 vec3 rgb=track*outline+color*(embers+(body*current+lingering)*outline);
 rgb+=hot*pow(veins,2.)*core*current*outline*.25;
 rgb+=color*glow*(.3+veins*.5);
 float alpha=clamp(outline*.93+glow,0.,1.);
 if(uSmoke>.5){
  // Advected, layered density instead of bright contour lines. The plume
  // extends beyond the 24px track, fading out inside the 64px canvas.
  vec2 smokeP=px*.10;
  // Rotating local eddies warp the density field without stretching it.
  for(int i=0;i<4;i++){
   float fi=float(i);
   vec2 center=vec2((fi+.5)*width/4.,sin(fi*2.4+uTime*.35)*5.);
   vec2 d=(px-center)*.10;
   float angle=1.8*exp(-dot(d,d)*.22)*sin(uTime*.55+fi*1.7);
   mat2 spin=mat2(cos(angle),-sin(angle),sin(angle),cos(angle));
   smokeP+=(spin*d-d);
  }
  vec2 flow=vec2(fbm(smokeP+vec2(uTime*.16,0.)),fbm(smokeP+vec2(9.,-uTime*.24)));
  float large=fbm(smokeP+flow*2.2-vec2(uTime*.22,uTime*.18));
  float detail=fbm(smokeP*2.+flow*2.+vec2(-uTime*.17,uTime*.12));
  float billow=noise(vec2(px.x*.07-uTime*.22,uTime*.1));
  // Smoke extent in CSS pixels: 7px compact, 34px regular.
  float smokeHalfHeight=uCompact>.5?3.5:17.;
  float reach=smokeHalfHeight*mix(.65,.85,billow);
  float envelope=1.-smoothstep(reach*.5,smokeHalfHeight,abs(px.y)+(large-.5)*smokeHalfHeight*.25);
  envelope*=1.-smoothstep(smokeHalfHeight*.8,smokeHalfHeight,abs(px.y));
  float cutoff=(1.-smoothstep(end-4.,end+12.,px.x+(large-.5)*10.))*step(.0001,uFill);
  float sideFade=smoothstep(0.,8.,px.x)*(1.-smoothstep(width-8.,width,px.x));
  float density=smoothstep(.20,.70,large*.75+detail*.25)*envelope*cutoff*fullness*sideFade;
  float wisps=smoothstep(.30,.65,detail)*envelope*cutoff*.25*sideFade;
  float smokeAlpha=clamp(density*1.5+wisps,0.,.9);
  vec3 smokeColor=mix(color*.42,hot*.92,smoothstep(.25,.72,large));
  smokeColor*=mix(vec3(1.18,.92,.94),vec3(1.),uKind);
  vec3 base=track+color*(fine*.035+lingering);
  float baseAlpha=outline*.93;
  alpha=smokeAlpha+baseAlpha*(1.-smokeAlpha);
  rgb=(smokeColor*smokeAlpha+base*baseAlpha*(1.-smokeAlpha))/max(alpha,.001);
 }
 if(uFlame>.5){
  // Opaque tapered tongues define the silhouette; alpha is only edge antialiasing.
  float halfTrack=12./trackScale;
  float spacing=uCompact>.5?11.:26.;
  float cell=floor(px.x/spacing);
  float flameShape=halfTrack-abs(px.y);
  float rise=max(0.,px.y-halfTrack*.35);
  for(int i=-1;i<=1;i++){
   float id=cell+float(i);
   float seed=hash(vec2(id,3.));
   float height=(uCompact>.5?7.:17.)*(.65+.35*sin(uTime*2.4+seed*18.));
   float y=rise/height;
   float sway=sin(uTime*3.+seed*12.+y*3.)*spacing*.18*y;
   float center=(id+.5)*spacing+sway;
   float radius=spacing*.43*pow(max(0.,1.-y),1.4);
   float tongue=min(min(radius-abs(px.x-center),height-rise),px.y+halfTrack);
   flameShape=max(flameShape,tongue);
  }
  float boundary=min(px.x,end-px.x);
  float flameAlpha=smoothstep(-.45,.45,min(flameShape,boundary))*step(.0001,uFill);
  float heat=fbm(vec2(px.x*.15,px.y*.22-uTime*2.));
  float hotCore=(1.-smoothstep(0.,halfTrack+5.,abs(px.y)))*(.45+heat*.55);
  vec3 flameColor=mix(color*.65,hot*1.18,clamp(hotCore+heat*.3,0.,1.));
  float baseAlpha=outline*.93;
  alpha=flameAlpha+baseAlpha*(1.-flameAlpha);
  rgb=(flameColor*flameAlpha+track*baseAlpha*(1.-flameAlpha))/max(alpha,.001);
 }
 gl_FragColor=vec4(rgb,alpha);
}
`;

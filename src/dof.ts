/**
 * Letvægts Depth of Field (dybdeskarphed) med hardware DepthTexture.
 * Holder ænderne skarpt i fokus og slører forgrund og baggrund (hæk, træer, horisont)
 * blødt og proportionalt med afstanden fra fokusplanet — uden at skarpe ænder flyder ud i baggrunden.
 */
import * as THREE from 'three';

export interface DepthOfFieldPass {
  render(scene: THREE.Scene, camera: THREE.PerspectiveCamera, focusDistance: number): void;
  setSize(width: number, height: number, pixelRatio: number): void;
  dispose(): void;
}

export function createDepthOfField(renderer: THREE.WebGLRenderer): DepthOfFieldPass {
  const depthTexture = new THREE.DepthTexture(1, 1);
  depthTexture.type = THREE.UnsignedIntType;
  depthTexture.minFilter = THREE.NearestFilter;
  depthTexture.magFilter = THREE.NearestFilter;

  const isWebGL2 = Boolean((renderer as unknown as { capabilities?: { isWebGL2?: boolean } })?.capabilities?.isWebGL2);
  const target = new THREE.WebGLRenderTarget(1, 1, {
    type: THREE.HalfFloatType,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: true,
    stencilBuffer: false,
    samples: isWebGL2 ? 4 : 0,
  });
  target.depthTexture = depthTexture;

  const uniforms = {
    tColor: { value: target.texture },
    tDepth: { value: depthTexture },
    uNear: { value: 0.1 },
    uFar: { value: 150.0 },
    uFocusDistance: { value: 4.0 },
    uFocalRange: { value: 2.35 },
    uMaxBlur: { value: 0.0020 },
    uAspect: { value: 1.0 },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    toneMapped: true,
    depthTest: false,
    depthWrite: false,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      #include <packing>
      uniform sampler2D tColor;
      uniform sampler2D tDepth;
      uniform float uNear;
      uniform float uFar;
      uniform float uFocusDistance;
      uniform float uFocalRange;
      uniform float uMaxBlur;
      uniform float uAspect;
      varying vec2 vUv;

      // Konverterer lineære HDR-farver til display-farver (tone mapped & output colorspace)
      // før sløring, så sløring bevarer de sande farver og lysstyrke 100% uændret uden farve- eller kontrastskift.
      vec3 toDisplay(vec3 linearColor) {
        #if defined( TONE_MAPPING )
          linearColor = toneMapping(linearColor);
        #endif
        return linearToOutputTexel(vec4(linearColor, 1.0)).rgb;
      }

      float getLinearDistance(vec2 coord) {
        float fragCoordZ = texture2D(tDepth, coord).x;
        float viewZ = perspectiveDepthToViewZ(fragCoordZ, uNear, uFar);
        return -viewZ;
      }

      float getCoc(float dist) {
        // Baggrund bag fokusområdet: blød, diskret dybdeskarphed der bevarer landemærker og konturer
        float bgDiff = max(0.0, dist - (uFocusDistance + uFocalRange));
        float bgCoc = clamp(bgDiff / 18.0, 0.0, 0.65);

        // Forgrund tæt på kameraet foran ænderne: kun en let, diskret blødgøring
        float fgDiff = max(0.0, (uFocusDistance - uFocalRange * 0.85) - dist);
        float fgCoc = clamp(fgDiff / 3.5, 0.0, 0.35);

        return max(bgCoc, fgCoc);
      }

      void main() {
        vec4 centerCol = texture2D(tColor, vUv);
        float centerDist = getLinearDistance(vUv);
        float centerCoc = getCoc(centerDist);

        vec3 centerDisplay = toDisplay(centerCol.rgb);

        // Nær fokusområdet er billedet helt skarpt
        if (centerCoc < 0.005) {
          gl_FragColor = vec4(centerDisplay, centerCol.a);
          return;
        }

        vec3 accum = centerDisplay;
        float totalWeight = 1.0;
        float radius = centerCoc * uMaxBlur;

        // 12-punkts Vogel/gylden-vinkel bokeh-disk
        for (int i = 0; i < 12; i++) {
          float fi = float(i) + 1.0;
          float r = sqrt(fi / 12.5) * radius;
          float theta = fi * 2.3999632;
          vec2 offset = vec2(cos(theta) / uAspect, sin(theta)) * r;
          vec2 sampleUv = clamp(vUv + offset, 0.001, 0.999);

          float sampleDist = getLinearDistance(sampleUv);
          float sampleCoc = getCoc(sampleDist);

          // Vægtning der forhindrer skarpe forgrunds-konturer i at bløde hårdt bagud
          float weight = (sampleDist < centerDist - 0.30 && sampleCoc < centerCoc)
            ? max(0.12, sampleCoc)
            : 1.0;

          vec3 sampleDisplay = toDisplay(texture2D(tColor, sampleUv).rgb);
          accum += sampleDisplay * weight;
          totalWeight += weight;
        }

        gl_FragColor = vec4(accum / totalWeight, centerCol.a);
      }
    `,
  });

  const quadScene = new THREE.Scene();
  const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  quad.frustumCulled = false;
  quadScene.add(quad);

  return {
    setSize(width: number, height: number, pixelRatio: number) {
      const w = Math.max(1, Math.floor(width * pixelRatio));
      const h = Math.max(1, Math.floor(height * pixelRatio));
      target.setSize(w, h);
      uniforms.uAspect.value = width / Math.max(1, height);
    },
    render(scene: THREE.Scene, camera: THREE.PerspectiveCamera, focusDistance: number) {
      uniforms.uNear.value = camera.near;
      uniforms.uFar.value = camera.far;
      uniforms.uFocusDistance.value = focusDistance;

      const prevTarget = renderer.getRenderTarget();
      renderer.setRenderTarget(target);
      renderer.render(scene, camera);
      renderer.setRenderTarget(prevTarget);
      renderer.render(quadScene, quadCam);
    },
    dispose() {
      target.dispose();
      depthTexture.dispose();
      material.dispose();
      quad.geometry.dispose();
    },
  };
}

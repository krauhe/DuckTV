import * as THREE from 'three';

/** Art-directed atmospheric gradient with stereotypical high-contrast storm clouds; sunlight direction matches the garden. */
export function createSky(scene: THREE.Scene) {
  const uniforms = {
    horizon: { value: new THREE.Color('#9edaf0') },
    zenith: { value: new THREE.Color('#4c99da') },
    warmth: { value: 0 },
    cloudCover: { value: 0 },
    rain: { value: 0 },
    daylight: { value: 1 },
    time: { value: 0 },
    sunDirection: { value: new THREE.Vector3(-8, 0, 4).normalize() },
  };

  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
    toneMapped: true,
    uniforms,
    vertexShader: `varying vec3 direction;
      void main(){
        direction = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 horizon, zenith, sunDirection;
      uniform float warmth, cloudCover, rain, daylight, time;
      varying vec3 direction;

      // Fast procedural cloud billows for sculptural, stylized storm skies (mobile-optimized)
      float cloudNoise(vec2 p) {
        vec2 q = p;
        float n = 0.65 * sin(q.x * 2.1 + cos(q.y * 1.7)) * cos(q.y * 1.9);
        q = q * 2.2 + vec2(1.5, 2.7);
        n += 0.35 * sin(q.x * 3.4 + sin(q.y * 2.6)) * cos(q.y * 2.9);
        return n;
      }

      void main() {
        vec3 ray = normalize(direction);
        float elevation = max(0.0, ray.y);
        vec3 sky = mix(horizon, zenith, smoothstep(0.0, 0.85, pow(elevation, 0.65)));

        // Sunset/sunrise warmth glow (fades out in full darkness)
        float facing = pow(max(0.0, dot(normalize(vec3(ray.x, 0.001, ray.z)), sunDirection)), 3.0);
        float glow = warmth * (0.45 + 0.55 * facing) * daylight;
        vec3 warm = mix(vec3(0.78, 0.13, 0.09), vec3(1.0, 0.49, 0.25), smoothstep(0.0, 0.22, elevation));
        sky = mix(sky, warm, glow * exp(-elevation * 3.5));

        // Stereotypical dramatic storm & rain clouds with bold contrast between clouds
        if (cloudCover > 0.03) {
          // Perspective projection onto cloud dome
          vec2 cloudPlane = ray.xz / (elevation + 0.26);
          // Slow atmospheric drift
          vec2 uv1 = cloudPlane * 0.38 + vec2(time * 0.009, time * 0.005);

          // Domain warp creates dramatic billowing cumulus & thunderhead formations
          vec2 warp = vec2(
            sin(uv1.x * 2.1 + uv1.y * 1.6 + time * 0.006),
            cos(uv1.x * 1.5 - uv1.y * 2.3 + time * 0.008)
          ) * 0.42;

          float clouds = cloudNoise(uv1 + warp);

          // Distinct cloud separation with clear light gaps/sky breaks
          float coverage = mix(0.52, -0.40, pow(cloudCover, 0.82));
          float density = smoothstep(coverage - 0.26, coverage + 0.34, clouds);

          // Sharp, stereotypic rim light ("silver lining") on cloud crests (only visible in daylight)
          float rim = smoothstep(coverage - 0.08, coverage + 0.14, clouds)
                    - smoothstep(coverage + 0.18, coverage + 0.48, clouds);
          rim = max(0.0, rim) * daylight;

          // Day palette
          vec3 stormBellyDay = mix(vec3(0.19, 0.23, 0.29), vec3(0.13, 0.16, 0.22), rain);
          vec3 stormMidDay = mix(vec3(0.42, 0.49, 0.58), vec3(0.30, 0.36, 0.44), rain);
          vec3 silverLining = mix(vec3(0.92, 0.96, 1.0), vec3(0.78, 0.85, 0.94), rain) * daylight;

          // Night palette: dark nocturnal navy/charcoal that blends harmoniously into the night sky
          vec3 nightBelly = mix(vec3(0.015, 0.022, 0.035), vec3(0.010, 0.015, 0.022), rain);
          vec3 nightMid = mix(vec3(0.035, 0.048, 0.072), vec3(0.022, 0.032, 0.048), rain);

          vec3 stormBelly = mix(nightBelly, stormBellyDay, daylight);
          vec3 stormMid = mix(nightMid, stormMidDay, daylight);

          // Contrast curve: dark undersides transition into sculpted midtones
          float crest = smoothstep(coverage + 0.08, coverage + 0.62, clouds);
          vec3 cloudTone = mix(stormBelly, stormMid, crest);

          // Add punchy silver rim illumination (only in daylight)
          cloudTone += silverLining * (rim * (0.50 + 0.35 * (1.0 - rain * 0.25)));

          // Soften near the immediate horizon to blend with garden mist
          float horizonFade = smoothstep(0.015, 0.20, elevation);
          density *= horizonFade;

          // Composite sculpted clouds over background sky
          float cloudAlpha = density * smoothstep(0.04, 0.28, cloudCover);
          sky = mix(sky, cloudTone, cloudAlpha);

          // Atmospheric rain curtains on horizon
          if (rain > 0.03) {
            float rainCurtain = sin(ray.x * 24.0 + sin(ray.z * 16.0) * 1.4) * 0.5 + 0.5;
            rainCurtain = pow(rainCurtain, 3.0) * (1.0 - elevation * 3.2);
            rainCurtain = max(0.0, rainCurtain) * rain * 0.22;
            vec3 curtainColor = mix(vec3(0.03, 0.045, 0.06), vec3(0.30, 0.36, 0.42), daylight);
            sky = mix(sky, curtainColor, clamp(rainCurtain, 0.0, 0.55));
          }
        }

        gl_FragColor = vec4(sky, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });

  const mesh = new THREE.Mesh(new THREE.SphereGeometry(110, 32, 16), material);
  mesh.name = 'atmospheric-sky';
  mesh.frustumCulled = false;
  mesh.renderOrder = -10;
  mesh.onBeforeRender = (_renderer, _scene, camera) => {
    mesh.position.copy(camera.position);
    mesh.updateMatrixWorld();
  };
  scene.add(mesh);

  const horizon = new THREE.Color(), zenith = new THREE.Color();
  let targetWarmth = 0, targetCloud = 0, targetRain = 0, targetLight = 1;

  return {
    set(light: number, cloud: number, sun: THREE.Vector3, rain = 0) {
      targetLight = THREE.MathUtils.clamp(light, 0, 1);
      targetCloud = cloud;
      targetRain = THREE.MathUtils.clamp(rain, 0, 1);
      targetWarmth = Math.pow(Math.max(0, Math.sin(Math.PI * light)), 0.7) * (1 - cloud * 0.85);

      // Deep atmospheric slate overcast instead of flat washed-out milky gray
      const overcastHorizonDay = new THREE.Color('#586775').lerp(new THREE.Color('#465462'), targetRain);
      const overcastHorizonNight = new THREE.Color('#1c232a');
      const overcastZenithDay = new THREE.Color('#384653').lerp(new THREE.Color('#28333e'), targetRain);
      const overcastZenithNight = new THREE.Color('#0f151c');

      horizon.set('#9edaf0')
        .lerp(overcastHorizonDay, cloud)
        .lerp(new THREE.Color('#182c49').lerp(overcastHorizonNight, cloud), 1 - targetLight);
      horizon.lerp(new THREE.Color('#df8c91'), targetWarmth * 0.45);

      zenith.set('#4c99da')
        .lerp(overcastZenithDay, cloud)
        .lerp(new THREE.Color('#070e22').lerp(overcastZenithNight, cloud), 1 - targetLight);
      zenith.lerp(new THREE.Color('#676b9a'), targetWarmth * 0.3);

      uniforms.sunDirection.value.set(sun.x, 0, sun.z).normalize();
    },
    update(blend: number, time = 0) {
      uniforms.horizon.value.lerp(horizon, blend);
      uniforms.zenith.value.lerp(zenith, blend);
      uniforms.warmth.value = THREE.MathUtils.lerp(uniforms.warmth.value, targetWarmth, blend);
      uniforms.cloudCover.value = THREE.MathUtils.lerp(uniforms.cloudCover.value, targetCloud, blend);
      uniforms.rain.value = THREE.MathUtils.lerp(uniforms.rain.value, targetRain, blend);
      uniforms.daylight.value = THREE.MathUtils.lerp(uniforms.daylight.value, targetLight, blend);
      uniforms.time.value = time;
    },
  };
}

export const firefliesVertexShader = `
attribute vec3 aPosition;

uniform mat4 uProjection;
uniform mat4 uModelView;

varying float vDistance;

void main() {
    vec4 worldPos = uModelView * vec4(aPosition, 1.0);
    gl_Position = uProjection * worldPos;
    gl_PointSize = 20.0;
    vDistance = length(worldPos.xyz);
}
`;

export const firefliesFragmentShader = `
precision mediump float;

uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
varying float vDistance;

void main() {
    float dist = distance(gl_PointCoord, vec2(0.5));
    float alpha = smoothstep(0.5, 0.0, dist);
    
    vec3 fireflyColor = vec3(1.0, 1.0, 0.5); // yellow

    float fogFactor = clamp((uFogFar - vDistance) / (uFogFar - uFogNear), 0.0, 1.0);
    vec3 finalColor = mix(uFogColor, fireflyColor, fogFactor);
    gl_FragColor = vec4(finalColor, alpha * fogFactor);
}
`;
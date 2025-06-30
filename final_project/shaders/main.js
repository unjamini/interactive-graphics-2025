
export const groundVertexShader = `
attribute vec3 aPosition;
attribute vec2 aTexCoord;
uniform mat4 uProjection;
uniform mat4 uModelView;
varying vec2 vTexCoord;
varying float vDistance;

void main() {
    vec4 worldPos = uModelView * vec4(aPosition, 1.0);
    gl_Position = uProjection * worldPos;
    vTexCoord = aTexCoord;
    vDistance = length(worldPos.xyz);
}
`;

export const groundFragmentShader = `
precision mediump float;
uniform sampler2D uTexture;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
varying vec2 vTexCoord;
varying float vDistance;

void main() {
    vec4 textureColor = texture2D(uTexture, vTexCoord);
    float fogFactor = clamp((uFogFar - vDistance) / (uFogFar - uFogNear), 0.0, 1.0);
    vec3 finalColor = mix(uFogColor, textureColor.rgb, fogFactor);
    gl_FragColor = vec4(finalColor, textureColor.a);
}
`;

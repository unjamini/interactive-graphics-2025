export const treeVertexShader = `
attribute vec3 vertexPosition;
attribute vec2 textureCoordinate;
attribute vec3 vertexNormal;

uniform mat4 viewProjectionMatrix;
uniform mat4 modelViewMatrix;
uniform mat3 normalMatrix;

varying vec2 vTextureCoord;
varying vec3 vNormal;
varying vec3 vWorldPosition;
varying float vDistance;

void main() {
    vec4 worldPos = modelViewMatrix * vec4(vertexPosition, 1.0);
    vWorldPosition = worldPos.xyz;
    vNormal = normalize(normalMatrix * vertexNormal);
    vTextureCoord = textureCoordinate;
    vDistance = length(worldPos.xyz); // camera distance
    gl_Position = viewProjectionMatrix * worldPos;
}
`;

export const treeFragmentShader = `
precision mediump float;

varying vec2 vTextureCoord;
varying vec3 vNormal;
varying vec3 vWorldPosition;
varying float vDistance;

uniform vec3 materialColor;

// Firefly lighting
uniform vec3 fireflyPositions[100];
uniform int numFireflies;
uniform vec3 fireflyColor;
uniform float fireflyRange;

// Fog uniforms
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;

void main() {
    vec3 normal = normalize(vNormal);
    vec3 finalColor = materialColor;
    
    // fireflies lights
    for (int i = 0; i < 100; i++) {
        if (i >= numFireflies) break;
        
        vec3 lightPos = fireflyPositions[i];
        vec3 lightDir = lightPos - vWorldPosition;
        float distance = length(lightDir);
        
        // firefly light is limited
        if (distance < fireflyRange) {
            lightDir = normalize(lightDir);
    
            float attenuation = 1.0 / (1.0 + distance * distance * 0.1);
            attenuation = max(attenuation, 0.0);
            
            // Blinn model
            float diffuse = max(dot(normal, lightDir), 0.0);
            float specular = pow(max(dot(normal, normalize(lightDir + vWorldPosition)), 0.0), 0.0);
            
            // Add firefly contribution with stronger effect
            vec3 kd = vec3(1.0, 1.0, 1.0);
            vec3 ks = vec3(1.0, 1.0, 1.0);
            vec3 fireflyContribution = materialColor * fireflyColor * (kd * diffuse + ks * specular) * attenuation;
            finalColor += fireflyContribution;
            
            // Add some rim lighting for more dramatic effect
            float rimFactor = 1.0 - diffuse;
            finalColor += fireflyColor * 0.3 * rimFactor * attenuation;
        }
    }
    
    // fog
    float fogFactor = clamp((uFogFar - vDistance) / (uFogFar - uFogNear), 0.0, 1.0);
    finalColor = mix(uFogColor, finalColor, fogFactor);
    
    gl_FragColor = vec4(finalColor, 1.0);
}
`;

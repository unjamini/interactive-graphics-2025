import { ObjMesh } from './obj.js';

// done
export function loadTexture(gl, url) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    const image = new Image();
    image.onload = function() {
        // we have blending -> using RGBA
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.generateMipmap(gl.TEXTURE_2D);
    };
    image.src = url;

    return texture;
}

export function loadTreeData() {
    const tree = new ObjMesh();
    let treeMaterials = {};

    return fetch('objects/model.obj')
        .then(response => response.text())
        .then(async data => {
            tree.parse(data);
            await tree.loadMTL('objects/materials.mtl');
            const materials = tree.getMaterials();
            console.log('materials keys:', Object.keys(materials));

            // Load textures from materials
            for (const materialName in materials) {
                const material = materials[materialName];
                
                treeMaterials[materialName] = {
                    color: material.Kd
                };
                
                console.log(`material ${materialName} color:`, material.Kd);
            }
        
            const { positionBuffer, normalBuffer, texCoordBuffer, indexBuffer } = tree.getVertexBuffers();
        
            return {
                positionBuffer: positionBuffer,
                normalBuffer: normalBuffer, 
                texCoordBuffer: texCoordBuffer,
                indexBuffer: indexBuffer,
                materials: treeMaterials
            };
        });
}

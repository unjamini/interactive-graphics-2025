// This function takes the projection matrix, the translation, and two rotation angles (in radians) as input arguments.
// The two rotations are applied around x and y axes.
// It returns the combined 4x4 transformation matrix as an array in column-major order.
// The given projection matrix is also a 4x4 matrix stored as an array in column-major order.
// You can use the MatrixMult function defined in project4.html to multiply two 4x4 matrices in the same format.
function GetModelViewProjection( projectionMatrix, translationX, translationY, translationZ, rotationX, rotationY )
{
    var rotX = [
        1, 0, 0, 0,
        0, Math.cos(rotationX), Math.sin(rotationX), 0,
        0, -Math.sin(rotationX), Math.cos(rotationX), 0,
        0, 0, 0, 1
    ];

    var rotY = [
        Math.cos(rotationY), 0, -Math.sin(rotationY), 0,
        0, 1, 0, 0,
        Math.sin(rotationY), 0, Math.cos(rotationY), 0,
        0, 0, 0, 1
    ];

    var trans = [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        translationX, translationY, translationZ, 1
    ];
    var mvp = MatrixMult( projectionMatrix, MatrixMult(trans, MatrixMult(rotY, rotX)));
    return mvp;
}

const vertexShaderSource = `
attribute vec3 vertexPosition;
attribute vec2 textureCoordinate;
uniform mat4 viewProjectionMatrix;
uniform bool swapYZ_;
varying vec2 frTextureCoordinate;

void main() {
    vec3 position = vertexPosition;
    if (swapYZ_) {
        position = vec3(position.x, position.z, position.y);
    }
    gl_Position = viewProjectionMatrix * vec4(position, 1.0);
    frTextureCoordinate = textureCoordinate;
}
`;

const fragmentShaderSource = `
precision mediump float;
varying vec2 frTextureCoordinate;
uniform sampler2D texture;
uniform bool showTexture_;

void main() {
    if (showTexture_) {
        gl_FragColor = texture2D(texture, frTextureCoordinate);
    } else {
        gl_FragColor = vec4(1.0, gl_FragCoord.z * gl_FragCoord.z, 0.7, 1.0);
    }
}
`;


class MeshDrawer {
    // The constructor is a good place for taking care of the necessary initializations.
    constructor() {
        this.verticesBuffer = gl.createBuffer();
        this.textureBuffer = gl.createBuffer();

        this.shaderProgram = InitShaderProgram(vertexShaderSource, fragmentShaderSource);
        this.numTriangles = 0;
        this.swapYZFlag = false;

        this.showTextureValue = true;
    }

    // This method is called every time the user opens an OBJ file.
    // The arguments of this function is an array of 3D vertex positions
    // and an array of 2D texture coordinates.
    // Every item in these arrays is a floating point value, representing one
    // coordinate of the vertex position or texture coordinate.
    // Every three consecutive elements in the vertPos array forms one vertex
    // position and every three consecutive vertex positions form a triangle.
    // Similarly, every two consecutive elements in the texCoords array
    // form the texture coordinate of a vertex.
    // Note that this method can be called multiple times.
    setMesh(vertPos, texCoords) {
        this.numTriangles = vertPos.length / 3;

        gl.bindBuffer(gl.ARRAY_BUFFER, this.verticesBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertPos), gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.textureBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);
    }

    // This method is called when the user changes the state of the
    // "Swap Y-Z Axes" checkbox. 
    // The argument is a boolean that indicates if the checkbox is checked.
    swapYZ(swap) {
        this.swapYZFlag = swap;
    }

    // This method is called to draw the triangular mesh.
    // The argument is the transformation matrix, the same matrix returned
    // by the GetModelViewProjection function above.
    draw(trans) {
        gl.useProgram(this.shaderProgram);
    
        // Set the transformation matrix
        const viewProjectionMatrix = gl.getUniformLocation(this.shaderProgram, "viewProjectionMatrix");
        gl.uniformMatrix4fv(viewProjectionMatrix, false, trans);
    
        // Set the swap Y-Z flag
        const swapYZ_ = gl.getUniformLocation(this.shaderProgram, "swapYZ_");
        gl.uniform1i(swapYZ_, this.swapYZFlag);
    
        // Bind vertex positions
        const vertexPosition = gl.getAttribLocation(this.shaderProgram, "vertexPosition");
        gl.bindBuffer(gl.ARRAY_BUFFER, this.verticesBuffer);
        gl.vertexAttribPointer(vertexPosition, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(vertexPosition);
    
        // Bind texture coordinates
        const textureCoordinate = gl.getAttribLocation(this.shaderProgram, "textureCoordinate");
        gl.bindBuffer(gl.ARRAY_BUFFER, this.textureBuffer);
        gl.vertexAttribPointer(textureCoordinate, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(textureCoordinate);
    
        // Draw the triangles
        gl.drawArrays(gl.TRIANGLES, 0, this.numTriangles);
    }

    // This method is called to set the texture of the mesh.
    // The argument is an HTML IMG element containing the texture data.
    setTexture(img) {
        this.texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
    
        // You can set the texture image data using the following command.
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
        gl.generateMipmap(gl.TEXTURE_2D);

        if (this.showTextureValue) {
            this.showTexture(true);
        }
    }

    // This method is called when the user changes the state of the
    // "Show Texture" checkbox.
    // The argument is a boolean that indicates if the checkbox is checked.
    showTexture(show) {
        const showTexture_ = gl.getUniformLocation(this.shaderProgram, "showTexture_");
        gl.useProgram(this.shaderProgram);
        gl.uniform1i(showTexture_, show);
        this.showTextureValue = showTexture_;
    }
}

// This function takes the translation and two rotation angles (in radians) as input arguments.
// The two rotations are applied around x and y axes.
// It returns the combined 4x4 transformation matrix as an array in column-major order.
// You can use the MatrixMult function defined in project5.html to multiply two 4x4 matrices in the same format.
function GetModelViewMatrix( translationX, translationY, translationZ, rotationX, rotationY )
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
    var mvp = MatrixMult(trans, MatrixMult(rotY, rotX));
    return mvp;

}

const vertexShaderSource = `
attribute vec3 vertexPosition;
attribute vec2 textureCoordinate;
attribute vec3 vertexNormal;

uniform bool swapYZ_;

uniform mat4 viewProjectionMatrix;
uniform mat4 modelViewMatrix;
uniform mat3 normalMatrix;

varying vec2 frTextureCoordinate;
varying vec3 frNormal;
varying vec3 frPosition;

void main() {
    vec4 pos = vec4(vertexPosition, 1.0);
    if (swapYZ_) {
        pos = vec4(pos.x, pos.z, pos.y, 1.0); // Swap Y and Z
    }
    vec4 position = modelViewMatrix * pos;
    frPosition = position.xyz;
    frNormal = normalize(normalMatrix * vertexNormal);
    frTextureCoordinate = textureCoordinate;
    gl_Position = viewProjectionMatrix * pos;
}
`;

const fragmentShaderSource = `
precision mediump float;

varying vec2 frTextureCoordinate; // Texture coordinates passed from the vertex shader
varying vec3 frNormal;            // Normal vector in camera space
varying vec3 frPosition;          // Vertex position in camera space

uniform sampler2D texture;        // Texture sampler
uniform bool showTexture;        // Flag to determine if the texture should be used
uniform vec3 lightDir;            // Direction of the light in camera space
uniform float shininess;          // Shininess parameter for the Blinn model

void main() {
    vec3 normal = normalize(frNormal);
    vec3 light = normalize(lightDir);
    vec3 view = normalize(-frPosition);

    float diffuse = max(dot(normal, light), 0.0);
    float specular = pow(max(dot(normal, normalize(light + view)), 0.0), shininess);

    // diffuse color coeff
    vec3 kd = showTexture ? texture2D(texture, frTextureCoordinate).rgb : vec3(1.0, 1.0, 1.0);
	// specular color coeff
	vec3 ks = vec3(1.0, 1.0, 1.0);

    vec3 finalColor = kd * diffuse + ks * specular;
    gl_FragColor = vec4(finalColor, 1.0);
}
`;

class MeshDrawer
{
	// The constructor is a good place for taking care of the necessary initializations.
	constructor()
	{
        this.verticesBuffer = gl.createBuffer();
        this.textureBuffer = gl.createBuffer();
		this.normalsBuffer = gl.createBuffer();

        this.shaderProgram = InitShaderProgram(vertexShaderSource, fragmentShaderSource);
        this.numTriangles = 0;
        this.swapYZFlag = false;

        this.showTextureValue = true;

		this.normals = null;
	}
	
	// This method is called every time the user opens an OBJ file.
	// The arguments of this function is an array of 3D vertex positions,
	// an array of 2D texture coordinates, and an array of vertex normals.
	// Every item in these arrays is a floating point value, representing one
	// coordinate of the vertex position or texture coordinate.
	// Every three consecutive elements in the vertPos array forms one vertex
	// position and every three consecutive vertex positions form a triangle.
	// Similarly, every two consecutive elements in the texCoords array
	// form the texture coordinate of a vertex and every three consecutive 
	// elements in the normals array form a vertex normal.
	// Note that this method can be called multiple times.
	setMesh(vertPos, texCoords, normals)
	{
		// [TO-DO] Update the contents of the vertex buffer objects.
		this.numTriangles = vertPos.length / 3;

        gl.bindBuffer(gl.ARRAY_BUFFER, this.verticesBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertPos), gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.textureBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.normalsBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
	}
	
	// This method is called when the user changes the state of the
	// "Swap Y-Z Axes" checkbox. 
	// The argument is a boolean that indicates if the checkbox is checked.
	swapYZ(swap) {
        this.swapYZFlag = swap;
    }
	
	// This method is called to draw the triangular mesh.
	// The arguments are the model-view-projection transformation matrixMVP,
	// the model-view transformation matrixMV, the same matrix returned
	// by the GetModelViewProjection function above, and the normal
	// transformation matrix, which is the inverse-transpose of matrixMV.
	draw(matrixMVP, matrixMV, matrixNormal)
	{
		gl.useProgram(this.shaderProgram);

		const viewProjectionMatrix = gl.getUniformLocation(this.shaderProgram, "viewProjectionMatrix");
        gl.uniformMatrix4fv(viewProjectionMatrix, false, matrixMVP);

		const modelViewMatrix = gl.getUniformLocation(this.shaderProgram, "modelViewMatrix");
		gl.uniformMatrix4fv(modelViewMatrix, false, matrixMV);

		const normalMatrix = gl.getUniformLocation(this.shaderProgram, "normalMatrix");
		gl.uniformMatrix3fv(normalMatrix, false, matrixNormal);

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
	
		// Bind vertex normals
		const vertexNormal = gl.getAttribLocation(this.shaderProgram, "vertexNormal");
		gl.bindBuffer(gl.ARRAY_BUFFER, this.normalsBuffer);
		gl.vertexAttribPointer(vertexNormal, 3, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(vertexNormal);


		gl.drawArrays( gl.TRIANGLES, 0, this.numTriangles );
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
		if (this.texture) {
			const showTexture_ = gl.getUniformLocation(this.shaderProgram, "showTexture");
			gl.useProgram(this.shaderProgram);
			gl.uniform1i(showTexture_, show);
		}

        this.showTextureValue = show;
    }
	
	// This method is called to set the incoming light direction
	setLightDir(x, y, z) {
		gl.useProgram(this.shaderProgram);
		const lightDir = gl.getUniformLocation(this.shaderProgram, "lightDir");
		gl.uniform3f(lightDir, x, y, z);
	}
	
	// This method is called to set the shininess of the material
	setShininess(shininess)
	{
		gl.useProgram(this.shaderProgram);
		const shininess_ = gl.getUniformLocation(this.shaderProgram, "shininess");
		gl.uniform1f(shininess_, shininess);
	}
}
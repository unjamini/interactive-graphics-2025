import { GetViewMatrix, GetPerspectiveMatrix, CreateTranslationMatrix, CreateScaleMatrix, MatrixMult } from './utils/view_utils.js';
import { loadTexture, loadTreeData } from './utils/texture_utils.js';
import { InitShaderProgram } from './utils/utils.js';

import { treeVertexShader, treeFragmentShader } from './shaders/tree.js';
import { firefliesVertexShader, firefliesFragmentShader } from './shaders/fireflies.js';
import { groundVertexShader, groundFragmentShader } from './shaders/main.js';

let NUM_FIREFLIES = 50;
const NUM_TREES = 50;
let FIREFLY_LIGHT_RADIUS = 1.0;

let treeBuffers = null;
let treeLoaded = false;
let trees = [];
let treeMaterials = {};
let fireflies = [];

// camera position
let cameraRotationY = 0; // up-down
let cameraRotationX = 0; // left-right
let isDragging = false;

// for moving camera on click
let lastMouseX = 0;
let lastMouseY = 0;

// init camera position - starting from the center
const cameraPosition = [0, 1., 0]; 

//fog
const fogColor = [0.05, 0.05, 0.1];
const fogNear = 5.;  // dist to fog from camera
const fogFar = 20.;  // full fog at this dist

const groundSize = 20.;

// ground coordinates (3d vertex pos and 2d texture coords)
const groundVertices = new Float32Array([
    -groundSize / 2, -1.0, -groundSize / 2,  0.0, 0.0,
     groundSize / 2, -1.0, -groundSize / 2,  groundSize / 2, 0.0,
     groundSize / 2, -1.0,  groundSize / 2,  groundSize / 2, groundSize / 2,
    -groundSize / 2, -1.0,  groundSize / 2,  0.0, groundSize / 2,
]);

const groundIndices = new Uint16Array([
    0, 1, 2,
    0, 2, 3,
]);


var canvas, gl;
var firefliesProgram, treeProgram, groundProgram;
var floorTexture;

var groundPositionBuffer, groundIndexBuffer, positionBuffer;
var aPosition;

// done
function InitWebGL() {
    // Initialize the WebGL canvas
	canvas = document.getElementById("canvas");
	canvas.oncontextmenu = function() {return false;};

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

	gl = canvas.getContext("webgl", {antialias: false, depth: true});
	if (!gl) {
		alert("Unable to initialize WebGL. Your browser or machine may not support it.");
		return;
	}

	gl.enable(gl.DEPTH_TEST);

    // blending (using it only for fireflies)
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); // src * alpha + background * (1 - alpha)
}

// done
function InitPrograms() {
    firefliesProgram = InitShaderProgram(gl, firefliesVertexShader, firefliesFragmentShader);
    treeProgram = InitShaderProgram(gl, treeVertexShader, treeFragmentShader);
    groundProgram = InitShaderProgram(gl, groundVertexShader, groundFragmentShader);
}

function LoadTreeDataToBuffers() {
    loadTreeData().then(({ materialBuffers, materials }) => {
        treeMaterials = materials;
        
        treeBuffers = {};
        
        for (const materialName in materialBuffers) {
            const bufferData = materialBuffers[materialName];
            
            const position = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, position);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(bufferData.positionBuffer), gl.STATIC_DRAW);
        
            const normal = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, normal);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(bufferData.normalBuffer), gl.STATIC_DRAW);
        
            const texCoord = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, texCoord);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(bufferData.texCoordBuffer), gl.STATIC_DRAW);
        
            const indices = gl.createBuffer();
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indices);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(bufferData.indexBuffer), gl.STATIC_DRAW);
        
            treeBuffers[materialName] = {
                position: position,
                normal: normal,
                texCoord: texCoord,
                indices: indices,
                indexCount: bufferData.indexBuffer.length,
            };
        }
    });
}

function LoadMaterialsAndCreateBuffers() {
    LoadTreeDataToBuffers();

    // ground
    floorTexture = loadTexture(gl, './objects/floor.png');
    groundPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, groundPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, groundVertices, gl.STATIC_DRAW);
    groundIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, groundIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, groundIndices, gl.STATIC_DRAW);

    // fireflies
    positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    aPosition = gl.getAttribLocation(firefliesProgram, "aPosition");
    gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(aPosition);
}

function GenerateTrees() {
    for (let i = 0; i < NUM_TREES; i++) {
        let randomX = (Math.random() - 0.5) * (groundSize - 1); // -1 not to put trees too close to the edge
        let randomZ = (Math.random() - 0.5) * (groundSize - 1);
            
        // making sure we don't cover the view
        const dx = randomX - cameraPosition[0];
        const dz = randomZ - cameraPosition[2];
        if (Math.sqrt(dx * dx + dz * dz) > 3) {
            trees.push({
                position: [randomX, 0.2, randomZ],
                scale: 0.5 + Math.random() * 0.8 // different sizes of trees
            });
        }
    }
    treeLoaded = true;
}

// done
function GenerateFireflies() {
    fireflies = Array.from({ length: NUM_FIREFLIES }, (_, __) => {
        const centerX = (Math.random() - 0.5) * (groundSize - 2);
        const centerZ = (Math.random() - 0.5) * (groundSize - 2);
        const centerY = Math.random() * 2 - 1;
        
        return {
            x: centerX,
            y: centerY,
            z: centerZ,
            centerX: centerX,
            centerY: centerY,
            centerZ: centerZ,
            radius: Math.random() * 2.5,  // movement radius
            angleXZ: Math.random() * Math.PI * 2, // speed direction
            angleY: Math.random() * Math.PI * 2,
            speedXZ: 0.0005 + Math.random() * 0.03, // horizontal speed
            speedY: 0.001 + Math.random() * 0.003,  // vertical speed is less (looks better this way)
            time: 0,
        };
    });
}


function UpdateFireflyCount(newCount) {
    NUM_FIREFLIES = newCount;
    GenerateFireflies();
    document.getElementById('firefly-count-value').textContent = newCount;
}

function UpdateLightRadius(newRadius) {
    FIREFLY_LIGHT_RADIUS = newRadius;
    document.getElementById('light-radius-value').textContent = newRadius.toFixed(1);
}

function AddEventListeners() {
    const fireflySlider = document.getElementById('firefly-count');
    
    fireflySlider.addEventListener('input', (e) => {
        const newCount = parseInt(e.target.value);
        UpdateFireflyCount(newCount);
    });

    const lightRadiusSlider = document.getElementById('light-radius');
    
    lightRadiusSlider.addEventListener('input', (e) => {
        const newRadius = parseFloat(e.target.value);
        UpdateLightRadius(newRadius);
    });

    // for moving camera on click
    canvas.addEventListener('mousedown', (e) => {
        isDragging = true;

        // storing current mouse coords
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
    });

    canvas.addEventListener('mouseup', () => {
        isDragging = false;
    });

    canvas.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        const deltaX = e.clientX - lastMouseX;
        const deltaY = e.clientY - lastMouseY;
        
        // new camera direction, added 0.008 so the camera wouldn't move too fast
        const rotSpeed = 0.008;
        cameraRotationX += deltaX * rotSpeed;  // moving left-right
        cameraRotationY = cameraRotationY - deltaY * rotSpeed;
        cameraRotationY = Math.max(-Math.PI/2 + 0.2, Math.min(Math.PI/2 - 0.2, cameraRotationY)); // limit up-down rotation
        
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
    });

    canvas.addEventListener('wheel', (e) => {
        // move camera forward/backward on wheel
        const moveSpeed = (e.deltaY > 0 ? -1 : 1) * 0.05;
        
        cameraPosition[0] += Math.sin(cameraRotationX) * moveSpeed;
        cameraPosition[2] += Math.cos(cameraRotationX) * moveSpeed;
    });
}

function setFogUniforms(program) {
    const uFogColor = gl.getUniformLocation(program, 'uFogColor');
    const uFogNear = gl.getUniformLocation(program, 'uFogNear');
    const uFogFar = gl.getUniformLocation(program, 'uFogFar');
    gl.uniform3fv(uFogColor, fogColor);
    gl.uniform1f(uFogNear, fogNear);
    gl.uniform1f(uFogFar, fogFar);
}

function drawScene() {
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.05, 0.05, 0.1, 1.0); // dark blue background
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // for projecting things to the camera
    const fieldOfView = Math.PI / 4; // 45 deg
    const nearPlane = 0.1;
    const farPlane = 100.0;
    const projection = GetPerspectiveMatrix(fieldOfView, nearPlane, farPlane);
    
    // camera direction
    const modelView = GetViewMatrix(cameraPosition, cameraRotationY, cameraRotationX);

    // ground
    gl.useProgram(groundProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, groundPositionBuffer);
    
    // [x, y, z, u, v]
    // position
    const groundPosition = gl.getAttribLocation(groundProgram, 'aPosition');
    gl.enableVertexAttribArray(groundPosition);
    gl.vertexAttribPointer(groundPosition, 3, gl.FLOAT, false, 5 * 4, 0); // stride = 5 floats * 4, offset = 0
    // texture
    const groundTexCoord = gl.getAttribLocation(groundProgram, 'aTexCoord');
    gl.enableVertexAttribArray(groundTexCoord);
    gl.vertexAttribPointer(groundTexCoord, 2, gl.FLOAT, false, 5 * 4, 3 * 4); // stride = 5 floats * 4, offset = 3 floats * 4
    
    // uniforms
    const uGroundProjection = gl.getUniformLocation(groundProgram, 'uProjection');
    const uGroundModelView = gl.getUniformLocation(groundProgram, 'uModelView');
    gl.uniformMatrix4fv(uGroundProjection, false, projection);
    gl.uniformMatrix4fv(uGroundModelView, false, modelView);
    
    // fog uniforms for ground
    setFogUniforms(groundProgram);
    
    // add floor texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, floorTexture);
    const uGroundTexture = gl.getUniformLocation(groundProgram, 'uTexture');
    gl.uniform1i(uGroundTexture, 0);
    
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, groundIndexBuffer);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

    // fireflies
    gl.useProgram(firefliesProgram);
    const positions = [];
    for (let firefly of fireflies) {
        // update movement
        firefly.time += 1/ 60;
        firefly.angleXZ += firefly.speedXZ;
        firefly.angleY += firefly.speedY;
        
        // horixontal movement
        firefly.x = firefly.centerX + Math.cos(firefly.angleXZ) * firefly.radius;
        firefly.z = firefly.centerZ + Math.sin(firefly.angleXZ) * firefly.radius;
        
        // vertical movement with some randomness
        firefly.y = firefly.centerY + Math.sin(firefly.angleY) * firefly.radius + Math.sin(firefly.time * 0.7);
        
        // let the center point drift differently
        firefly.centerX += Math.sin(firefly.time * 0.1) * 0.01;
        firefly.centerZ += Math.cos(firefly.time * 0.08) * 0.01;
        firefly.centerY += Math.sin(firefly.time * 0.05) * 0.01;
        
        // keep fireflies in bounds
        firefly.centerX = Math.max(-groundSize / 2 + 1, Math.min(groundSize / 2 - 1, firefly.centerX));
        firefly.centerZ = Math.max(-groundSize / 2 + 1, Math.min(groundSize / 2 - 1, firefly.centerZ));
        firefly.centerY = Math.max(-1, Math.min(2, firefly.centerY));

        positions.push(firefly.x, firefly.y, firefly.z);
    }

    // firefly drawing
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);
    
    const uProjection = gl.getUniformLocation(firefliesProgram, 'uProjection');
    const uModelView = gl.getUniformLocation(firefliesProgram, 'uModelView');
    gl.uniformMatrix4fv(uProjection, false, projection);
    gl.uniformMatrix4fv(uModelView, false, modelView);
    
    // fog uniforms for fireflies
    setFogUniforms(firefliesProgram);

    gl.drawArrays(gl.POINTS, 0, fireflies.length);

    // trees
    if (treeLoaded && treeBuffers && treeProgram && trees.length > 0) {
        gl.useProgram(treeProgram);
        
        const viewProjectionMatrix = gl.getUniformLocation(treeProgram, 'viewProjectionMatrix');
        gl.uniformMatrix4fv(viewProjectionMatrix, false, projection);

        // firefly lighting
        const fireflyColorUniform = gl.getUniformLocation(treeProgram, 'fireflyColor');
        gl.uniform3f(fireflyColorUniform, 1.0, 0.8, 0.4); // yellow
        const fireflyRangeUniform = gl.getUniformLocation(treeProgram, 'fireflyRange');
        gl.uniform1f(fireflyRangeUniform, FIREFLY_LIGHT_RADIUS);
        
        // firefly positions
        const fireflyPositionsUniform = gl.getUniformLocation(treeProgram, 'fireflyPositions');
        const numFirefliesUniform = gl.getUniformLocation(treeProgram, 'numFireflies');
        
        const maxFirefliesForShader = Math.min(fireflies.length, 100);
        const fireflyPositionsArray = new Float32Array(maxFirefliesForShader * 3); 
        for (let i = 0; i < maxFirefliesForShader; i++) {
            fireflyPositionsArray[i * 3] = fireflies[i].x;
            fireflyPositionsArray[i * 3 + 1] = fireflies[i].y;
            fireflyPositionsArray[i * 3 + 2] = fireflies[i].z;
        }
        
        gl.uniform3fv(fireflyPositionsUniform, fireflyPositionsArray);
        gl.uniform1i(numFirefliesUniform, maxFirefliesForShader);
        
        // fog for trees
        setFogUniforms(treeProgram);

        const vertexPosition = gl.getAttribLocation(treeProgram, 'vertexPosition');
        const vertexNormal = gl.getAttribLocation(treeProgram, 'vertexNormal');
        const textureCoordinate = gl.getAttribLocation(treeProgram, 'textureCoordinate');
        const materialColorUniform = gl.getUniformLocation(treeProgram, 'materialColor');
        const modelViewMatrix = gl.getUniformLocation(treeProgram, 'modelViewMatrix');
        const normalMatrixUniform = gl.getUniformLocation(treeProgram, 'normalMatrix');

        for (let tree of trees) {
            const translationMatrix = CreateTranslationMatrix(tree.position[0], tree.position[1], tree.position[2]);
            const scaleMatrix = CreateScaleMatrix(tree.scale, tree.scale, tree.scale);
            const modelMatrix = MatrixMult(translationMatrix, scaleMatrix);
            const treeModelView = MatrixMult(modelView, modelMatrix);

            const normalMatrix = [
                treeModelView[0], treeModelView[1], treeModelView[2],
                treeModelView[4], treeModelView[5], treeModelView[6],
                treeModelView[8], treeModelView[9], treeModelView[10]
            ];
            
            gl.uniformMatrix4fv(modelViewMatrix, false, treeModelView);
            gl.uniformMatrix3fv(normalMatrixUniform, false, normalMatrix);
            
            for (const materialName in treeBuffers) {
                const buffers = treeBuffers[materialName];
                const material = treeMaterials[materialName];
                gl.uniform3fv(materialColorUniform, material.color);

                gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
                gl.enableVertexAttribArray(vertexPosition);
                gl.vertexAttribPointer(vertexPosition, 3, gl.FLOAT, false, 0, 0);

                gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normal);
                gl.enableVertexAttribArray(vertexNormal);
                gl.vertexAttribPointer(vertexNormal, 3, gl.FLOAT, false, 0, 0);
                
                gl.bindBuffer(gl.ARRAY_BUFFER, buffers.texCoord);
                gl.enableVertexAttribArray(textureCoordinate);
                gl.vertexAttribPointer(textureCoordinate, 2, gl.FLOAT, false, 0, 0);
                
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);
                gl.drawElements(gl.TRIANGLES, buffers.indexCount, gl.UNSIGNED_SHORT, 0);
            }
        }
    }

    requestAnimationFrame(drawScene);
}

InitWebGL();
InitPrograms();
AddEventListeners();

LoadMaterialsAndCreateBuffers();
GenerateTrees();
GenerateFireflies();
drawScene();

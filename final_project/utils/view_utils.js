export function MatrixMult( A, B )
{
    var C = Array(16);
    for ( var i=0, m=0; i<4; ++i ) {
        for ( var j=0; j<4; ++j, ++m ) {
            var v = 0;
            for ( var k=0; k<4; ++k ) {
                v += A[j+4*k] * B[k+4*i];
            }
            C[m] = v;
        }
    }
    return C;
}

export function CreateTranslationMatrix(x, y, z) {
    return [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        x, y, z, 1
    ];
}

export function CreateScaleMatrix(sx, sy, sz) {
    return [
        sx, 0, 0, 0,
        0, sy, 0, 0,
        0, 0, sz, 0,
        0, 0, 0, 1
    ];
}


export function GetViewMatrix(cameraPos, cameraRotX, cameraRotY) {
    var rotX = [
        1, 0, 0, 0,
        0, Math.cos(-cameraRotX), Math.sin(-cameraRotX), 0,
        0, -Math.sin(-cameraRotX), Math.cos(-cameraRotX), 0,
        0, 0, 0, 1
    ];

    var rotY = [
        Math.cos(-cameraRotY), 0, -Math.sin(-cameraRotY), 0,
        0, 1, 0, 0,
        Math.sin(-cameraRotY), 0, Math.cos(-cameraRotY), 0,
        0, 0, 0, 1
    ];

    var trans = CreateTranslationMatrix(-cameraPos[0], -cameraPos[1], -cameraPos[2]);
    
    // rotate -> translate
    return MatrixMult(MatrixMult(rotX, rotY), trans);
}


export function GetPerspectiveMatrix(fieldOfView, nearPlane, farPlane) {
    const focalLength = 1.0 / Math.tan(fieldOfView / 2);
    const rangeInv = 1 / (nearPlane - farPlane);

    return [
        focalLength, 0, 0, 0,
        0, focalLength, 0, 0,
        0, 0, (nearPlane + farPlane) * rangeInv, -1,
        0, 0, nearPlane * farPlane * rangeInv * 2, 0
    ];
}
